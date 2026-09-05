# pinkesz.cn SEO / GEO 进度与基线

> 基线时间：2026-08-30 05:00（站点当日迁至国内并完成备案号上线）
> 第二阶段：2026-09-06（单页站 → 10 页，长尾落地页上线）
> 相关 skill：`/seo-china`（收录）、`/geo-china`（AI 可见性）、`/seo-geo-content-china`（写文章）

---

## 〇、2026-09-06 更新：长尾落地页上线

### 诊断（服务器 7 天全量日志，已排除本机 223.74.* 自测）

| 爬虫 | 来访 | 判读 |
|---|---|---|
| Googlebot | 1183 | 海外自主发现 |
| GPTBot / OAI-SearchBot | 752 | 同上 |
| ClaudeBot / PerplexityBot | 462 | 同上 |
| Applebot | 272 | 同上 |
| **Bytespider** | **124** | ✅ 头条链路已通，豆包可见性有保障 |
| **bingbot** | **4** | ⚠️ Kimi/DeepSeek 的数据源，偏少 |
| **Baiduspider** | **0** | ❌ 连 robots.txt 都没抓过 |

**排除的死因**（不是这些）：
- 站点验证爬虫 `112.34.110.18` 于 8/30 抓走验证文件（200），验证链路正常
- 百度渲染 IP `220.181.3.150` 于 8/31、9/4 多次抓首页（200），说明百度能连上
- 主机安全 YJ-FIREWALL 封了 276 个 IP，含 2 个百度段（`123.125.6.94`、`180.76.179.77`），
  但 **iptables 计数器均为 0**，按 `seo-china` 1.5 节判据不是元凶（仍建议加白名单，见待办）

**真实瓶颈**：单页站全站只有 1 个 URL。百度对新站抓取预算本就极低，
只给它一个页面等于没有可收录的内容；长尾词没有任何落地页去接；
AI 摘录也只能反复摘同一段。

### 做了什么

| 动作 | 说明 |
|---|---|
| **新增 9 个长尾落地页** | `/shenzhenbei-office/`、`/minzhi-office/`、`/register-company/`、`/office-price/`、`/small-office/`、`/whole-floor-office/`、`/ecommerce-live-office/`、`/smart-hardware-office/`、`/pinke-apartment/` |
| 页面生成器 | `scripts/pages_data.py`（内容）+ `scripts/build-pages.py`（模板），改内容不用碰 HTML |
| 每页结构化数据 | WebPage + BreadcrumbList + FAQPage，事实字段填全（AI 提取结构化数据比读正文可靠） |
| 首页内链入口 | FAQ 之后新增「你在找哪一种办公室？」9 张卡片，让爬虫从首页发现全部落地页 |
| sitemap | 1 条 → 10 条 URL，lastmod 按各自源文件真实 mtime（不是全站统一时间戳） |
| llms.txt | 加「详细页面（可直接引用）」导航段 + 公安备案号 |
| **事实一致性修正** | 首页 hero 原写「5 栋 / 180+ 车位」，与全站其余位置的「6 栋 / 186 位」冲突 —— AI 引用错数字的代价比不被引用更高，已统一 |
| 404 页 | 新增 `404.html`（多页站需要，避免软 404） |
| 部署脚本 | `deploy.sh` 构建时自动生成落地页；IndexNow 改为推 sitemap 全量 URL |

### 推送结果（2026-09-06）

- 百度主动推送：`{"remain":0,"success":10}` —— 10 条全部接收，当日配额用尽
- IndexNow：HTTP 200，10 条 URL（Bing / 神马 → 同时喂 Kimi、DeepSeek、夸克、千问）
- 线上验证：10 个 URL 全部 200，Baiduspider UA 可正常抓取

### 复查节点

- **2026-09-09 前后**：查 Baiduspider 是否开始抓落地页（`grep -i baiduspider` 日志）
- **2026-09-13 前后**：百度 `site:www.pinkesz.cn` 看收录条数
- **2026-10-04 前后**：GEO 实测（第三节清单），此时索引与语料已更新 2~4 周

---

## 一、当前基线（2026-08-30 05:00）

### 爬虫来访（Nginx 日志实测）

| 爬虫 | 次数 | 说明 |
|---|---|---|
| GPTBot | 14 | 上线 1 小时内自主发现（CT 证书透明日志） |
| **Bytespider** | **11** | ⭐⭐ 头条接入后持续抓取（36.110.214.x / 36.110.131.x），**豆包链路已通** |
| Applebot | 10 | 自主发现 |
| OAI-SearchBot | 8 | 同 GPTBot |
| **bingbot** | **4** | ⭐ IndexNow 推送后真实来访 |
| ClaudeBot | 2 | 自主发现 |
| Baiduspider | **0** | 已排除本机自测；主动推送后一般 2~3 天才来 |
| Sogou | **0** | 刚人工提交 URL，等抓取 |

> 统计口径：已用 `grep -v "^223\.74\."` 排除本机自测请求，避免把自己的
> Baiduspider UA 测试计入真实爬虫。

**结论**：海外引擎自主发现，国内引擎必须主动提交才会来 —— 与 `seo-china` 的核心论点一致。

### 收录状态

| 引擎 | `site:` 查询 | 备注 |
|---|---|---|
| Bing | 0 条 | 已推 IndexNow，bingbot 已来，等索引 |
| 百度 | 未查（需人工） | 已主动推送 2 次，一般 2~3 天出结果 |

### 已接入的通道

| 通道 | 状态 |
|---|---|
| 百度站点验证 | ✅ 已通过（文件验证） |
| 百度主动推送 API | ✅ 已推 2 次，日配额 10 条（剩 8） |
| 百度手动提交 | ✅ 可用（与 API **共享**同一配额池，无需另做） |
| 百度 sitemap 提交 | ⏸ 配额 0（**独立配额池**，需填主体备案号）——但本站是单页，
  唯一 URL 已由 API 推送覆盖，**此项非必需** |
| **头条搜索站点验证** | ✅ **已通过**（HTML 标签，一次即过） |
| **头条 sitemap 提交** | ✅ **已提交成功** → 喂豆包 |
| IndexNow | ✅ 已推 3 次（Bing / 神马 生效） |
| **搜狗 URL 提交** | ✅ 已人工提交（该平台**不支持 sitemap**，且有验证码，无法自动化） |
| 神马 / Bing 站长 | ⏸ 待提交 |

---

## 二、复查方法

### 每天/每周跑一次

```bash
# 1. 爬虫来访统计（重点看 Baiduspider、Bytespider 是否出现）
ssh root@115.159.211.15 'awk -F\" "{print \$6}" /var/log/nginx/pinkesz.access.log \
  | grep -oiE "baiduspider|bingbot|bytespider|sogou|yisou|gptbot|claudebot" \
  | sort | uniq -c | sort -rn'

# ⚠️ 注意排除自测：来自本机 IP 的 Baiduspider UA 不算
ssh root@115.159.211.15 'grep -i baiduspider /var/log/nginx/pinkesz.access.log | grep -v 223.74'

# 2. 内容更新后一键上线并通知搜索引擎
./deploy.sh
```

### 收录查询（浏览器手动）

- 百度：搜 `site:www.pinkesz.cn`
- 品牌词：搜 `品客小镇 青创城`
- 长尾词：搜 `深圳北站 办公室出租`、`龙华民治 办公室出租`

---

## 三、GEO 实测清单（需人工，建议 2~4 周后做首测）

到各 AI 逐个提问，**重点记录「引用来源」那一列** —— 它直接告诉你该往哪投入。

### 提问清单

| 类型 | 问题 |
|---|---|
| 品牌词 | 品客小镇青创城怎么样？ |
| 类目词 | 深圳北站附近有哪些甲级写字楼可以注册公司？ |
| 场景词 | 我想在深圳龙华租一个 200 平的办公室，有什么推荐？ |
| 价格词 | 深圳北站附近办公室租金大概多少钱一平？ |

### 记录表

| 引擎 | 提到品牌 | 信息准确 | 错在哪 | 引用来源 |
|---|---|---|---|---|
| 豆包 | | | | |
| 元宝 | | | | |
| 夸克 | | | | |
| 通义千问 | | | | |
| Kimi | | | | |
| DeepSeek | | | | |
| 文心一言 | | | | |

> ⚠️ 除了「有没有提到我」，务必记录**「说得对不对」**。
> Nature Communications 2025 研究：50~90% 的 LLM 回答未被其引用来源完全支持——
> AI 很可能说错你的价格、地址。发现错误要去它引用的源头修正。

---

## 四、待办（需要账号/人工）

| 优先级 | 事项 | 喂给谁 | 入口 |
|---|---|---|---|
| ⭐1 | **重置百度准入密钥**（token 曾在截图中明文暴露） | 防配额被盗刷 | 普通收录页「修改准入密钥」 |
| ⭐1 | **Nginx 两处改动**（2026-09-06 因权限未执行，见下方代码块） | 防 robots.txt 撞 301；消除软 404 | ssh 服务器 |
| ⭐2 | 百度填**主体备案号** `粤ICP备2026122913号` | **开 sitemap 配额** —— 现在有 10 条 URL，日配额 10 条已见底，此项优先级上调 | 站点属性页 |
| ⭐2 | **Bing 站长平台注册** | Kimi + DeepSeek 的数据源，bingbot 才来 4 次 | bing.com/webmasters |
| 3 | 神马站长平台提交 | 通义千问 + 夸克 | zhanzhang.sm.cn |
| 3 | 头条搜索：把 9 个落地页 URL 再提交一次 | 豆包 | zhanzhang.toutiao.com |
| 4 | 搜狗：逐条提交落地页 URL（有验证码，需人工） | 元宝 + 微信搜一搜 | zhanzhang.sogou.com |
| 6 | 高德 key 白名单换成 pinkesz.cn | 防 key 裸奔 | console.amap.com |
| 7 | 腾讯云主机安全加爬虫白名单 | 防误封（计数器为 0，隐患非紧急） | console.cloud.tencent.com/cwp |
| ~~⭐2~~ | ~~头条搜索站长平台提交~~ | ✅ **已完成** | — |
| ~~2~~ | ~~搜狗 URL 提交~~ | ✅ **已完成**（首页） | — |
| ~~8~~ | ~~公安网备案~~ | ✅ **已完成** 2026-09-06，粤公网安备44030002016491号 | — |

### ⭐ 待执行：Nginx 两处改动

2026-09-06 尝试执行时被本地权限策略拦截，需手动跑。配置已备份为
`/etc/nginx/sites-enabled/pinkesz.conf.bak-20260906`。

**改动 1** —— 80 端口 server 块内，紧跟站长验证文件那段之后加：

```nginx
    # robots.txt / sitemap.xml / llms.txt 明文直出，不跳 HTTPS：
    # 爬虫第一件事就是取 robots.txt，若撞上 301 可能直接判定站点不可抓
    location ~ ^/(robots\.txt|sitemap\.xml|llms\.txt)$ {
        root /var/www/pinkesz;
    }
```

**改动 2** —— HTTPS 主站块，把 `location /` 换成：

```nginx
    location / {
        try_files $uri $uri/ =404;
        expires -1;          # HTML 不缓存（静态资源由上面各自的 location 覆盖）
    }

    # 多页站后不再把未知 URL 回落首页——软 404 会被搜索引擎判为低质重复
    error_page 404 /404.html;
    location = /404.html { internal; expires -1; }
```

改完执行 `nginx -t && systemctl reload nginx`，然后验证：

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://www.pinkesz.cn/robots.txt   # 期望 200，无跳转
curl -s -o /dev/null -w "%{http_code}\n" https://www.pinkesz.cn/this-page-does-not-exist/    # 期望 404
```

### 内容平台占位（GEO 第二条腿，需账号）

按 `geo-china` 的投入优先级：

1. **微信公众号** —— 元宝的主要语料源，腾讯生态闭环，外部爬虫抓不到
2. **知乎** —— 几乎所有国产 AI 都引用，回答已有高流量老问题
3. **头条号** —— 豆包直通车，同属字节
4. **百家号** —— 文心一言直通车

写作方法见 `/seo-geo-content-china`。
