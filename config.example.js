/* 前端公开配置（高德地图）。高德 Web 端 JS key 必须暴露在前端，
   安全靠在高德后台「绑定域名白名单 szpinke.business」来保证。
   到 https://lbs.amap.com 申请「Web端(JS API)」key 后填入下方即可。 */
window.PINKE_CONFIG = {
  AMAP_KEY: "",            // ← 填高德 Web 端 JS API key
  AMAP_SECURITY: "",       // ← 高德安全密钥 jscode（如有）
  PARK_LNGLAT: [114.0440, 22.6156]  // 园区经纬度（民康路292号），建议用 https://lbs.amap.com/tools/picker 校准
};
