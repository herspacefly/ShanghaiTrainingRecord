export const poiData = [
  {
    id: "first-congress",
    name: "中共一大会址",
    coord: { lng: 121.47376, lat: 31.22213 }, // TODO: 按现场记录校正坐标
    day: 1,
    order: 1,
    type: "红色教育",
    featured: true,
    time: "09:00",
    duration: "90 分钟",
    summary: "从石库门建筑中的历史现场出发，理解城市空间如何承载重要公共记忆。",
    highlight: "历史叙事与石库门建筑保护",
    details: ["中共一大历史脉络", "纪念馆展陈空间", "新天地街区更新"],
    image: {
      src: "assets/images/first-congress.png",
      alt: "中共一大会址示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://www.zgyd1921.com/index.html",
    musicId: "history"
  },
  {
    id: "hong-kong-plaza",
    name: "香港广场",
    coord: { lng: 121.47318, lat: 31.22135 }, // TODO: 按现场记录校正坐标
    day: 1,
    order: 2,
    type: "城市观察",
    featured: false,
    time: "11:00",
    duration: "45 分钟",
    summary: "在传统街区与商业综合体的交界处，观察城市功能和步行空间的变化。",
    highlight: "历史街区与商业空间并置",
    details: ["街区尺度", "商业动线", "公共空间界面"],
    image: {
      src: "assets/images/hong-kong-plaza.png",
      alt: "香港广场示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://map.baidu.com/poi/%E9%A6%99%E6%B8%AF%E5%B9%BF%E5%9C%BA",
    musicId: "city"
  },
  {
    id: "nanjing-road",
    name: "南京路步行街",
    coord: { lng: 121.48149, lat: 31.23523 }, // TODO: 按现场记录校正坐标
    day: 1,
    order: 3,
    type: "城市观察",
    featured: false,
    time: "14:00",
    duration: "90 分钟",
    summary: "沿高密度步行商业轴线记录人流、店招、街道设施与城市节奏。",
    highlight: "步行商业街的人流组织",
    details: ["慢行系统", "商业街景", "城市公共设施"],
    image: {
      src: "assets/images/nanjing-road.png",
      alt: "南京路步行街示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://map.baidu.com/poi/%E5%8D%97%E4%BA%AC%E8%B7%AF%E6%AD%A5%E8%A1%8C%E8%A1%97",
    musicId: "city"
  },
  {
    id: "the-bund",
    name: "上海外滩",
    coord: { lng: 121.49012, lat: 31.24147 }, // TODO: 按现场记录校正坐标
    day: 1,
    order: 4,
    type: "城市观察",
    featured: false,
    time: "16:30",
    duration: "90 分钟",
    summary: "隔江观察两种城市天际线，在滨水公共空间中理解上海的历史纵深。",
    highlight: "历史建筑群与浦东天际线对望",
    details: ["滨水空间", "建筑风貌", "城市天际线"],
    image: {
      src: "assets/images/the-bund.png",
      alt: "上海外滩示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://map.baidu.com/poi/%E4%B8%8A%E6%B5%B7%E5%A4%96%E6%BB%A9",
    musicId: "city"
  },
  {
    id: "yangshan-port",
    name: "洋山港自动化码头",
    coord: { lng: 122.07364, lat: 30.62488 }, // TODO: 按参访区域校正坐标
    day: 2,
    order: 1,
    type: "智慧港口",
    featured: true,
    time: "09:00",
    duration: "150 分钟",
    summary: "在大型自动化码头观察桥吊、轨道吊与无人运输设备协同完成集装箱作业。",
    highlight: "自动化装卸与智能调度系统",
    details: ["无人运输设备", "远程桥吊", "港口调度平台"],
    image: {
      src: "assets/images/yangshan-port.png",
      alt: "洋山港自动化码头示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://www.portshanghai.com.cn/",
    musicId: "industry"
  },
  {
    id: "maritime-museum",
    name: "中国航海博物馆",
    coord: { lng: 121.92908, lat: 30.90716 }, // TODO: 按现场记录校正坐标
    day: 2,
    order: 2,
    type: "行业文化",
    featured: false,
    time: "14:00",
    duration: "120 分钟",
    summary: "通过航海史、船舶与港口专题展陈，补全自动化港口背后的行业知识。",
    highlight: "航海技术演进与港航文化",
    details: ["船舶结构", "航海仪器", "港航发展史"],
    image: {
      src: "assets/images/maritime-museum.png",
      alt: "中国航海博物馆示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://www.shmmc.com.cn/",
    musicId: "industry"
  },
  {
    id: "huace",
    name: "华测导航",
    coord: { lng: 121.16821, lat: 31.15142 }, // TODO: 按实际参访园区校正坐标
    day: 3,
    order: 1,
    type: "高新企业",
    featured: true,
    time: "09:30",
    duration: "120 分钟",
    summary: "围绕高精度卫星导航产品，理解从定位算法、终端设备到行业应用的技术链条。",
    highlight: "北斗高精度定位与 RTK 应用",
    details: ["RTK 定位", "组合导航", "测绘与行业终端"],
    image: {
      src: "assets/images/huace.png",
      alt: "华测导航示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://www.huace.cn/",
    musicId: "technology"
  },
  {
    id: "urban-planning",
    name: "上海城市规划展示馆",
    coord: { lng: 121.47533, lat: 31.23335 }, // TODO: 按现场记录校正坐标
    day: 3,
    order: 2,
    type: "城市观察",
    featured: false,
    time: "14:30",
    duration: "120 分钟",
    summary: "从城市模型、历史演变与总体规划中建立对上海空间结构的整体认识。",
    highlight: "超大城市空间结构与规划演进",
    details: ["城市总体规划", "数字沙盘", "历史空间演变"],
    image: {
      src: "assets/images/urban-planning.png",
      alt: "上海城市规划展示馆示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "https://www.supec.org/",
    musicId: "technology"
  },
  {
    id: "siom",
    name: "中国科学院上海光机所",
    coord: { lng: 121.24313, lat: 31.38316 }, // TODO: 按实际参访入口校正坐标
    day: 4,
    order: 1,
    type: "科研院所",
    featured: true,
    time: "09:30",
    duration: "180 分钟",
    summary: "走近强激光与精密光学研究现场，理解基础研究、重大工程与科研精神的连接。",
    highlight: "强激光技术、精密光学与科研精神",
    details: ["强激光科学", "精密光学制造", "大科学装置"],
    image: {
      src: "assets/images/siom.png",
      alt: "中国科学院上海光机所示意视觉",
      credit: "本地示意视觉 · TODO：替换实训照片"
    },
    link: "http://www.siom.cas.cn/",
    musicId: "science"
  }
];

export const routeData = [
  {
    day: 1,
    label: "城市历史步行线",
    color: "#b7352c",
    distance: 7.4, // TODO: 使用实际轨迹计算
    start: "09:00",
    end: "18:00",
    path: ["first-congress", "hong-kong-plaza", "nanjing-road", "the-bund"],
    segments: [
      { from: "first-congress", to: "hong-kong-plaza", mode: "步行", distance: 0.6, duration: "10 分钟" },
      { from: "hong-kong-plaza", to: "nanjing-road", mode: "地铁 + 步行", distance: 3.1, duration: "25 分钟" },
      { from: "nanjing-road", to: "the-bund", mode: "步行", distance: 3.7, duration: "45 分钟" }
    ]
  },
  {
    day: 2,
    label: "临港港航线",
    color: "#176b66",
    distance: 83.5, // TODO: 使用实际车辆轨迹计算
    start: "09:00",
    end: "16:30",
    path: ["yangshan-port", "maritime-museum"],
    segments: [
      { from: "yangshan-port", to: "maritime-museum", mode: "实训大巴", distance: 83.5, duration: "约 95 分钟" }
    ]
  },
  {
    day: 3,
    label: "技术与城市线",
    color: "#245ca6",
    distance: 39.2, // TODO: 使用实际车辆轨迹计算
    start: "09:30",
    end: "16:30",
    path: ["huace", "urban-planning"],
    segments: [
      { from: "huace", to: "urban-planning", mode: "实训大巴", distance: 39.2, duration: "约 70 分钟" }
    ]
  },
  {
    day: 4,
    label: "科研精神线",
    color: "#8a6325",
    distance: 0, // 单点参访，未记录出发地；TODO: 补充往返路线
    start: "09:30",
    end: "12:30",
    path: ["siom"],
    segments: []
  }
];

export const audioTracks = [
  { id: "history", src: "assets/audio/history-placeholder.wav", label: "历史主题音频（占位）", credit: "本地有效静音占位 · TODO：替换公版音频" },
  { id: "city", src: "assets/audio/city-placeholder.wav", label: "城市主题音频（占位）", credit: "本地有效静音占位 · TODO：替换公版音频" },
  { id: "industry", src: "assets/audio/industry-placeholder.wav", label: "港航主题音频（占位）", credit: "本地有效静音占位 · TODO：替换公版音频" },
  { id: "technology", src: "assets/audio/technology-placeholder.wav", label: "技术主题音频（占位）", credit: "本地有效静音占位 · TODO：替换公版音频" },
  { id: "science", src: "assets/audio/science-placeholder.wav", label: "科研主题音频（占位）", credit: "本地有效静音占位 · TODO：替换公版音频" }
];

export const poiById = new Map(poiData.map((poi) => [poi.id, poi]));

export function getPoisForDay(day) {
  return day === "all" ? poiData : poiData.filter((poi) => poi.day === Number(day));
}

export function getRoutesForDay(day) {
  return day === "all" ? routeData : routeData.filter((route) => route.day === Number(day));
}
