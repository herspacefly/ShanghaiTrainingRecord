function getContrastingTextColor(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const weights = [0.2126, 0.7152, 0.0722];
  const luminance = channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * weights[index];
  }, 0);
  return luminance > 0.62 ? "#17201c" : "#ffffff";
}

function createRunnerIcon(color) {
  if (!BMapGL.Icon) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${color}" stroke="#ffffff" stroke-width="2"/></svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new BMapGL.Icon(url, new BMapGL.Size(20, 20), {
    anchor: new BMapGL.Size(10, 10),
    imageSize: new BMapGL.Size(20, 20)
  });
}

export class RouteController {
  constructor({ map, routes, poiById, getMapMode, prepare3dView, onStateChange, onSegmentSelect }) {
    this.map = map;
    this.routes = routes;
    this.poiById = poiById;
    this.getMapMode = getMapMode;
    this.prepare3dView = prepare3dView;
    this.onStateChange = onStateChange;
    this.onSegmentSelect = onSegmentSelect;
    this.day = "all";
    this.staticLines = [];
    this.segmentPaths = new Map();
    this.routeRequests = new Set();
    this.routeServices = [];
    this.trails = new Map();
    this.runner = null;
    this.frameId = null;
    this.steps = [];
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.lastFrame = 0;
    this.playing = false;
    this.complete = false;
    this.followMode = null;
    this.followPoint = null;
    this.cameraReadyAt = 0;
    this.runnerRouteDay = null;
    this.cameraAnimation = null;
    this.cameraAnimationStep = -1;
    this.cameraAnimationPaused = false;
    this.screenRunner = null;
  }

  mount() {
    this.routes.forEach((route) => {
      route.segments.forEach((segment) => {
        const from = this.poiById.get(segment.from);
        const to = this.poiById.get(segment.to);
        if (!from || !to) return;
        const key = this.segmentKey(segment);
        const path = [this.point(from), this.point(to)];
        this.segmentPaths.set(key, path);
        const line = new BMapGL.Polyline(path, {
          strokeColor: route.color,
          strokeWeight: 5,
          strokeOpacity: 0.5,
          enableClicking: true
        });
        line.addEventListener("click", () => {
          this.onSegmentSelect?.({ route, segment, from, to });
        });

        const midpoint = new BMapGL.Point(
          (from.coord.lng + to.coord.lng) / 2,
          (from.coord.lat + to.coord.lat) / 2
        );
        const guide = new BMapGL.Label(`D${route.day} · ${from.order} → ${to.order}`, {
          position: midpoint,
          offset: new BMapGL.Size(-28, -13)
        });
        guide.setStyle({
          color: getContrastingTextColor(route.color),
          backgroundColor: route.color,
          border: "1px solid rgba(255,255,255,.78)",
          borderRadius: "3px",
          padding: "4px 7px",
          fontSize: "10px",
          fontWeight: "700",
          lineHeight: "1.2",
          boxShadow: "0 3px 10px rgba(23,32,28,.2)",
          pointerEvents: "none"
        });

        this.map.addOverlay(line);
        this.map.addOverlay(guide);
        this.staticLines.push({ day: route.day, key, overlay: line, guide });
      });
    });
    this.setDay("all");
    this.loadRoadPaths();
  }

  point(poi) {
    return new BMapGL.Point(poi.coord.lng, poi.coord.lat);
  }

  segmentKey(segment) {
    return `${segment.from}->${segment.to}`;
  }

  getSegmentPath(route, fromId, toId) {
    return this.segmentPaths.get(`${fromId}->${toId}`)
      || [this.point(this.poiById.get(fromId)), this.point(this.poiById.get(toId))];
  }

  loadRoadPaths() {
    if (typeof BMapGL.DrivingRoute !== "function") return;
    this.routes.forEach((route) => route.segments.forEach((segment) => this.loadRoadPath(route, segment)));
  }

  loadRoadPath(route, segment) {
    const key = this.segmentKey(segment);
    if (this.routeRequests.has(key)) return;
    const from = this.poiById.get(segment.from);
    const to = this.poiById.get(segment.to);
    if (!from || !to) return;
    this.routeRequests.add(key);

    try {
      const service = new BMapGL.DrivingRoute("上海市", {
        onSearchComplete: (results) => {
          const path = this.extractRoadPath(results);
          if (!path || path.length < 2) return;
          this.segmentPaths.set(key, path);
          const item = this.staticLines.find((line) => line.key === key);
          item?.overlay.setPath(path);
          if (typeof item?.guide.setPosition === "function") {
            item.guide.setPosition(this.pointAlongPath(path, 0.5));
          }
        }
      });
      this.routeServices.push(service);
      service.search(this.point(from), this.point(to));
    } catch (error) {
      console.warn("道路路线规划不可用，已使用端点直线。", error);
    }
  }

  extractRoadPath(results) {
    const plan = results?.getPlan?.(0);
    const routeCount = plan?.getNumRoutes?.() || (plan?.getRoute?.(0) ? 1 : 0);
    const paths = [];
    for (let index = 0; index < routeCount; index += 1) {
      const routePath = plan.getRoute(index)?.getPath?.();
      if (Array.isArray(routePath)) paths.push(...(paths.length ? routePath.slice(1) : routePath));
    }
    const path = paths.length ? paths : results?.routes?.[0]?.path;
    if (!Array.isArray(path)) return null;
    return path.filter((point) => point && Number.isFinite(point.lng) && Number.isFinite(point.lat));
  }

  setDay(day) {
    this.day = day;
    this.cancelCameraAnimation();
    this.reset(false);
    this.staticLines.forEach(({ day: routeDay, overlay, guide }) => {
      const visible = day === "all" || routeDay === Number(day);
      if (visible) {
        overlay.show();
        guide.show();
      } else {
        overlay.hide();
        guide.hide();
      }
      overlay.setStrokeOpacity(day === "all" ? 0.46 : 0.82);
      overlay.setStrokeWeight(day === "all" ? 4 : 6);
    });
    this.prepareSteps();
    this.emit("ready", 0);
  }

  prepareSteps() {
    const activeRoutes = this.day === "all"
      ? this.routes
      : this.routes.filter((route) => route.day === Number(this.day));

    this.steps = activeRoutes.flatMap((route) => {
      const pois = route.path.map((id) => this.poiById.get(id)).filter(Boolean);
      if (pois.length === 1) return [{ type: "focus", route, poi: pois[0] }];
      return pois.slice(0, -1).map((poi, index) => ({
        type: "segment",
        route,
        from: poi,
        to: pois[index + 1]
      }));
    });
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  play() {
    if (!this.steps.length) return;
    if (this.complete) this.reset(false);
    this.playing = true;
    this.complete = false;
    this.lastFrame = 0;
    this.beginFollow();
    this.emit("playing", this.overallProgress());
    this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastFrame = 0;
    if (this.cameraAnimation && typeof this.map.pauseViewAnimation === "function") {
      this.map.pauseViewAnimation(this.cameraAnimation);
      this.cameraAnimationPaused = true;
    }
    this.emit("paused", this.overallProgress());
  }

  reset(emit = true) {
    this.playing = false;
    this.complete = false;
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.lastFrame = 0;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.followMode = null;
    this.followPoint = null;
    this.cameraReadyAt = 0;
    this.trails.forEach((trail) => this.map.removeOverlay(trail));
    this.trails.clear();
    if (this.runner) this.map.removeOverlay(this.runner);
    this.runner = null;
    this.runnerRouteDay = null;
    this.removeScreenRunner();
    this.cancelCameraAnimation();
    if (emit) this.emit("ready", 0);
  }

  tick(timestamp) {
    if (!this.playing) return;
    if (this.cameraReadyAt && timestamp < this.cameraReadyAt) {
      this.frameId = requestAnimationFrame((time) => this.tick(time));
      return;
    }
    this.cameraReadyAt = 0;
    const step = this.steps[this.stepIndex];
    if (!step) {
      this.finish();
      return;
    }

    if (!this.lastFrame) this.lastFrame = timestamp;
    const elapsed = Math.min(timestamp - this.lastFrame, 50);
    this.lastFrame = timestamp;
    const duration = step.type === "focus" ? 850 : this.segmentDuration(step);
    this.stepProgress = Math.min(1, this.stepProgress + elapsed / duration);

    if (step.type === "focus") this.renderFocus(step);
    else {
      this.ensure3dCameraAnimation(step);
      this.renderSegment(step);
    }

    this.emit("playing", this.overallProgress());

    if (this.stepProgress >= 1) {
      this.cameraAnimation = null;
      this.cameraAnimationStep = -1;
      this.cameraAnimationPaused = false;
      this.stepIndex += 1;
      this.stepProgress = 0;
      this.lastFrame = 0;
    }
    this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  renderFocus(step) {
    const point = this.point(step.poi);
    if (!this.runner) {
      this.createRunner(point, step.route, `正在回放：${step.poi.name}`);
    } else {
      this.updateRunnerIcon(step.route);
    }
    this.runner.setPosition(point);
    this.ensureScreenRunner(step.route);
    this.followCamera(point);
  }

  renderSegment(step) {
    const segmentPath = this.getSegmentPath(step.route, step.from.id, step.to.id);
    const from = segmentPath[0];
    const current = this.pointAlongPath(segmentPath, this.stepProgress);

    if (!this.runner) {
      this.createRunner(from, step.route, "行程回放移动端点");
    } else {
      this.updateRunnerIcon(step.route);
    }
    this.runner.setPosition(current);
    this.ensureScreenRunner(step.route);

    let trail = this.trails.get(step.route.day);
    if (!trail) {
      trail = new BMapGL.Polyline([from, current], {
        strokeColor: step.route.color,
        strokeWeight: 8,
        strokeOpacity: 0.92
      });
      this.map.addOverlay(trail);
      this.trails.set(step.route.day, trail);
    }

    const routePois = step.route.path.map((id) => this.poiById.get(id)).filter(Boolean);
    const currentIndex = routePois.findIndex((poi) => poi.id === step.from.id);
    const completed = [];
    for (let index = 0; index < currentIndex; index += 1) {
      const priorPath = this.getSegmentPath(step.route, routePois[index].id, routePois[index + 1].id);
      completed.push(...(index === 0 ? priorPath : priorPath.slice(1)));
    }
    trail.setPath([...completed, current]);

    this.followCamera(current);
  }

  createRunner(point, route, title) {
    const icon = createRunnerIcon(route.color);
    this.runner = new BMapGL.Marker(point, {
      title,
      ...(icon ? { icon } : {})
    });
    this.runnerRouteDay = route.day;
    this.map.addOverlay(this.runner);
  }

  updateRunnerIcon(route) {
    if (this.runnerRouteDay === route.day || typeof this.runner?.setIcon !== "function") return;
    const icon = createRunnerIcon(route.color);
    if (icon) this.runner.setIcon(icon);
    this.runnerRouteDay = route.day;
  }

  beginFollow() {
    const step = this.steps[this.stepIndex];
    if (!step) return;
    if (this.cameraAnimation && this.cameraAnimationPaused && this.getMapMode?.() === "3d") {
      if (typeof this.map.continueViewAnimation === "function") {
        this.map.continueViewAnimation(this.cameraAnimation);
      }
      this.cameraAnimationPaused = false;
      return;
    }
    this.cancelCameraAnimation();
    const point = step.type === "focus"
      ? this.point(step.poi)
      : this.pointAlongPath(
        this.getSegmentPath(step.route, step.from.id, step.to.id),
        this.stepProgress
      );
    this.ensureScreenRunner(step.route);
    this.followCamera(point, !this.followPoint);
  }

  followCamera(point, force = false) {
    if (!point) return;
    this.followPoint = point;
    const mode = this.getMapMode?.() === "3d" ? "3d" : "basic";
    const modeChanged = this.followMode !== mode;
    const zoom = mode === "3d" ? 18 : 15;
    let positioned = false;

    if (force || modeChanged) {
      const currentZoom = typeof this.map.getZoom === "function" ? this.map.getZoom() : null;
      const currentHeading = typeof this.map.getHeading === "function" ? this.map.getHeading() : 0;
      const currentTilt = typeof this.map.getTilt === "function" ? this.map.getTilt() : 0;
      const needsTransition = !Number.isFinite(currentZoom)
        || Math.abs(currentZoom - zoom) > 0.2
        || (mode === "3d" && (Math.abs(currentHeading - 64.5) > 1 || Math.abs(currentTilt - 73) > 1));

      if (mode === "3d") {
        if (needsTransition) {
          this.cancelCameraAnimation();
          this.prepare3dView?.(point);
          this.cameraReadyAt = performance.now() + 2200;
          positioned = true;
        }
      } else {
        this.cancelCameraAnimation();
        if (typeof this.map.centerAndZoom === "function") {
          this.map.centerAndZoom(point, zoom);
          positioned = true;
        } else if (typeof this.map.setZoom === "function") {
          this.map.setZoom(zoom);
        }
        if (needsTransition) this.cameraReadyAt = performance.now() + 900;
      }
    }

    if (!positioned) {
      const cameraCenter = this.cameraCenterFor(point);
      if (mode !== "3d" && typeof this.map.panTo === "function") {
        this.map.panTo(cameraCenter, { noAnimation: true });
      } else if (mode !== "3d" && typeof this.map.setCenter === "function") {
        this.map.setCenter(cameraCenter);
      }
    }

    this.followMode = mode;
  }

  cameraCenterFor(point) {
    if (!BMapGL.Pixel || typeof this.map.pixelToPoint !== "function" || typeof this.map.getCenter !== "function") {
      return point;
    }
    const container = typeof this.map.getContainer === "function"
      ? this.map.getContainer()
      : document.getElementById("map");
    const rect = container?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height) return point;
    const targetPoint = this.map.pixelToPoint(new BMapGL.Pixel(rect.width / 2, rect.height / 2));
    const center = this.map.getCenter();
    if (!targetPoint || !center) return point;
    return new BMapGL.Point(
      center.lng + point.lng - targetPoint.lng,
      center.lat + point.lat - targetPoint.lat
    );
  }

  cancelCameraAnimation() {
    if (typeof this.map.cancelViewAnimation === "function") {
      try {
        this.map.cancelViewAnimation(this.cameraAnimation || undefined);
      } catch (error) {
        // Baidu GL throws when no view animation is active.
      }
    }
    this.cameraAnimation = null;
    this.cameraAnimationStep = -1;
    this.cameraAnimationPaused = false;
  }

  ensure3dCameraAnimation(step) {
    if (this.getMapMode?.() !== "3d" || typeof BMapGL.ViewAnimation !== "function") return;
    if (this.cameraAnimation && this.cameraAnimationStep === this.stepIndex) return;
    this.cancelCameraAnimation();

    const path = this.getSegmentPath(step.route, step.from.id, step.to.id);
    const startProgress = this.stepProgress;
    const samples = Math.min(48, Math.max(10, Math.ceil(path.length / 4)));
    const keyFrames = Array.from({ length: samples }, (_, index) => {
      const percentage = index / (samples - 1);
      const routeProgress = startProgress + (1 - startProgress) * percentage;
      const point = this.pointAlongPath(path, routeProgress);
      return {
        center: point,
        zoom: 18,
        tilt: 73,
        heading: 64.5,
        percentage
      };
    });
    const duration = this.segmentDuration(step) * (1 - startProgress);
    this.cameraAnimation = new BMapGL.ViewAnimation(keyFrames, { duration, delay: 0 });
    this.cameraAnimationStep = this.stepIndex;
    this.cameraAnimationPaused = false;
    this.map.startViewAnimation(this.cameraAnimation);
  }

  ensureScreenRunner(route) {
    const container = typeof this.map.getContainer === "function"
      ? this.map.getContainer()
      : document.getElementById("map");
    if (!container) return;
    if (!this.screenRunner) {
      this.screenRunner = document.createElement("div");
      this.screenRunner.className = "route-runner-screen";
      this.screenRunner.setAttribute("aria-hidden", "true");
      this.screenRunner.style.cssText = [
        "position:absolute",
        "left:50%",
        "top:50%",
        "width:20px",
        "height:20px",
        "transform:translate(-50%,-50%)",
        "border:2px solid #fff",
        "border-radius:50%",
        "box-shadow:0 2px 8px rgba(23,32,28,.45)",
        "pointer-events:none",
        "z-index:5"
      ].join(";");
      container.appendChild(this.screenRunner);
    }
    this.screenRunner.style.backgroundColor = route.color;
    this.screenRunner.hidden = false;
    if (this.runner) this.runner.hide();
  }

  removeScreenRunner() {
    this.screenRunner?.remove();
    this.screenRunner = null;
  }

  segmentDuration(step) {
    const segment = step.route.segments.find((item) => (
      item.from === step.from.id && item.to === step.to.id
    ));
    const distance = Number(segment?.distance) || 0;
    return Math.min(6000, Math.max(1600, distance * 45));
  }

  getFollowPoint() {
    return this.followPoint;
  }

  pointAlongPath(path, progress) {
    if (path.length < 2) return path[0];
    const lengths = path.slice(1).map((point, index) => this.distance(path[index], point));
    const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
    let remaining = total * progress;
    for (let index = 0; index < lengths.length; index += 1) {
      const length = lengths[index];
      if (remaining <= length) {
        const from = path[index];
        const to = path[index + 1];
        const ratio = length ? remaining / length : 0;
        return new BMapGL.Point(
          from.lng + (to.lng - from.lng) * ratio,
          from.lat + (to.lat - from.lat) * ratio
        );
      }
      remaining -= length;
    }
    return path[path.length - 1];
  }

  distance(from, to) {
    const lngScale = Math.cos(((from.lat + to.lat) / 2) * Math.PI / 180);
    return Math.hypot((to.lng - from.lng) * lngScale, to.lat - from.lat);
  }

  overallProgress() {
    if (!this.steps.length) return 0;
    return Math.min(1, (this.stepIndex + this.stepProgress) / this.steps.length);
  }

  finish() {
    this.playing = false;
    this.complete = true;
    this.frameId = null;
    this.emit("complete", 1);
  }

  emit(status, progress) {
    this.onStateChange?.({
      status,
      progress,
      day: this.day,
      step: this.steps[this.stepIndex] || null
    });
  }
}
