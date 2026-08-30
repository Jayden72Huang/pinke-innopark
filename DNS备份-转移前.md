# pinkesz.cn DNS 解析备份（域名跨账号转移前）

> 备份时间：2026-08-31 02:01
> 用途：域名从 HackerTrip 账号转移到新账号前的兜底记录。
> 若转移后解析丢失，照此表在 DNSPod 重建即可。

## 必须保留的记录

| 主机记录 | 类型 | 记录值 | 线路 | TTL | 用途 |
|---|---|---|---|---|---|
| `@` | A | `115.159.211.15` | 默认 | 600 | 裸域指向服务器（301 跳 www） |
| `www` | A | `115.159.211.15` | 默认 | 600 | **主站，丢了站就打不开** |
| `_dnsauth` | TXT | `20260829180044cnp5wwlp2gyqpje0ceypgmkprmh71ua` | 默认 | 600 | 腾讯云 SSL 证书域名验证 |

## NS（域名服务器，转移后应保持不变）

```
loaf.dnspod.net.
cheryl.dnspod.net.
```

## 无记录项（确认过，转移后也应为空）

MX、SPF/TXT（根域）、CAA、www 的 CNAME —— 当前均无。
> 注意：以后开企业域名邮箱会新增 MX / SPF / DKIM / DMARC。

## 转移后的验证清单

```bash
# 1. 解析是否还在
for h in pinkesz.cn www.pinkesz.cn; do
  echo -n "$h → "
  curl -s -H "accept: application/dns-json" \
    "https://cloudflare-dns.com/dns-query?name=$h&type=A" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print(' | '.join(x['data'] for x in d.get('Answer',[])) or '❌ 丢失')"
done

# 2. 证书验证 TXT 是否还在（丢了会影响证书续期）
curl -s -H "accept: application/dns-json" \
  "https://cloudflare-dns.com/dns-query?name=_dnsauth.pinkesz.cn&type=TXT" | grep -o '2026[0-9a-z]*'

# 3. 站点可用性
curl -s -o /dev/null -w "%{http_code}\n" https://www.pinkesz.cn/
```

## 转移前基线

- `https://www.pinkesz.cn/` → **200**
- 证书有效期至 2026-11-27
- ICP 备案号：粤ICP备2026122913号-1
