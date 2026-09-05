#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
长尾落地页生成器 —— 从 scripts/pages_data.py 生成 pages/<slug>/index.html 与 sitemap.xml。

为什么要有落地页：单页站只有 1 个 URL，百度给新站的抓取预算本就极低，
长尾词没有任何页面去接；AI 摘录也只能摘同一段。每页对应一组真实提问句式，
既是百度的长尾入口，也是 AI 可引用的独立事实段落。

用法：python3 scripts/build-pages.py     （deploy.sh 会自动调用）
"""

import io, os, json, datetime, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from pages_data import PAGES, NAV_TITLES, PHONE, TEL, ADDR  # noqa: E402

SITE = "https://www.pinkesz.cn"
CSS_V = "16"

ORG_JSONLD = {
    "@type": "Organization",
    "name": "品客小镇·青创城",
    "alternateName": ["PINKE INNO CITY", "青创城", "品客小镇"],
    "url": SITE + "/",
    "telephone": "+86-136-1283-2188",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "民康路292号 品客小镇·青创城",
        "addressLocality": "深圳市龙华区",
        "addressRegion": "广东省",
        "postalCode": "518131",
        "addressCountry": "CN",
    },
}


def jsonld(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def head(p):
    url = "%s/%s/" % (SITE, p["slug"])
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "首页", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": NAV_TITLES[p["slug"]], "item": url},
        ],
    }
    faqpage = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in p["faqs"]
        ],
    }
    webpage = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": p["h1"],
        "url": url,
        "description": p["desc"],
        "inLanguage": "zh-CN",
        "isPartOf": {"@type": "WebSite", "name": "品客小镇·青创城", "url": SITE + "/"},
        "about": ORG_JSONLD,
        "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/assets/exterior-1.jpg"},
    }
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="keywords" content="{kw}" />
  <meta name="author" content="品客小镇·青创城" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
  <link rel="canonical" href="{url}" />
  <link rel="icon" href="/assets/logo.png" />

  <!-- 百度移动适配 -->
  <meta name="applicable-device" content="pc,mobile" />
  <meta name="MobileOptimized" content="width" />
  <meta name="HandheldFriendly" content="true" />
  <meta name="format-detection" content="telephone=yes" />
  <meta name="theme-color" content="#0b1220" />

  <!-- 地理位置（本地搜索 / 地图类 AI 引用） -->
  <meta name="geo.region" content="CN-44" />
  <meta name="geo.placename" content="深圳市龙华区民治街道" />
  <meta name="geo.position" content="22.6150;114.0410" />
  <meta name="ICBM" content="22.6150, 114.0410" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{site}/assets/exterior-1.jpg" />
  <meta property="og:site_name" content="品客小镇·青创城" />
  <meta property="og:locale" content="zh_CN" />

  <link rel="stylesheet" href="/styles.css?v={cssv}" />

  <script type="application/ld+json">
{webpage}
  </script>
  <script type="application/ld+json">
{breadcrumb}
  </script>
  <script type="application/ld+json">
{faq}
  </script>
</head>
<body>
""".format(
        title=html.escape(p["title"], quote=True),
        desc=html.escape(p["desc"], quote=True),
        kw=html.escape(p["keywords"], quote=True),
        url=url, site=SITE, cssv=CSS_V,
        webpage=jsonld(webpage), breadcrumb=jsonld(breadcrumb), faq=jsonld(faqpage),
    )


NAV = """  <header class="nav scrolled" id="nav">
    <div class="nav__inner">
      <a href="/" class="brand">
        <img class="brand__logo" src="/assets/logo.png" alt="品客小镇·青创城 logo" width="135" height="135" decoding="async" />
        <span class="brand__text">
          <strong>品客小镇<span class="dot">·</span>青创城</strong>
          <em>PINKE · INNO CITY</em>
        </span>
      </a>
      <nav class="nav__links" id="navLinks">
        <a href="/">首页</a>
        <a href="/shenzhenbei-office/">深圳北站办公室</a>
        <a href="/office-price/">租金价格</a>
        <a href="/register-company/">注册公司</a>
        <a href="/pinke-apartment/">品客公寓</a>
      </nav>
      <a href="tel:{tel}" class="nav__hotline">
        <span class="nav__hotline-label">招商热线：</span>
        <span class="nav__hotline-num">{phone}</span>
      </a>
      <button class="nav__toggle" id="navToggle" aria-label="菜单">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
""".format(tel=TEL, phone=PHONE)


FOOT = """  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <img class="brand__logo" src="/assets/logo.png" alt="品客小镇·青创城 logo" width="135" height="135" loading="lazy" decoding="async" />
        <div>
          <strong>品客小镇·青创城</strong>
          <em>深圳北站未来商务区 · 龙华甲级创客办公园区</em>
        </div>
      </div>
      <div class="footer__links">
        <a href="/">首页</a>
        <a href="/shenzhenbei-office/">深圳北站办公室</a>
        <a href="/minzhi-office/">龙华民治办公室</a>
        <a href="/office-price/">租金价格</a>
        <a href="/register-company/">注册公司</a>
        <a href="/pinke-apartment/">品客公寓</a>
      </div>
      <p class="footer__copy">© <span id="year">2026</span> 品客小镇·青创城　{addr}　招商热线 {phone}</p>
      <p class="footer__beian">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener nofollow">粤ICP备2026122913号-1</a>
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=44030002016491" rel="noreferrer nofollow" target="_blank">
          <img class="footer__beian-icon" src="/assets/beian-gongan.png" alt="公安备案图标" width="18" height="20" loading="lazy" decoding="async" />粤公网安备44030002016491号
        </a>
      </p>
    </div>
  </footer>

  <a href="tel:{tel}" class="fab" aria-label="拨打招商热线">
    <span class="fab__icon">📞</span>
    <span class="fab__text">立即咨询</span>
  </a>

  <!-- 百度自动推送：访客打开页面即把 URL 推给百度 -->
  <script>
  (function () {{
    var s = document.createElement('script'), c = document.getElementsByTagName('script')[0];
    s.src = location.protocol === 'https:'
      ? 'https://zz.bdstatic.com/linksubmit/push.js'
      : 'http://push.zhanzhang.baidu.com/push.js';
    c.parentNode.insertBefore(s, c);
  }})();
  </script>
  <!-- 头条搜索自动收录：喂豆包（id 必须是 ttzz，脚本内部靠它取参数） -->
  <script>
  (function () {{
    var el = document.createElement("script");
    el.src = "https://lf1-cdn-tos.bytegoofy.com/goofy/ttzz/push.js?b386d974cf340224804cbf07ce4e20c35e172191e6750dd880f82c6798d018fdfd9a9dcb5ced4d7780eb6f3bbd089073c2a6d54440560d63862bbf4ec01bba3a";
    el.id = "ttzz";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(el, s);
  }})(window)
  </script>
</body>
</html>
""".format(addr=ADDR, phone=PHONE, tel=TEL)


def render(p):
    facts = "".join(
        '\n        <div class="lp-fact"><b>%s</b><span>%s</span></div>' % (b, s)
        for b, s in p["facts"]
    )
    secs = "".join(
        '\n      <section class="lp-sec">\n        <h2>%s</h2>%s\n      </section>' % (s["h2"], s["html"].rstrip())
        for s in p["sections"]
    )
    t = p["table"]
    rows = "".join(
        "\n            <tr>%s</tr>" % "".join("<td>%s</td>" % c for c in r)
        for r in t["rows"]
    )
    table = """
      <div class="lp-table-wrap">
        <table class="lp-table">
          <caption>{cap}</caption>
          <thead><tr>{th}</tr></thead>
          <tbody>{rows}
          </tbody>
        </table>
      </div>""".format(
        cap=t["caption"],
        th="".join("<th>%s</th>" % h for h in t["headers"]),
        rows=rows,
    )
    faqs = "".join(
        "\n        <h3>%s</h3>\n        <p>%s</p>" % (q, a) for q, a in p["faqs"]
    )
    related = "".join(
        '\n          <li><a href="/%s/">%s →</a></li>' % (s, NAV_TITLES[s])
        for s in p["related"]
    )
    body = """  <main class="lp">
    <div class="container">
      <nav class="lp-crumb" aria-label="面包屑"><a href="/">首页</a> <span>›</span> {crumb}</nav>
      <span class="kicker">{kicker}</span>
      <h1>{h1}</h1>
      <p class="lp-lead">{lead}</p>
      <div class="lp-facts">{facts}
      </div>
{secs}
{table}

      <section class="lp-faq">
        <h2>常见问题</h2>{faqs}
      </section>

      <section class="lp-cta">
        <div>
          <h2>预约看房 · 获取最新房源与报价</h2>
          <p>{addr}　服务时间 周一至周日 09:00–18:00</p>
        </div>
        <div class="lp-cta__btns">
          <a href="tel:{tel}" class="btn btn--primary">☎ {phone}</a>
          <a href="/#contact" class="btn btn--ghost">在线留资 →</a>
        </div>
      </section>

      <section class="lp-related">
        <h2>你可能还想了解</h2>
        <ul>{related}
        </ul>
      </section>
    </div>
  </main>

""".format(
        crumb=NAV_TITLES[p["slug"]], kicker=p["kicker"], h1=p["h1"], lead=p["lead"],
        facts=facts, secs=secs, table=table, faqs=faqs, related=related,
        addr=ADDR, tel=TEL, phone=PHONE,
    )
    return head(p) + NAV + body + FOOT


def build_sitemap(page_date):
    """首页 lastmod 用 index.html 真实 mtime，落地页用 pages_data.py 的 mtime。"""
    home_date = datetime.date.fromtimestamp(
        os.path.getmtime(os.path.join(ROOT, "index.html"))
    ).isoformat()
    parts = ["""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>{site}/</loc>
    <lastmod>{d}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>{site}/assets/exterior-1.jpg</image:loc>
      <image:title>品客小镇·青创城 园区外观</image:title>
    </image:image>
    <image:image>
      <image:loc>{site}/assets/office-1.jpg</image:loc>
      <image:title>品客小镇·青创城 办公室实景</image:title>
    </image:image>
    <image:image>
      <image:loc>{site}/assets/apt-1room-living.jpg</image:loc>
      <image:title>品客公寓 一房两厅实景</image:title>
    </image:image>
  </url>""".format(site=SITE, d=home_date)]
    for p in PAGES:
        parts.append("""  <url>
    <loc>{site}/{slug}/</loc>
    <lastmod>{d}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>""".format(site=SITE, slug=p["slug"], d=page_date))
    parts.append("</urlset>\n")
    return "\n".join(parts)


def main():
    page_date = datetime.date.fromtimestamp(
        os.path.getmtime(os.path.join(HERE, "pages_data.py"))
    ).isoformat()
    out_root = os.path.join(ROOT, "pages")
    for p in PAGES:
        d = os.path.join(out_root, p["slug"])
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(render(p))
        print("  ✓ /%s/  %s" % (p["slug"], p["h1"]))
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(build_sitemap(page_date))
    print("  ✓ sitemap.xml（%d 条 URL，落地页 lastmod=%s）" % (len(PAGES) + 1, page_date))


if __name__ == "__main__":
    main()
