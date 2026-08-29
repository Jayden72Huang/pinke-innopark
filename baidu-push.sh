#!/usr/bin/env bash
# 百度普通收录「主动推送」脚本
#
# 用法：
#   ./baidu-push.sh                          # 从 sitemap.xml 自动提取全站 URL 推送
#   ./baidu-push.sh https://x.com/a /b.html  # 只推指定 URL（相对路径会自动补全站点前缀）
#
# 依赖环境变量（放 .env，务必确认 .env 已在 .gitignore 里）：
#   BAIDU_SITE   站点，如 https://www.example.com（协议和 www 必须与站长平台登记的完全一致）
#   BAIDU_TOKEN  搜索资源平台 → 数据提交 → 普通收录 → API提交 → 准入密钥
#
# ⚠️ token 泄露会被人盗刷配额并连累站点信誉，绝不要硬编码进脚本或提交到 git。

set -euo pipefail

# ---- 加载配置 ----
ENV_FILE="${ENV_FILE:-.env}"
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

: "${BAIDU_SITE:?请设置 BAIDU_SITE，例如 https://www.example.com}"
: "${BAIDU_TOKEN:?请设置 BAIDU_TOKEN（搜索资源平台的准入密钥）}"

SITE="${BAIDU_SITE%/}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# ---- 收集要推送的 URL ----
if [ $# -gt 0 ]; then
  for u in "$@"; do
    case "$u" in
      http*) echo "$u" ;;
      /*)    echo "${SITE}${u}" ;;
      *)     echo "${SITE}/${u}" ;;
    esac
  done > "$TMP"
else
  echo "未指定 URL，从 ${SITE}/sitemap.xml 提取…" >&2
  curl -sS --max-time 30 "${SITE}/sitemap.xml" \
    | grep -oE '<loc>[^<]+</loc>' \
    | sed -E 's|</?loc>||g' \
    | sort -u > "$TMP"
fi

COUNT=$(wc -l < "$TMP" | tr -d ' ')
[ "$COUNT" -eq 0 ] && { echo "没有可推送的 URL，退出。" >&2; exit 1; }

# ---- 校验：URL 必须与 site 同源，否则百度返回 not_same_site ----
BAD=$(grep -cv "^${SITE}" "$TMP" || true)
if [ "$BAD" -gt 0 ]; then
  echo "⚠️  有 ${BAD} 条 URL 前缀与 BAIDU_SITE(${SITE}) 不一致，会被判 not_same_site：" >&2
  grep -v "^${SITE}" "$TMP" | head -5 >&2
  echo "   常见原因：sitemap 里写的是裸域但站长平台登记的是 www（或反之）。" >&2
  exit 1
fi

echo "准备推送 ${COUNT} 条 URL 到 ${SITE}" >&2

# ---- 推送（百度单次上限 2000 条，分批）----
SUCCESS_TOTAL=0
split -l 2000 "$TMP" "${TMP}.part."
for part in "${TMP}".part.*; do
  RESP=$(curl -sS -H 'Content-Type:text/plain' --data-binary "@${part}" \
    "http://data.zz.baidu.com/urls?site=${SITE}&token=${BAIDU_TOKEN}")
  echo "$RESP"

  # 解析结果
  if command -v python3 >/dev/null; then
    python3 - "$RESP" <<'PY'
import json, sys
try:
    d = json.loads(sys.argv[1])
except Exception:
    print("⚠️  返回非 JSON，检查 token 或网络", file=sys.stderr); sys.exit(0)
if "success" in d:
    print(f"  ✅ 成功 {d['success']} 条，当天剩余配额 {d.get('remain','?')}", file=sys.stderr)
for k, hint in (("not_same_site", "URL 与 site 不匹配"),
                ("not_valid",     "URL 格式非法")):
    if d.get(k):
        print(f"  ⚠️  {hint}: {d[k]}", file=sys.stderr)
if "error" in d:
    print(f"  ❌ 错误 {d['error']}: {d.get('message','')}", file=sys.stderr)
PY
  fi
  SUCCESS_TOTAL=$((SUCCESS_TOTAL + 1))
  rm -f "$part"
done

echo "完成，共 ${SUCCESS_TOTAL} 批。" >&2
echo "提示：推送成功 ≠ 立即收录，一般 2~3 天。一周后用 site:${SITE#https://} 复查。" >&2
