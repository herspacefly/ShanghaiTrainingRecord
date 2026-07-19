import { audioTracks, getPoisForDay, poiById, poiData, routeData } from "../data/poi-data.js";
import { MarkerController } from "./map-markers.js";
import { RouteController } from "./route-anim.js";
import { ChartsController } from "./charts.js";

const dom = {
  app: document.getElementById("app"),
  mapStatus: document.getElementById("map-status"),
  daySelector: document.getElementById("day-selector"),
  panelToggle: document.getElementById("panel-toggle"),
  panelTitle: document.getElementById("panel-title"),
  panelScroll: document.querySelector(".panel-scroll"),
  timeline: document.getElementById("event-timeline"),
  metricStrip: document.getElementById("metric-strip"),
  playRoute: document.getElementById("play-route"),
  resetRoute: document.getElementById("reset-route"),
  routeDayLabel: document.getElementById("route-day-label"),
  routeState: document.getElementById("route-state"),
  routeProgress: document.getElementById("route-progress-bar"),
  routeCaption: document.getElementById("route-caption"),
  placeImage: document.getElementById("place-image"),
  placeImageCredit: document.getElementById("place-image-credit"),
  placeMeta: document.getElementById("place-meta"),
  placeName: document.getElementById("place-name"),
  placeSummary: document.getElementById("place-summary"),
  placeHighlight: document.getElementById("place-highlight"),
  placeDetails: document.getElementById("place-details"),
  placeLink: document.getElementById("place-link"),
  placeAudio: document.getElementById("place-audio"),
  placeSource: document.getElementById("place-source"),
  audioToggle: document.getElementById("audio-toggle"),
  audio: document.getElementById("ambient-audio"),
  toast: document.getElementById("toast")
};

const state = {
  day: "all",
  view: "overview",
  selectedPoi: poiData[0],
  panelCollapsed: false,
  audioStarted: false,
  currentTrack: null
};

let map;
let markers;
let routes;
let charts;
let toastTimer;

function createIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 3200);
}

function waitForGlobal(name, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const check = () => {
      if (window[name]) resolve(window[name]);
      else if (performance.now() - started > timeout) reject(new Error(`${name} load timeout`));
      else setTimeout(check, 120);
    };
    check();
  });
}

function renderMetrics() {
  const distance = routeData.reduce((sum, route) => sum + route.distance, 0);
  const segments = routeData.reduce((sum, route) => sum + route.segments.length, 0);
  dom.metricStrip.innerHTML = `
    <div><dt>地点</dt><dd>${poiData.length}</dd></div>
    <div><dt>记录路线</dt><dd>${segments}</dd></div>
    <div><dt>估算里程</dt><dd>${distance.toFixed(1)} km</dd></div>
  `;
}

function renderTimeline() {
  const pois = getPoisForDay(state.day);
  dom.timeline.innerHTML = pois.map((poi) => `
    <li>
      <button type="button" class="timeline-item" data-poi-id="${poi.id}" aria-label="在地图中查看${poi.name}">
        <span class="timeline-time">D${poi.day}<br>${poi.time}</span>
        <span class="timeline-copy">
          <h4>${poi.name}</h4>
          <p>${poi.type} · ${poi.duration}</p>
        </span>
      </button>
    </li>
  `).join("");
}

function renderPlace(poi) {
  state.selectedPoi = poi;
  dom.placeImage.src = poi.image.src;
  dom.placeImage.alt = poi.image.alt;
  dom.placeImageCredit.textContent = poi.image.credit;
  dom.placeMeta.textContent = `DAY ${poi.day} · ${poi.type} · ${poi.time}`;
  dom.placeName.textContent = poi.name;
  dom.placeSummary.textContent = poi.summary;
  dom.placeHighlight.textContent = poi.highlight;
  dom.placeDetails.innerHTML = poi.details.map((detail) => `<span class="detail-chip">${detail}</span>`).join("");
  dom.placeLink.href = poi.link;
  dom.placeSource.textContent = `${poi.image.credit}；坐标、时间与行程信息为首版模拟数据。`;
  setTrack(poi.musicId);
}

function setView(view) {
  const changed = state.view !== view;
  state.view = view;
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  dom.panelTitle.textContent = view === "overview" ? "行程全景" : view === "place" ? state.selectedPoi.name : "数据洞察";
  if (changed) dom.panelScroll.scrollTo({ top: 0, behavior: "auto" });
  if (view === "insights") setTimeout(() => charts?.resize(), 60);
}

function selectPlace(poi, switchView = true) {
  renderPlace(poi);
  dom.panelScroll.scrollTop = 0;
  if (state.panelCollapsed) togglePanel(false);
  if (switchView) setView("place");
  if (state.audioStarted && !dom.audio.paused) playAudio();
}

function selectDay(day) {
  state.day = day;
  dom.daySelector.querySelectorAll(".segment").forEach((button) => {
    const active = button.dataset.day === day;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderTimeline();
  markers?.filter(day);
  routes?.setDay(day);
  charts?.update(day);

  const activePois = getPoisForDay(day);
  if (!activePois.includes(state.selectedPoi)) renderPlace(activePois[0]);
  dom.routeDayLabel.textContent = day === "all" ? "四日完整行程" : `第 ${day} 天 · ${routeData[Number(day) - 1].label}`;
  const activeRoutes = day === "all" ? routeData : routeData.filter((route) => route.day === Number(day));
  const segmentCount = activeRoutes.reduce((sum, route) => sum + route.segments.length, 0);
  dom.routeCaption.textContent = `${segmentCount || "单点"} ${segmentCount ? "段路线" : "参访"} · ${activePois.length} 个地点`;
}

function togglePanel(forceCollapsed) {
  state.panelCollapsed = typeof forceCollapsed === "boolean" ? forceCollapsed : !state.panelCollapsed;
  dom.app.classList.toggle("is-panel-collapsed", state.panelCollapsed);
  dom.panelToggle.setAttribute("aria-expanded", String(!state.panelCollapsed));
  dom.panelToggle.setAttribute("aria-label", state.panelCollapsed ? "展开故事面板" : "收起故事面板");
  dom.panelToggle.title = state.panelCollapsed ? "展开故事面板" : "收起故事面板";
  dom.panelToggle.innerHTML = `<i data-lucide="${state.panelCollapsed ? "panel-right-open" : "panel-right-close"}"></i>`;
  createIcons();
  setTimeout(() => {
    if (typeof map?.checkResize === "function") map.checkResize();
    else if (typeof map?.resize === "function") map.resize();
    charts?.resize();
  }, 260);
}

function setTrack(trackId) {
  const track = audioTracks.find((item) => item.id === trackId) || audioTracks[0];
  if (state.currentTrack?.id === track.id) return;
  const shouldContinue = state.audioStarted && !dom.audio.paused;
  state.currentTrack = track;
  dom.audio.src = track.src;
  dom.placeAudio.querySelector("span").textContent = track.label;
  dom.placeAudio.title = track.credit;
  if (shouldContinue) playAudio();
}

async function playAudio() {
  try {
    state.audioStarted = true;
    await dom.audio.play();
    updateAudioButtons(true);
  } catch (error) {
    updateAudioButtons(false);
    showToast(dom.audio.error
      ? "地点音频未能载入，页面其他功能不受影响。"
      : "浏览器阻止了音频播放，请再次点击音频按钮。");
  }
}

function pauseAudio() {
  dom.audio.pause();
  updateAudioButtons(false);
}

function toggleAudio() {
  if (dom.audio.paused) playAudio();
  else pauseAudio();
}

function updateAudioButtons(playing) {
  dom.audioToggle.classList.toggle("is-playing", playing);
  dom.placeAudio.classList.toggle("is-playing", playing);
  dom.audioToggle.setAttribute("aria-label", playing ? "暂停地点音频" : "播放地点音频");
  dom.audioToggle.title = playing ? "暂停地点音频" : "播放地点音频";
  dom.audioToggle.innerHTML = `<i data-lucide="${playing ? "volume-x" : "volume-2"}"></i>`;
  createIcons();
}

function updateRouteUi({ status, progress }) {
  const labels = {
    ready: "准备回放",
    playing: "正在回放",
    paused: "已暂停",
    complete: "回放完成"
  };
  dom.routeState.textContent = labels[status] || labels.ready;
  dom.routeProgress.style.width = `${Math.round(progress * 100)}%`;
  const playing = status === "playing";
  dom.playRoute.setAttribute("aria-label", playing ? "暂停行程" : status === "paused" ? "继续行程" : "播放行程");
  dom.playRoute.title = dom.playRoute.getAttribute("aria-label");
  dom.playRoute.innerHTML = `<i data-lucide="${playing ? "pause" : "play"}"></i>`;
  createIcons();
}

function bindUi() {
  dom.daySelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day]");
    if (button) selectDay(button.dataset.day);
  });

  document.querySelector(".panel-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-view]");
    if (tab) setView(tab.dataset.view);
  });

  dom.timeline.addEventListener("click", (event) => {
    const item = event.target.closest("[data-poi-id]");
    if (item) markers?.select(item.dataset.poiId, true);
  });

  dom.panelToggle.addEventListener("click", () => togglePanel());
  dom.playRoute.addEventListener("click", () => routes?.toggle());
  dom.resetRoute.addEventListener("click", () => {
    routes?.reset();
    markers?.filter(state.day);
  });
  dom.audioToggle.addEventListener("click", toggleAudio);
  dom.placeAudio.addEventListener("click", toggleAudio);
  dom.audio.addEventListener("error", () => {
    pauseAudio();
    showToast("地点音频未能载入，页面其他功能不受影响。");
  });
  dom.placeImage.addEventListener("error", () => {
    if (!dom.placeImage.src.endsWith("first-congress.png")) dom.placeImage.src = "assets/images/first-congress.png";
    dom.placeImageCredit.textContent = "图片载入失败，已显示本地备用视觉";
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !state.panelCollapsed) togglePanel(true);
  });
}

async function initMap() {
  try {
    await waitForGlobal("BMapGL");
    map = new BMapGL.Map("map", { enableMapClick: false });
    map.centerAndZoom(new BMapGL.Point(121.4737, 31.2304), 10);
    map.enableScrollWheelZoom(true);
    map.enableContinuousZoom();
    const controlOptions = window.BMAP_ANCHOR_BOTTOM_RIGHT == null ? {} : { anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT };
    if (BMapGL.NavigationControl3D) map.addControl(new BMapGL.NavigationControl3D(controlOptions));
    if (BMapGL.ScaleControl) map.addControl(new BMapGL.ScaleControl(controlOptions));

    markers = new MarkerController({
      map,
      pois: poiData,
      onSelect: (poi) => selectPlace(poi, true)
    });
    markers.mount();

    routes = new RouteController({
      map,
      routes: routeData,
      poiById,
      onStateChange: updateRouteUi,
      onSegmentSelect: ({ segment, from, to }) => {
        const detail = `${from.name} → ${to.name} · ${segment.mode} · ${segment.distance} km · ${segment.duration}`;
        dom.routeCaption.textContent = detail;
        showToast(detail);
      }
    });
    routes.mount();
    markers.filter("all");

    const hideStatus = () => dom.mapStatus.classList.add("is-hidden");
    map.addEventListener("tilesloaded", hideStatus);
    setTimeout(hideStatus, 1600);
  } catch (error) {
    dom.mapStatus.classList.add("is-error");
    dom.mapStatus.innerHTML = "<span>地图服务未能载入。请检查网络、百度地图 AK 或域名白名单；右侧故事和图表仍可浏览。</span>";
    console.error(error);
  }
}

async function boot() {
  bindUi();
  renderMetrics();
  renderTimeline();
  renderPlace(state.selectedPoi);
  createIcons();

  charts = new ChartsController({ pois: poiData, routes: routeData });
  charts.mount();
  await initMap();
}

window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  showToast("部分内容暂时不可用，请检查网络后刷新。 ");
});

boot();
