import { dayColors } from "../data/poi-data.js?v=20260720-13";

function contrastingTextColor(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const weights = [0.2126, 0.7152, 0.0722];
  const luminance = channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * weights[index];
  }, 0);
  return luminance > 0.62 ? "#17201c" : "#ffffff";
}

function createMarkerIcon(color) {
  if (!BMapGL.Icon) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><path d="M15 1C7.27 1 1 7.27 1 15c0 9.72 14 22 14 22s14-12.28 14-22C29 7.27 22.73 1 15 1Z" fill="${color}" stroke="#17201c" stroke-width="1.5"/><circle cx="15" cy="15" r="5" fill="#fff" fill-opacity=".92"/></svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new BMapGL.Icon(url, new BMapGL.Size(30, 38), {
    anchor: new BMapGL.Size(15, 38),
    imageSize: new BMapGL.Size(30, 38)
  });
}

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
      const color = dayColors[poi.day];
      const textColor = contrastingTextColor(color);
      const icon = createMarkerIcon(color);
      const marker = new BMapGL.Marker(point, {
        title: `${poi.name}，第 ${poi.day} 天`,
        ...(icon ? { icon } : {})
      });

      const label = new BMapGL.Label(`D${poi.day} · 第${poi.order}站`, {
        position: point,
        offset: new BMapGL.Size(18, -30)
      });
      label.setStyle({
        color: textColor,
        backgroundColor: color,
        border: "1px solid rgba(23,32,28,.35)",
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
      zoomFactor: -1,
      enableAnimation: false
    });
  }

  destroy() {
    this.markers.forEach((marker) => this.map.removeOverlay(marker));
    this.markers.clear();
  }
}
