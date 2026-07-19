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
    class Size { constructor(width, height) { this.width = width; this.height = height; } }
    class Overlay {
      constructor(point) { this.point = point; this.visible = true; this.listeners = {}; }
      addEventListener(name, handler) { this.listeners[name] = handler; }
      show() { this.visible = true; }
      hide() { this.visible = false; }
    }
    class Marker extends Overlay {
      getPosition() { return this.point; }
      setPosition(point) { this.point = point; }
      setLabel(label) { this.label = label; }
    }
    class Label extends Overlay { setStyle(style) { this.style = style; } }
    class Polyline extends Overlay {
      constructor(path, options) { super(path[0]); this.path = path; this.options = options; }
      setPath(path) { this.path = path; }
      setStrokeOpacity(value) { this.opacity = value; }
      setStrokeWeight(value) { this.weight = value; }
    }
    class InfoWindow { constructor(content, options) { this.content = content; this.options = options; } }
    class Map {
      constructor(id) {
        this.node = document.getElementById(id);
        this.overlays = [];
        this.listeners = {};
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
      centerAndZoom() {}
      enableScrollWheelZoom() {}
      enableContinuousZoom() {}
      addControl() {}
      addOverlay(overlay) { this.overlays.push(overlay); }
      removeOverlay(overlay) { this.overlays = this.overlays.filter((item) => item !== overlay); }
      setViewport() {}
      flyTo() {}
      panTo() {}
      openInfoWindow() {}
      checkResize() {}
      addEventListener(name, handler) { this.listeners[name] = handler; if (name === "tilesloaded") setTimeout(handler, 20); }
    }
    window.BMapGL = { Point, Size, Marker, Label, Polyline, InfoWindow, Map, NavigationControl3D: class {}, ScaleControl: class {} };
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
          [130, 250, 390, 520].forEach((x, index) => { ctx.fillStyle = ["#b7352c", "#176b66", "#245ca6", "#a7772b"][index]; ctx.fillRect(x, 330 - index * 48, 48, 30 + index * 48); });
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
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `页面存在 ${overflow}px 横向溢出`);
  assert(await page.locator(".timeline-item").count() === 9, "全部行程应显示 9 个地点");
  assert(await page.locator(".panel-tab").count() === 3, "故事面板应有 3 个视图");

  await page.locator('[data-day="2"]').click();
  assert(await page.locator(".timeline-item").count() === 2, "第 2 天应显示 2 个地点");
  await page.locator(".timeline-item").first().click();
  assert((await page.locator("#place-name").textContent()).includes("洋山港"), "地点故事没有同步到第 2 天首站");
  assert((await page.locator("#ambient-audio").getAttribute("src")).includes("industry-placeholder.wav"), "地点音轨没有同步切换");
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
