const COLORS = ["#b7352c", "#176b66", "#245ca6", "#a7772b", "#70528f", "#6f7d76"];

export class ChartsController {
  constructor({ pois, routes }) {
    this.pois = pois;
    this.routes = routes;
    this.instances = [];
    this.day = "all";
    this.resizeObserver = null;
  }

  mount() {
    if (!window.echarts) {
      document.querySelectorAll(".chart").forEach((node) => {
        node.textContent = "图表组件未能载入，请检查网络连接。";
        node.style.cssText = "display:grid;place-items:center;padding:24px;color:#7b2420;font-size:12px;text-align:center";
      });
      return false;
    }

    this.distanceChart = echarts.init(document.getElementById("distance-chart"));
    this.typeChart = echarts.init(document.getElementById("type-chart"));
    this.timeChart = echarts.init(document.getElementById("time-chart"));
    this.instances = [this.distanceChart, this.typeChart, this.timeChart];
    this.update("all");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.instances.forEach((chart) => this.resizeObserver.observe(chart.getDom()));
    window.addEventListener("resize", this.resizeBound = () => this.resize());
    return true;
  }

  update(day) {
    this.day = day;
    if (!this.instances.length) return;
    this.renderDistance();
    this.renderTypes();
    this.renderTime();
  }

  renderDistance() {
    const selected = this.day === "all" ? null : Number(this.day);
    this.distanceChart.setOption({
      animationDuration: 500,
      grid: { left: 48, right: 22, top: 20, bottom: 36 },
      tooltip: {
        trigger: "axis",
        formatter: (params) => `${params[0].name}<br>估算 ${params[0].value} km`
      },
      xAxis: {
        type: "category",
        data: this.routes.map((route) => `D${route.day}`),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#bdb7ac" } },
        axisLabel: { color: "#59635e", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        name: "km",
        nameTextStyle: { color: "#7b837f", fontSize: 10 },
        splitLine: { lineStyle: { color: "#ded9cf" } },
        axisLabel: { color: "#7b837f", fontSize: 10 }
      },
      series: [{
        type: "bar",
        barWidth: 24,
        data: this.routes.map((route) => ({
          value: route.distance,
          itemStyle: {
            color: selected && route.day !== selected ? "#cbc6bc" : route.color,
            borderRadius: [3, 3, 0, 0]
          }
        })),
        label: {
          show: true,
          position: "top",
          color: "#39443f",
          fontSize: 10,
          formatter: ({ value }) => value === 0 ? "待补" : value
        }
      }]
    }, true);
  }

  renderTypes() {
    const activePois = this.day === "all"
      ? this.pois
      : this.pois.filter((poi) => poi.day === Number(this.day));
    const counts = activePois.reduce((map, poi) => {
      map.set(poi.type, (map.get(poi.type) || 0) + 1);
      return map;
    }, new Map());
    const data = [...counts.entries()].map(([name, value], index) => ({
      name,
      value,
      itemStyle: { color: COLORS[index % COLORS.length] }
    }));

    this.typeChart.setOption({
      animationDuration: 500,
      tooltip: { trigger: "item", formatter: "{b}<br>{c} 个地点 · {d}%" },
      legend: {
        type: "scroll",
        bottom: 3,
        left: 18,
        right: 18,
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { color: "#59635e", fontSize: 10 }
      },
      series: [{
        type: "pie",
        radius: ["40%", "67%"],
        center: ["50%", "43%"],
        data,
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#f6f2e9", borderWidth: 3 },
        label: { color: "#39443f", fontSize: 10, formatter: "{b}\n{c}" },
        emphasis: { scaleSize: 5 }
      }]
    }, true);
  }

  renderTime() {
    const selected = this.day === "all" ? null : Number(this.day);
    const parse = (value) => {
      const [hour, minute] = value.split(":").map(Number);
      return hour + minute / 60;
    };
    const starts = this.routes.map((route) => parse(route.start));
    const durations = this.routes.map((route) => parse(route.end) - parse(route.start));

    this.timeChart.setOption({
      animationDuration: 500,
      grid: { left: 52, right: 26, top: 15, bottom: 34 },
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const route = this.routes[params[0].dataIndex];
          return `D${route.day} ${route.label}<br>${route.start} - ${route.end}`;
        }
      },
      xAxis: {
        type: "value",
        min: 8,
        max: 19,
        interval: 2,
        axisLabel: { color: "#7b837f", fontSize: 10, formatter: (value) => `${value}:00` },
        splitLine: { lineStyle: { color: "#ded9cf" } }
      },
      yAxis: {
        type: "category",
        data: this.routes.map((route) => `D${route.day}`),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: "#59635e", fontSize: 11 }
      },
      series: [
        {
          type: "bar",
          stack: "time",
          silent: true,
          itemStyle: { color: "transparent" },
          data: starts
        },
        {
          type: "bar",
          stack: "time",
          barWidth: 18,
          data: durations.map((value, index) => ({
            value,
            itemStyle: {
              color: selected && this.routes[index].day !== selected ? "#cbc6bc" : this.routes[index].color,
              borderRadius: 3
            }
          }))
        }
      ]
    }, true);
  }

  resize() {
    this.instances.forEach((chart) => chart.resize());
  }

  destroy() {
    this.resizeObserver?.disconnect();
    if (this.resizeBound) window.removeEventListener("resize", this.resizeBound);
    this.instances.forEach((chart) => chart.dispose());
    this.instances = [];
  }
}
