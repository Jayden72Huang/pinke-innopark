/* 留资接口 —— Vercel Serverless Function
 *
 * 前端表单 POST /api/lead {name, phone, area, note, page}
 * 按配置把线索送进飞书。所有密钥放 Vercel 环境变量，不进前端、不进 git。
 *
 * 两种接入方式（任选其一或都配）：
 *
 * A) 飞书群机器人（最快，1 个变量）
 *    群设置 → 群机器人 → 添加「自定义机器人」→ 复制 Webhook 地址
 *    环境变量：
 *      FEISHU_WEBHOOK      = https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx
 *      FEISHU_SIGN_SECRET  = （可选）若机器人开启了「签名校验」，填那串密钥
 *
 * B) 飞书多维表格（结构化、可跟进，4 个变量）
 *    创建企业自建应用拿到 app_id/app_secret，并给应用开通多维表格读写权限、
 *    把应用加入多维表格协作者。表格需含字段：称呼/手机号/需求面积/备注/来源页/提交时间
 *    环境变量：
 *      FEISHU_APP_ID
 *      FEISHU_APP_SECRET
 *      FEISHU_BITABLE_APP_TOKEN   （多维表格 URL 里的 app token）
 *      FEISHU_BITABLE_TABLE_ID    （表格 URL 里的 table id）
 */

const crypto = require("crypto");

function genSign(secret, timestamp) {
  // 飞书加签：以 `${timestamp}\n${secret}` 为 key 对空串做 HMAC-SHA256，再 base64
  const str = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac("sha256", str).update("").digest();
  return hmac.toString("base64");
}

async function sendWebhook(webhook, secret, lead) {
  const lines = [
    "🟢 品客小镇·青创城 — 新留资线索",
    `称呼：${lead.name}`,
    `手机：${lead.phone}`,
    `需求面积：${lead.area || "未填"}`,
    `行业/备注：${lead.note || "未填"}`,
    `来源页：${lead.page || ""}`,
    `时间：${lead.time}`,
  ];
  const body = { msg_type: "text", content: { text: lines.join("\n") } };
  if (secret) {
    const ts = Math.floor(Date.now() / 1000);
    body.timestamp = String(ts);
    body.sign = genSign(secret, ts);
  }
  const r = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (j.code && j.code !== 0) throw new Error("feishu webhook: " + JSON.stringify(j));
}

async function sendBitable(env, lead) {
  // 1) 拿 tenant_access_token
  const tr = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  });
  const tj = await tr.json();
  if (!tj.tenant_access_token) throw new Error("feishu token: " + JSON.stringify(tj));
  // 2) 写入一条记录
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_BITABLE_APP_TOKEN}/tables/${env.FEISHU_BITABLE_TABLE_ID}/records`;
  const fields = {
    "称呼": lead.name,
    "手机号": lead.phone,
    "需求面积": lead.area || "",
    "备注": lead.note || "",
    "来源页": lead.page || "",
    "提交时间": lead.time,
  };
  const rr = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tj.tenant_access_token },
    body: JSON.stringify({ fields }),
  });
  const rj = await rr.json();
  if (rj.code && rj.code !== 0) throw new Error("feishu bitable: " + JSON.stringify(rj));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method not allowed" });
    return;
  }
  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body || "{}");
    body = body || {};
    const lead = {
      name: String(body.name || "").slice(0, 40),
      phone: String(body.phone || "").slice(0, 20),
      area: String(body.area || "").slice(0, 60),
      note: String(body.note || "").slice(0, 200),
      page: String(body.page || "").slice(0, 200),
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    };
    if (!lead.name || !/^1[3-9]\d{9}$/.test(lead.phone)) {
      res.status(400).json({ ok: false, error: "invalid name or phone" });
      return;
    }

    const env = process.env;
    const tasks = [];
    if (env.FEISHU_BITABLE_APP_TOKEN && env.FEISHU_APP_ID) tasks.push(sendBitable(env, lead));
    if (env.FEISHU_WEBHOOK) tasks.push(sendWebhook(env.FEISHU_WEBHOOK, env.FEISHU_SIGN_SECRET, lead));

    if (tasks.length === 0) {
      // 还没配任何飞书变量：记录日志、仍返回成功，避免前端报错
      console.log("[lead:unconfigured]", lead);
      res.status(200).json({ ok: true, note: "received (feishu not configured yet)" });
      return;
    }
    await Promise.all(tasks);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[lead:error]", err);
    res.status(500).json({ ok: false, error: "submit failed" });
  }
};
