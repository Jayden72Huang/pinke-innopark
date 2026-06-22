/* 留资云函数 —— 腾讯云 CloudBase 云函数
 *
 * 前端经 @cloudbase/js-sdk 的 app.callFunction({ name:"lead", data:{...} }) 调用。
 * 行为：①线索始终写入云数据库 leads 集合（控制台可见，不丢线索）
 *      ②若配置了飞书环境变量，再额外推送到飞书群/多维表格
 *
 * 飞书环境变量（可选，在 CloudBase 控制台「云函数→lead→环境变量」或用 CLI 设置）：
 *   A) 群机器人：FEISHU_WEBHOOK（必填）、FEISHU_SIGN_SECRET（开启签名校验才填）
 *   B) 多维表格：FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_BITABLE_APP_TOKEN、FEISHU_BITABLE_TABLE_ID
 */

const crypto = require("crypto");
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();

const COLLECTION = "leads";

function genSign(secret, timestamp) {
  const str = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", str).update("").digest().toString("base64");
}

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (e) {
    // 集合已存在会报错，忽略即可
  }
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
  const tr = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  });
  const tj = await tr.json();
  if (!tj.tenant_access_token) throw new Error("feishu token: " + JSON.stringify(tj));
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

exports.main = async (event = {}) => {
  // 兼容 callFunction（event 即 data）与 HTTP 触发（event.body 为字符串）
  let data = event;
  if (typeof event.body === "string") {
    try { data = JSON.parse(event.body || "{}"); } catch (_) { data = {}; }
  }

  const lead = {
    name: String(data.name || "").slice(0, 40),
    phone: String(data.phone || "").slice(0, 20),
    area: String(data.area || "").slice(0, 60),
    note: String(data.note || "").slice(0, 200),
    page: String(data.page || "").slice(0, 200),
    time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  };

  if (!lead.name || !/^1[3-9]\d{9}$/.test(lead.phone)) {
    return { ok: false, error: "invalid name or phone" };
  }

  try {
    // ① 始终写入云数据库（不丢线索）
    await ensureCollection();
    await db.collection(COLLECTION).add({ ...lead, createdAt: db.serverDate() });

    // ② 飞书推送（配置了才发；失败不影响入库）
    const env = process.env;
    const tasks = [];
    if (env.FEISHU_BITABLE_APP_TOKEN && env.FEISHU_APP_ID) tasks.push(sendBitable(env, lead));
    if (env.FEISHU_WEBHOOK) tasks.push(sendWebhook(env.FEISHU_WEBHOOK, env.FEISHU_SIGN_SECRET, lead));
    if (tasks.length) {
      await Promise.allSettled(tasks);
    }

    return { ok: true };
  } catch (err) {
    console.error("[lead:error]", err);
    return { ok: false, error: "submit failed" };
  }
};
