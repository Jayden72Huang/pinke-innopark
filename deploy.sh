#!/usr/bin/env bash
# 品客小镇·青创城 —— 一键部署 + 搜索引擎通知
#
#   ./deploy.sh            构建、上线、更新 sitemap 时间、推送百度 + IndexNow
#   ./deploy.sh --no-push  只上线，不通知搜索引擎（改样式等非内容改动时用）
#
# 依赖 .env（已在 .gitignore）：BAIDU_SITE / BAIDU_TOKEN

set -euo pipefail
cd "$(dirname "$0")"

SERVER="root@115.159.211.15"
REMOTE="/var/www/pinkesz"
SITE="https://www.pinkesz.cn"
PUSH=1
[ "${1:-}" = "--no-push" ] && PUSH=0

echo "▶ 1/5 构建 dist"
# 长尾落地页由 scripts/build-pages.py 从 scripts/pages_data.py 生成，同时重写 sitemap.xml
python3 scripts/build-pages.py
rm -rf dist && mkdir -p dist
cp index.html 404.html styles.css script.js robots.txt sitemap.xml llms.txt dist/
cp -R assets dist/assets
# 落地页：pages/<slug>/index.html → dist/<slug>/index.html
for d in pages/*/; do
  [ -d "$d" ] && cp -R "$d" "dist/$(basename "$d")"
done
# 站长平台验证文件 + IndexNow 密钥文件（存在才复制）
for f in baidu_verify_*.html *_verify_*.txt BingSiteAuth.xml; do
  [ -e "$f" ] && cp "$f" dist/ 2>/dev/null || true
done
if [ -f .indexnow-key ]; then
  K=$(cat .indexnow-key); [ -f "$K.txt" ] && cp "$K.txt" dist/
fi
find dist -name ".DS_Store" -delete

# 安全闸：绝不把密钥文件推上线
if ls dist | grep -qiE '^(\.env|config\.js|.*secret.*)$'; then
  echo "✗ dist 里混入了疑似密钥文件，已中止" >&2; exit 1
fi
echo "  $(find dist -type f | wc -l | tr -d ' ') 个文件, $(du -sh dist | cut -f1)"

echo "▶ 2/5 校验 sitemap"
# lastmod 由 build-pages.py 按各自源文件真实 mtime 写入（首页看 index.html，落地页看 pages_data.py）
echo "  $(grep -c '<loc>' dist/sitemap.xml) 条 URL"

echo "▶ 3/5 同步到服务器"
rsync -az --delete -e "ssh -o BatchMode=yes" dist/ "$SERVER:$REMOTE/"
ssh -o BatchMode=yes "$SERVER" "
  chown -R www-data:www-data $REMOTE
  find $REMOTE -type d -exec chmod 755 {} \;
  find $REMOTE -type f -exec chmod 644 {} \;
"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$SITE/")
echo "  线上首页: $CODE"
[ "$CODE" = "200" ] || { echo "✗ 首页异常，中止推送" >&2; exit 1; }

if [ "$PUSH" -eq 0 ]; then echo "▶ 跳过搜索引擎推送（--no-push）"; exit 0; fi

echo "▶ 4/5 百度主动推送"
if [ -f .env ] && grep -q '^BAIDU_TOKEN=.\+' .env; then
  ./baidu-push.sh 2>&1 | sed -E 's/token=[A-Za-z0-9]+/token=***/g' | sed 's/^/  /'
else
  echo "  ⚠ 跳过：.env 里没有 BAIDU_TOKEN"
fi

echo "▶ 5/5 IndexNow 推送（Bing / 神马 → 同时喂 Kimi、DeepSeek）"
if [ -f .indexnow-key ]; then
  KEY=$(cat .indexnow-key)
  # 从 sitemap 取全部 URL（含落地页），拼成 JSON 数组
  URLS=$(grep -oE "<loc>[^<]+</loc>" dist/sitemap.xml | sed -E 's|</?loc>||g' \
    | awk '{printf "%s\"%s\"", (NR>1?",":""), $0}')
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" --max-time 25 \
    -d "{\"host\":\"www.pinkesz.cn\",\"key\":\"$KEY\",\"keyLocation\":\"$SITE/$KEY.txt\",\"urlList\":[$URLS]}")
  echo "  HTTP $HTTP （200/202 = 已接受）"
else
  echo "  ⚠ 跳过：缺 .indexnow-key"
fi

echo ""
echo "✅ 完成。收录一般 2~3 天，一周后用 site:www.pinkesz.cn 复查。"
