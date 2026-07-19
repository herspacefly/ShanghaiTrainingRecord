export class RouteController {
  constructor({ map, routes, poiById, onStateChange, onSegmentSelect }) {
    this.map = map;
    this.routes = routes;
    this.poiById = poiById;
    this.onStateChange = onStateChange;
    this.onSegmentSelect = onSegmentSelect;
    this.day = "all";
    this.staticLines = [];
    this.trails = new Map();
    this.runner = null;
    this.frameId = null;
    this.steps = [];
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.lastFrame = 0;
    this.playing = false;
    this.complete = false;
  }

  mount() {
    this.routes.forEach((route) => {
      route.segments.forEach((segment) => {
        const from = this.poiById.get(segment.from);
        const to = this.poiById.get(segment.to);
        if (!from || !to) return;
        const line = new BMapGL.Polyline([
          this.point(from),
          this.point(to)
        ], {
          strokeColor: route.color,
          strokeWeight: 5,
          strokeOpacity: 0.5,
          enableClicking: true
        });
        line.addEventListener("click", () => {
          this.onSegmentSelect?.({ route, segment, from, to });
        });
        this.map.addOverlay(line);
        this.staticLines.push({ day: route.day, overlay: line });
      });
    });
    this.setDay("all");
  }

  point(poi) {
    return new BMapGL.Point(poi.coord.lng, poi.coord.lat);
  }

  setDay(day) {
    this.day = day;
    this.reset(false);
    this.staticLines.forEach(({ day: routeDay, overlay }) => {
      const visible = day === "all" || routeDay === Number(day);
      if (visible) overlay.show();
      else overlay.hide();
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
    this.emit("playing", this.overallProgress());
    this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastFrame = 0;
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
    this.trails.forEach((trail) => this.map.removeOverlay(trail));
    this.trails.clear();
    if (this.runner) this.map.removeOverlay(this.runner);
    this.runner = null;
    if (emit) this.emit("ready", 0);
  }

  tick(timestamp) {
    if (!this.playing) return;
    const step = this.steps[this.stepIndex];
    if (!step) {
      this.finish();
      return;
    }

    if (!this.lastFrame) this.lastFrame = timestamp;
    const elapsed = Math.min(timestamp - this.lastFrame, 50);
    this.lastFrame = timestamp;
    const duration = step.type === "focus" ? 850 : 1500;
    this.stepProgress = Math.min(1, this.stepProgress + elapsed / duration);

    if (step.type === "focus") this.renderFocus(step);
    else this.renderSegment(step);

    this.emit("playing", this.overallProgress());

    if (this.stepProgress >= 1) {
      this.stepIndex += 1;
      this.stepProgress = 0;
      this.lastFrame = 0;
    }
    this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  renderFocus(step) {
    const point = this.point(step.poi);
    if (!this.runner) {
      this.runner = new BMapGL.Marker(point, { title: `正在回放：${step.poi.name}` });
      this.map.addOverlay(this.runner);
      this.map.centerAndZoom(point, 13);
    }
    this.runner.setPosition(point);
  }

  renderSegment(step) {
    const from = this.point(step.from);
    const to = this.point(step.to);
    const current = new BMapGL.Point(
      from.lng + (to.lng - from.lng) * this.stepProgress,
      from.lat + (to.lat - from.lat) * this.stepProgress
    );

    if (!this.runner) {
      this.runner = new BMapGL.Marker(from, { title: "行程回放移动端点" });
      this.map.addOverlay(this.runner);
    }
    this.runner.setPosition(current);

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
    const completed = routePois.slice(0, currentIndex + 1).map((poi) => this.point(poi));
    trail.setPath([...completed, current]);

    if (this.stepProgress === 0 || this.stepProgress > 0.96) {
      this.map.panTo(current, { noAnimation: false });
    }
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
    this.onStateChange?.({ status, progress, day: this.day });
  }
}
