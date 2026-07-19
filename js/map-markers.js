export class MarkerController {
  constructor({ map, pois, onSelect }) {
    this.map = map;
    this.pois = pois;
    this.onSelect = onSelect;
    this.markers = new Map();
    this.infoWindow = null;
  }

  mount() {
    this.pois.forEach((poi) => {
      const point = new BMapGL.Point(poi.coord.lng, poi.coord.lat);
      const marker = new BMapGL.Marker(point, {
        title: `${poi.name}，第 ${poi.day} 天`
      });

      const label = new BMapGL.Label(`D${poi.day}${poi.featured ? " · 重点" : ""}`, {
        position: point,
        offset: new BMapGL.Size(18, -30)
      });
      label.setStyle({
        color: poi.featured ? "#ffffff" : "#17201c",
        backgroundColor: poi.featured ? "#b7352c" : "#fffdf8",
        border: poi.featured ? "1px solid #7f241f" : "1px solid #c8c2b8",
        borderRadius: "3px",
        padding: "3px 6px",
        fontSize: "10px",
        fontWeight: "700",
        boxShadow: "0 3px 10px rgba(23,32,28,.18)"
      });

      marker.setLabel(label);
      marker.addEventListener("click", () => this.select(poi.id, true));
      this.map.addOverlay(marker);
      this.markers.set(poi.id, marker);
    });
  }

  select(id, focusMap = true) {
    const poi = this.pois.find((item) => item.id === id);
    const marker = this.markers.get(id);
    if (!poi || !marker) return;

    const point = marker.getPosition();
    if (focusMap) {
      if (typeof this.map.flyTo === "function") {
        this.map.flyTo(point, 15, { duration: 900 });
      } else {
        this.map.centerAndZoom(point, 15);
      }
    }

    const content = `
      <div class="bmap-info-window">
        <p>DAY ${poi.day} · ${poi.type}</p>
        <h3>${poi.name}</h3>
        <span>${poi.highlight}</span>
      </div>
    `;
    this.infoWindow = new BMapGL.InfoWindow(content, {
      width: 250,
      height: 96,
      title: ""
    });
    this.map.openInfoWindow(this.infoWindow, point);
    this.onSelect?.(poi);
  }

  filter(day) {
    this.pois.forEach((poi) => {
      const marker = this.markers.get(poi.id);
      if (!marker) return;
      const visible = day === "all" || poi.day === Number(day);
      if (visible) marker.show();
      else marker.hide();
    });

    if (day === "all") {
      this.fitTo(this.pois);
    } else {
      this.fitTo(this.pois.filter((poi) => poi.day === Number(day)));
    }
  }

  fitTo(pois) {
    const points = pois.map((poi) => new BMapGL.Point(poi.coord.lng, poi.coord.lat));
    if (!points.length) return;
    if (points.length === 1) {
      this.map.centerAndZoom(points[0], 13);
      return;
    }
    this.map.setViewport(points, {
      margins: window.innerWidth <= 680 ? [130, 40, 360, 40] : [120, 500, 120, 80],
      zoomFactor: -1
    });
  }

  destroy() {
    this.markers.forEach((marker) => this.map.removeOverlay(marker));
    this.markers.clear();
  }
}
