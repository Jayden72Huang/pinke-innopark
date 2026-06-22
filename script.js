/* 品客小镇·青创城 — 交互脚本（零依赖） */

/* =========================================================
   配置读取
   高德地图 key 放在独立的 config.js（不进 git），格式见 config.example.js。
   高德 Web 端 JS key 必须暴露在前端，安全靠「高德后台绑定域名白名单」保证。
   未配置 key 时，地图区自动显示带「高德导航」按钮的占位卡，不影响其它功能。
   ========================================================= */
var CFG = (window.PINKE_CONFIG || {});
var AMAP_KEY = CFG.AMAP_KEY || "";              // 高德 Web 端 JS API key
var AMAP_SECURITY = CFG.AMAP_SECURITY || "";    // 高德安全密钥 jscode（如有）
var PARK_LNGLAT = CFG.PARK_LNGLAT || [114.0440, 22.6156]; // 园区经纬度（民康路292号）

(function () {
  "use strict";

  // 标记 JS 已启用——此时才允许 reveal 进入初始隐藏态（见 styles.css）
  document.documentElement.classList.add("js");

  // 年份
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 导航滚动态
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 移动端菜单
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function closeMenu() { links.classList.remove("open"); toggle.classList.remove("open"); }
  toggle.addEventListener("click", function () {
    links.classList.toggle("open");
    toggle.classList.toggle("open");
  });
  links.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  // 滚动揭示
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var siblings = el.parentElement ? el.parentElement.querySelectorAll(".reveal") : [el];
          var idx = Array.prototype.indexOf.call(siblings, el);
          el.style.transitionDelay = Math.min(idx * 60, 360) + "ms";
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("in"); });
  }

  // 数字计数动画
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.floor(eased * target);
      el.textContent = (val >= 1000 ? val.toLocaleString("en-US") : val) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = (target >= 1000 ? target.toLocaleString("en-US") : target) + suffix;
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute("data-count") + (c.getAttribute("data-suffix") || ""); });
  }

  // 园区概况：特点 Tab 联动图片
  var showcase = document.getElementById("aboutShowcase");
  if (showcase) {
    var tabs = showcase.querySelectorAll(".about__tab");
    var imgs = showcase.querySelectorAll(".about__img");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var idx = +this.getAttribute("data-idx");
        tabs.forEach(function (t) { t.classList.remove("active"); });
        imgs.forEach(function (i) { i.classList.remove("active"); });
        this.classList.add("active");
        if (imgs[idx]) imgs[idx].classList.add("active");
      });
    });
  }

  // Hero 轮播图
  var carousel = document.getElementById("heroCarousel");
  if (carousel) {
    var slides = carousel.querySelectorAll(".carousel__slide");
    var dots = carousel.querySelectorAll(".carousel__dot");
    var current = 0;
    function goTo(idx) {
      slides[current].classList.remove("active");
      dots[current].classList.remove("active");
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add("active");
      dots[current].classList.add("active");
    }
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () { goTo(+this.getAttribute("data-slide")); });
    });
    var prevBtn = carousel.querySelector(".carousel__arrow--prev");
    var nextBtn = carousel.querySelector(".carousel__arrow--next");
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); });
    setInterval(function () { goTo(current + 1); }, 4000);
  }

  // 二维码占位：若 qrcode.png 缺失，img 的 onerror 会给容器加 .qr--empty 显示提示
  var qrImg = document.querySelector("#qrBox img");
  if (qrImg && (qrImg.complete && qrImg.naturalWidth === 0)) {
    document.getElementById("qrBox").classList.add("qr--empty");
  }

  // 高德地图加载（配置了 key 才加载，否则保留占位卡）
  function loadAMap() {
    if (!AMAP_KEY) return; // 未配置 → 显示占位
    if (AMAP_SECURITY) {
      window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
    }
    var s = document.createElement("script");
    s.src = "https://webapi.amap.com/maps?v=2.0&key=" + AMAP_KEY;
    s.onload = function () {
      try {
        var el = document.getElementById("amap");
        var map = new AMap.Map(el, {
          zoom: 16,
          center: PARK_LNGLAT,
          mapStyle: "amap://styles/normal"
        });
        var marker = new AMap.Marker({ position: PARK_LNGLAT, title: "品客小镇·青创城" });
        map.add(marker);
        var info = new AMap.InfoWindow({
          content: '<div style="font-size:13px;line-height:1.6;color:#222;padding:2px 4px;">' +
                   '<b>品客小镇·青创城</b><br/>龙华区民康路292号<br/>招商热线 136-1283-2188</div>',
          offset: new AMap.Pixel(0, -30)
        });
        info.open(map, PARK_LNGLAT);
        marker.on("click", function () { info.open(map, PARK_LNGLAT); });
        el.classList.add("loaded"); // 隐藏占位卡（见 styles.css）
      } catch (err) { /* 加载失败则保留占位卡 */ }
    };
    s.onerror = function () { /* 网络失败 → 保留占位卡 */ };
    document.head.appendChild(s);
  }
  loadAMap();

  // 提交留资 → 腾讯云 CloudBase HTTP 云函数（入库 + 可选推飞书）
  function submitLead(data) {
    var api = window.PINKE_LEAD_API;
    if (!api) return Promise.reject(new Error("api-unconfigured"));
    return fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
  }

  // 留资表单 → 提交到云函数
  var form = document.getElementById("leadForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var hint = document.getElementById("formHint");
      var btn = form.querySelector('button[type="submit"]');
      if (!name || !/^1[3-9]\d{9}$/.test(phone)) {
        hint.textContent = "请填写称呼，并确认手机号为 11 位有效号码。";
        hint.classList.remove("ok");
        return;
      }
      var data = {
        name: name, phone: phone,
        area: form.area.value, note: form.note.value,
        page: location.href
      };
      btn.disabled = true;
      btn.textContent = "提交中…";
      submitLead(data)
        .then(function (res) { return (res && res.ok) ? res : Promise.reject(res); })
        .then(function () {
          hint.textContent = "✓ 已收到，" + name + " 您好，我们会尽快拨打 " + phone + " 与您联系！";
          hint.classList.add("ok");
          btn.textContent = "提交成功 ✓";
        })
        .catch(function () {
          // 接口未部署或失败时的兜底：引导直接拨打电话
          hint.innerHTML = "提交遇到点问题，您可直接拨打招商热线 " +
            '<a href="tel:13612832188" style="color:var(--teal);font-weight:700;">136-1283-2188</a>';
          hint.classList.remove("ok");
          btn.disabled = false;
          btn.textContent = "重新提交";
        });
    });
  }
})();
