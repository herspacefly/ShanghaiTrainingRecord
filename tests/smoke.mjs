import { chromium } from "file:///C:/Users/zhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const baseUrl = process.env.MYMAP_URL || "http://127.0.0.1:4173/";
const artifactDir = (process.env.MYMAP_ARTIFACT_DIR || "tests/artifacts").replaceAll("\\", "/");
const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testViewport(browser, viewport, screenshotName) {
  const context = await browser.newContext({ viewport, locale: "zh-CN" });
  await context.addInitScript(() => {
    class Point { constructor(lng, lat) { this.lng = lng; this.lat = lat; } }
    class Pixel { constructor(x, y) { this.x = x; this.y = y; } }
    class Size { constructor(width, height) { this.width = width; this.height = height; } }
    class Overlay {
      constructor(point) { this.point = point; this.visible = true; this.listeners = {}; }
      addEventListener(name, handler) { this.listeners[name] = handler; }
      setPosition(point) { this.point = point; }
      show() { this.visible = true; }
      hide() { this.visible = false; }
    }
    class Icon {
      constructor(url, size, options = {}) { this.url = url; this.size = size; this.options = options; }
    }
    class Marker extends Overlay {
      constructor(point, options = {}) { super(point); this.options = options; }
      getPosition() { return this.point; }
      setPosition(point) { this.point = point; }
      setIcon(icon) { this.options.icon = icon; }
      setLabel(label) { this.label = label; }
    }
    class Label extends Overlay {
      constructor(content, options = {}) { super(options.position); this.content = content; this.options = options; }
      setStyle(style) { this.style = style; }
    }
    class Polyline extends Overlay {
      constructor(path, options) { super(path[0]); this.path = path; this.options = options; }
      setPath(path) { this.path = path; }
      setStrokeOpacity(value) { this.opacity = value; }
      setStrokeWeight(value) { this.weight = value; }
    }
    class InfoWindow { constructor(content, options) { this.content = content; this.options = options; } }
    class DrivingRoute {
      constructor(map, options = {}) { this.map = map; this.options = options; }
      search(from, to) {
        const midpoint = new Point(
          (from.lng + to.lng) / 2 + 0.008,
          (from.lat + to.lat) / 2 + 0.012
        );
        const path = [from, midpoint, to];
        const route = { getPath: () => path };
        const plan = { getNumRoutes: () => 1, getRoute: () => route };
        setTimeout(() => this.options.onSearchComplete?.({ getPlan: () => plan }), 15);
      }
    }
    class ViewAnimation {
      constructor(keyFrames, options = {}) { this.keyFrames = keyFrames; this.options = options; }
    }
    class Map {
      constructor(id) {
        this.node = document.getElementById(id);
        this.overlays = [];
        this.listeners = {};
        this.center = null;
        this.zoom = 10;
        this.heading = 0;
        this.tilt = 0;
        this.centerHistory = [];
        window.__mapMock = this;
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 800;
        canvas.style.cssText = "width:100%;height:100%;object-fit:cover";
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#dce2dc"; ctx.fillRect(0, 0, 1200, 800);
        ctx.strokeStyle = "#c2cbc4"; ctx.lineWidth = 2;
        for (let x = 0; x < 1200; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 260, 800); ctx.stroke(); }
        ctx.fillStyle = "#b9d3dc"; ctx.fillRect(565, 0, 115, 800);
        ctx.fillStyle = "#6b7770"; ctx.font = "18px sans-serif"; ctx.fillText("离线交互验收底图", 36, 760);
        this.node.appendChild(canvas);
      }
      centerAndZoom(center, zoom) { this.center = center; this.zoom = zoom; this.centerHistory.push(center); }
      setCenter(center) { this.center = center; this.centerHistory.push(center); }
      startViewAnimation(animation) {
        animation.startedAt = performance.now();
        animation.elapsed = 0;
        animation.paused = false;
        this.viewAnimation = animation;
        const frame = (time) => {
          if (this.viewAnimation !== animation || animation.paused) return;
          animation.elapsed = time - animation.startedAt;
          const progress = Math.min(1, animation.elapsed / (animation.options.duration || 1));
          const frames = animation.keyFrames;
          const nextIndex = Math.min(frames.length - 1, Math.ceil(progress * (frames.length - 1)));
          const previousIndex = Math.max(0, nextIndex - 1);
          const previous = frames[previousIndex];
          const next = frames[nextIndex];
          const span = next.percentage - previous.percentage || 1;
          const local = Math.min(1, Math.max(0, (progress - previous.percentage) / span));
          this.center = new Point(
            previous.center.lng + (next.center.lng - previous.center.lng) * local,
            previous.center.lat + (next.center.lat - previous.center.lat) * local
          );
          this.zoom = previous.zoom + (next.zoom - previous.zoom) * local;
          this.heading = previous.heading + (next.heading - previous.heading) * local;
          this.tilt = previous.tilt + (next.tilt - previous.tilt) * local;
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }
      pauseViewAnimation(animation) { if (this.viewAnimation === animation) animation.paused = true; }
      continueViewAnimation(animation) {
        if (this.viewAnimation !== animation) return;
        animation.startedAt = performance.now() - animation.elapsed;
        animation.paused = false;
        this.startViewAnimation(animation);
      }
      cancelViewAnimation() { this.viewAnimation = null; }
      setZoom(zoom) { this.zoom = zoom; }
      getCenter() { return this.center; }
      getZoom() { return this.zoom; }
      getHeading() { return this.heading; }
      getTilt() { return this.tilt; }
      setHeading(value) { this.heading = value; }
      setTilt(value) { this.tilt = value; }
      enableScrollWheelZoom() {}
      enableContinuousZoom() {}
      addControl() {}
      addOverlay(overlay) { this.overlays.push(overlay); }
      removeOverlay(overlay) { this.overlays = this.overlays.filter((item) => item !== overlay); }
      setViewport() {}
      flyTo() {}
      panTo(center) { this.center = center; this.centerHistory.push(center); }
      getContainer() { return this.node; }
      pointToPixel(point) {
        const rect = this.node.getBoundingClientRect();
        const scale = 10000;
        const offsetX = this.tilt ? -12 : 0;
        const offsetY = this.tilt ? 2 : 0;
        return new Pixel(
          rect.width / 2 + (point.lng - this.center.lng) * scale + offsetX,
          rect.height / 2 - (point.lat - this.center.lat) * scale + offsetY
        );
      }
      pixelToPoint(pixel) {
        const rect = this.node.getBoundingClientRect();
        const scale = 10000;
        const offsetX = this.tilt ? -12 : 0;
        const offsetY = this.tilt ? 2 : 0;
        return new Point(
          this.center.lng + (pixel.x - rect.width / 2 - offsetX) / scale,
          this.center.lat - (pixel.y - rect.height / 2 - offsetY) / scale
        );
      }
      openInfoWindow() {}
      checkResize() {}
      addEventListener(name, handler) { this.listeners[name] = handler; if (name === "tilesloaded") setTimeout(handler, 20); }
    }
    window.BMapGL = { Point, Pixel, Size, Icon, Marker, Label, Polyline, InfoWindow, DrivingRoute, ViewAnimation, Map, NavigationControl3D: class {}, ScaleControl: class {} };
    window.BMAP_ANCHOR_BOTTOM_RIGHT = 3;
    window.echarts = {
      init(node) {
        const canvas = document.createElement("canvas");
        canvas.width = 700; canvas.height = 400; canvas.style.cssText = "width:100%;height:100%";
        node.appendChild(canvas);
        const draw = () => {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#d8d2c7"; ctx.lineWidth = 2;
          for (let y = 70; y < 360; y += 65) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(650, y); ctx.stroke(); }
          [130, 250, 390, 520].forEach((x, index) => { ctx.fillStyle = ["#2c73d2", "#95a7dd", "#e5f0ff", "#d5a419"][index]; ctx.fillRect(x, 330 - index * 48, 48, 30 + index * 48); });
        };
        draw();
        return { setOption: draw, getDom: () => node, resize: draw, dispose() {} };
      }
    };
    window.lucide = { createIcons() {} };
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(`console: ${message.text()}`);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3500);

  assert(await page.locator("h1").textContent() === "沪上四日", "页面标题未渲染");
  const titleScale = await page.evaluate(() => {
    const titleSize = Number.parseFloat(getComputedStyle(document.querySelector("h1")).fontSize);
    const kickerSize = Number.parseFloat(getComputedStyle(document.querySelector(".brand-kicker")).fontSize);
    return titleSize / kickerSize;
  });
  assert(Math.abs(titleScale - 4) < 0.05, `中英文标题字号比例应约为 4，当前为 ${titleScale}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `页面存在 ${overflow}px 横向溢出`);
  assert(await page.locator(".timeline-item").count() === 10, "全部行程应显示 10 个地点");
  assert(await page.locator(".panel-tab").count() === 3, "故事面板应有 3 个视图");
  assert(await page.locator("[data-map-mode]").count() === 2, "地图样式选择器应提供 2 种模式");

  await page.locator('[data-map-mode="3d"]').click();
  const threeDimensionalView = await page.evaluate(() => ({
    heading: window.__mapMock.heading,
    tilt: window.__mapMock.tilt,
    zoom: window.__mapMock.zoom
  }));
  assert(threeDimensionalView.heading === 64.5, "3D 地图朝向未按官方示例设置");
  assert(threeDimensionalView.tilt === 73, "3D 地图俯仰角未按官方示例设置");
  assert(threeDimensionalView.zoom === 18, "3D 地图缩放级别不足以展示建筑高度");
  assert(await page.locator('[data-map-mode="3d"]').getAttribute("aria-pressed") === "true", "3D 模式状态未同步");

  await page.locator('[data-map-mode="basic"]').click();
  const basicView = await page.evaluate(() => ({
    heading: window.__mapMock.heading,
    tilt: window.__mapMock.tilt,
    zoom: window.__mapMock.zoom
  }));
  assert(basicView.heading === 0 && basicView.tilt === 0, "基础地图未恢复俯视视角");
  assert(basicView.zoom === 10, "基础地图未恢复切换前的缩放级别");

  await page.locator('[data-day="2"]').click();
  assert(await page.locator(".timeline-item").count() === 2, "第 2 天应显示 2 个地点");
  await page.locator(".timeline-item").first().click();
  assert((await page.locator("#place-name").textContent()).includes("中国航海博物馆"), "地点故事没有同步到第 2 天首站");
  assert((await page.locator("#ambient-audio").getAttribute("src")).includes("industry-placeholder.wav"), "地点音轨没有同步切换");
  await page.locator('[data-view="overview"]').click();
  const dayTwoOrder = await page.locator(".timeline-item h4").allTextContents();
  assert(dayTwoOrder.join(" → ") === "中国航海博物馆 → 洋山港自动化码头", "第 2 天参观顺序不正确");
  const dayTwoStationLabels = await page.locator(".timeline-time strong").allTextContents();
  assert(dayTwoStationLabels.join(" → ") === "第 1 站 → 第 2 站", "侧栏没有显示第 2 天站序");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${artifactDir}/${screenshotName.replace(".png", "-route-order.png")}`, fullPage: false });

  const dayTwoRouteVisual = await page.evaluate(() => {
    const line = window.__mapMock.overlays.find((overlay) =>
      overlay.options?.strokeColor === "#95a7dd" && overlay.options?.strokeWeight === 5
    );
    const guide = window.__mapMock.overlays.find((overlay) => overlay.content === "D2 · 1 → 2");
    const marker = window.__mapMock.overlays.find((overlay) => overlay.options?.title?.includes("中国航海博物馆"));
    return {
      from: line?.path?.[0],
      bend: line?.path?.[1],
      to: line?.path?.at(-1),
      guideVisible: guide?.visible,
      guideText: guide?.content,
      markerColor: marker?.label?.style?.backgroundColor,
      markerIcon: marker?.options?.icon?.url
    };
  });
  assert(dayTwoRouteVisual.guideVisible && dayTwoRouteVisual.guideText === "D2 · 1 → 2", "第 2 天覆盖线没有显示方向标记");
  assert(dayTwoRouteVisual.markerColor === "#95a7dd", "第 2 天点标签颜色未与路线统一");
  assert(dayTwoRouteVisual.markerIcon?.includes("%2395a7dd"), "第 2 天地图点图标颜色未与路线统一");
  assert(Math.abs(dayTwoRouteVisual.from.lng - 121.92908) < 0.00001, "第 2 天覆盖线没有从中国航海博物馆出发");
  assert(Math.abs(dayTwoRouteVisual.to.lng - 122.07364) < 0.00001, "第 2 天覆盖线没有指向洋山港");
  const straightMidpointLat = (dayTwoRouteVisual.from.lat + dayTwoRouteVisual.to.lat) / 2;
  assert(dayTwoRouteVisual.bend && Math.abs(dayTwoRouteVisual.bend.lat - straightMidpointLat) > 0.01, "第 2 天覆盖线仍是目标点之间的直线");

  const followUpdatesBefore = await page.evaluate(() => window.__mapMock.centerHistory.length);
  await page.locator("#play-route").click();
  await page.waitForTimeout(1100);
  const dayTwoFollow = await page.evaluate((before) => {
    const runner = window.__mapMock.overlays.find((overlay) => overlay.options?.title === "行程回放移动端点");
    const rect = window.__mapMock.node.getBoundingClientRect();
    return {
      runner: runner?.point,
      pixel: window.__mapMock.pointToPixel(runner?.point),
      targetPixel: { x: rect.width / 2, y: rect.height / 2 },
      zoom: window.__mapMock.zoom,
      centerUpdates: window.__mapMock.centerHistory.length - before
    };
  }, followUpdatesBefore);
  assert(dayTwoFollow.runner.lng > 121.92908 && dayTwoFollow.runner.lng < 122.07364, "动态点没有从航海博物馆向洋山港移动");
  assert(dayTwoFollow.centerUpdates > 5, "播放视角没有随移动点连续更新");
  assert(Math.abs(dayTwoFollow.pixel.x - dayTwoFollow.targetPixel.x) < 0.1, "2D 移动点没有位于地图水平中心");
  assert(Math.abs(dayTwoFollow.pixel.y - dayTwoFollow.targetPixel.y) < 0.1, "2D 移动点没有位于地图垂直中心");
  assert(dayTwoFollow.zoom === 15, "2D 路线播放仍在展示当天全部目标点");
  assert((await page.locator("#route-caption").textContent()).includes("中国航海博物馆 → 第 2 站 洋山港自动化码头"), "回放文字没有显示当前移动方向");
  await page.locator("#play-route").click();
  await page.locator("#reset-route").click();

  await page.locator('[data-map-mode="3d"]').click();
  await page.locator("#play-route").click();
  await page.waitForTimeout(220);
  const threeDimensionalFollow = await page.evaluate(() => {
    const runner = window.__mapMock.overlays.find((overlay) => overlay.options?.title === "行程回放移动端点");
    const rect = window.__mapMock.node.getBoundingClientRect();
    const screenRunner = document.querySelector(".route-runner-screen")?.getBoundingClientRect();
    return {
      runner: runner?.point,
      pixel: window.__mapMock.pointToPixel(runner?.point),
      targetPixel: { x: rect.width / 2, y: rect.height / 2 },
      screenPixel: screenRunner ? { x: screenRunner.left + screenRunner.width / 2, y: screenRunner.top + screenRunner.height / 2 } : null,
      zoom: window.__mapMock.zoom,
      heading: window.__mapMock.heading,
      tilt: window.__mapMock.tilt
    };
  });
  assert(threeDimensionalFollow.heading === 64.5, "3D 路线播放丢失地图朝向");
  assert(threeDimensionalFollow.tilt === 73, "3D 路线播放切回了 2D 俯视角");
  assert(threeDimensionalFollow.zoom === 18, "3D 路线播放没有保持近景缩放");
  assert(Math.abs(threeDimensionalFollow.screenPixel.x - threeDimensionalFollow.targetPixel.x) < 0.1, "3D 移动点没有位于地图水平中心");
  assert(Math.abs(threeDimensionalFollow.screenPixel.y - threeDimensionalFollow.targetPixel.y) < 0.1, "3D 移动点没有位于地图垂直中心");
  await page.locator("#play-route").click();
  await page.locator("#reset-route").click();
  await page.locator('[data-map-mode="basic"]').click();

  await page.locator('[data-day="3"]').click();
  const dayThreeOrder = await page.locator(".timeline-item h4").allTextContents();
  assert(dayThreeOrder.join(" → ") === "中国科学院上海光机所 → 上海城市规划展示馆 → 陆家嘴中心绿地", "第 3 天参观顺序不正确");

  await page.locator('[data-day="4"]').click();
  assert((await page.locator(".timeline-item h4").first().textContent()).includes("华测导航"), "第 4 天首站没有更新为华测导航");

  await page.locator('[data-day="2"]').click();
  await page.locator(".timeline-item").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${artifactDir}/${screenshotName.replace(".png", "-place.png")}`, fullPage: false });
  await page.locator("#place-audio").click();
  await page.waitForTimeout(250);
  assert(await page.locator("#ambient-audio").evaluate((node) => !node.paused), "音频没有在用户点击后播放");
  await page.locator("#place-audio").click();
  assert(await page.locator("#ambient-audio").evaluate((node) => node.paused), "音频没有暂停");

  await page.locator('[data-view="insights"]').click();
  await page.waitForTimeout(400);
  const chartCount = await page.locator(".chart canvas").count();
  const chartFallbackCount = await page.locator(".chart").filter({ hasText: "图表组件未能载入" }).count();
  assert(chartCount === 3 || chartFallbackCount === 3, "图表既未渲染也未显示降级提示");

  await page.locator("#play-route").click();
  await page.waitForTimeout(450);
  console.log(JSON.stringify({
    viewport,
    mapStatus: await page.locator("#map-status").textContent(),
    mapError: await page.locator("#map-status").evaluate((node) => node.classList.contains("is-error")),
    routeState: await page.locator("#route-state").textContent(),
    pageErrors
  }));
  assert((await page.locator("#route-state").textContent()) === "正在回放", "路线未进入播放状态");
  await page.locator("#play-route").click();
  assert((await page.locator("#route-state").textContent()) === "已暂停", "路线未进入暂停状态");

  await page.locator("#panel-toggle").click();
  assert(await page.locator("#app").evaluate((node) => node.classList.contains("is-panel-collapsed")), "面板未收起");
  await page.locator("#panel-toggle").click();
  await page.waitForTimeout(320);
  const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(finalOverflow <= 1, `交互后页面存在 ${finalOverflow}px 横向溢出`);

  await page.screenshot({ path: `${artifactDir}/${screenshotName}`, fullPage: false });
  const seriousErrors = pageErrors.filter((message) => !/favicon|BMap|api\.map\.baidu|ERR_FAILED|ERR_CERT|net::/.test(message));
  assert(seriousErrors.length === 0, `页面存在错误: ${seriousErrors.join(" | ")}`);
  await context.close();
  return { viewport, chartCount, chartFallbackCount, pageErrors };
}

async function testFailureState(browser) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 720 } });
  const page = await context.newPage();
  await page.route(/api\.map\.baidu\.com|jsdelivr\.net|unpkg\.com|assets\/(images|audio)/, (route) => route.abort());
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(8500);
  assert(await page.locator("#map-status").evaluate((node) => node.classList.contains("is-error")), "地图失败状态未显示");
  assert(await page.locator(".chart").filter({ hasText: "图表组件未能载入" }).count() === 3, "图表失败状态未显示");
  await page.locator('[data-day="2"]').click();
  await page.locator('[data-view="place"]').click();
  await page.waitForTimeout(200);
  assert((await page.locator("#place-image-credit").textContent()).includes("载入失败"), "图片失败状态未显示");
  await page.locator("#place-audio").click();
  await page.waitForTimeout(200);
  assert((await page.locator("#toast").textContent()).includes("音频未能载入"), "音频失败状态未显示");
  await page.screenshot({ path: `${artifactDir}/failure-state.png`, fullPage: false });
  await context.close();
}

const browser = await chromium.launch({ headless: true, executablePath: browserPath });
try {
  const desktop = await testViewport(browser, { width: 1440, height: 900 }, "desktop.png");
  const mobile = await testViewport(browser, { width: 390, height: 844 }, "mobile.png");
  await testFailureState(browser);
  console.log(JSON.stringify({ ok: true, desktop, mobile, failureState: "passed" }, null, 2));
} finally {
  await browser.close();
}
