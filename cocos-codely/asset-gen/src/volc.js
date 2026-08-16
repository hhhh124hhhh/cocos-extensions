'use strict';
// 火山方舟（Volcengine Ark）文生图封装。
// 与你本机 WorkBuddy 的 ImageGen 同后端（均为火山），dsh 独立进程直连火山 API。
//
// Key（按优先级，任选其一）：
//   VOLC_ARK_API_KEY  >  VOLCENGINE_API_KEY
// 图像端点（VOLC_IMAGE_ENDPOINT / VOLCENGINE_IMAGE_ENDPOINT）：
//   - 接入点 ID（ep-xxxx）  → 【推荐】固定 POST https://ark.cn-beijing.volces.com/api/v3/images/generations，
//                             并把该 ep- ID 作为 model 字段值（本账号无模型名直调权限，必须走接入点）。
//   - 完整 URL             → 直接 POST 该 URL（需另配 VOLC_IMAGE_MODEL 指定模型名）。
//   - 缺省                → 抛错提示配置接入点。
// 实测可用端点（2026-08-15 验证）：
//   ep-20260320081042-cz2rc  → 返回 doubao-seedream-5-0，成功出图。
//   模型名 doubao-seedream-5.0-lite-260128 / 5.0-pro-260128 直调 → InvalidEndpointOrModel.NotFound（账号未开通）。
// 自动从候选 .env 注入（若存在且不覆盖已 export 的 env）：
//   ./asset-gen/.env 、 ~/.claude/skills/volcengine-generation/.env 、 ~/.arkcli/.env

const https = require('https');
const fs = require('fs');
const path = require('path');

// 方舟图像端点固定路径（无论传接入点 ID 还是模型名都 POST 到这里）
const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
// 仅在“完整 URL 端点 + 显式 VOLC_IMAGE_MODEL”高级模式下作为模型名（本账号直调会 404，慎用）
const DEFAULT_MODEL = 'doubao-seedream-5.0-lite-260128';
// 实测可用接入点（2026-08-15 验证出图成功）：本账号仅 ep- 接入点能出图，模型名直调必 404。
// 作为唯一可靠兜底——任何 env 配置混乱都回退到该 ep-，绝不走模型名直调。
const FALLBACK_ENDPOINT = 'ep-20260320081042-cz2rc';

// 零依赖加载 .env：读取后仅补充缺失的 env 变量（不覆盖已 export 的）。
function loadEnvCandidates() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(home, '.claude', 'skills', 'volcengine-generation', '.env'),
    path.join(home, '.arkcli', '.env'),
  ];
  for (const f of candidates) {
    if (!f || !fs.existsSync(f)) continue;
    try {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const k = m[1];
        const v = m[2].trim().replace(/^["']|["']$/g, '');
        if (process.env[k] === undefined) process.env[k] = v;
      }
    } catch (_) { /* ignore unreadable .env */ }
  }
}
loadEnvCandidates();

// 解析出图目标：返回 { url, model }
// 方舟图像 API 统一 POST 到 DEFAULT_BASE；model 字段填接入点 ID（ep-）或模型名。
// 核心约束（2026-08-15 验证）：本账号仅 ep- 接入点能出图，模型名直调必返回 NotFound。
// 因此任何无法明确导向 ep- 的配置，一律回退 FALLBACK_ENDPOINT，绝不走模型名直调。
function resolveTarget() {
  const rawEp = process.env.VOLC_IMAGE_ENDPOINT || process.env.VOLCENGINE_IMAGE_ENDPOINT || '';
  const ep = rawEp.trim();
  // 接入点 ID：直接作为 model 字段值（本账号唯一可用的出图路径）
  if (/^ep-/i.test(ep)) {
    return { url: DEFAULT_BASE, model: ep };
  }
  // 完整 URL 端点 + 显式 VOLC_IMAGE_MODEL：仅高级场景（自托管模型）使用
  if (/^https?:\/\//i.test(ep)) {
    const m = process.env.VOLC_IMAGE_MODEL;
    if (m) return { url: ep, model: m };
    // 给了 URL 却没给模型名 → 本账号模型名直调会 404，回退到已验证的 ep- 接入点
    return { url: DEFAULT_BASE, model: FALLBACK_ENDPOINT };
  }
  if (process.env.VOLC_IMAGE_MODEL) {
    // 显式模型名直调（本账号会 404，但尊重用户显式意图）
    return { url: DEFAULT_BASE, model: process.env.VOLC_IMAGE_MODEL };
  }
  // 缺省：回退到已验证的 ep- 接入点，避免默认 DEFAULT_MODEL 直调 404
  return { url: DEFAULT_BASE, model: FALLBACK_ENDPOINT };
}

function genImage(opts) {
  const apiKey = process.env.VOLC_ARK_API_KEY || process.env.VOLCENGINE_API_KEY;
  if (!apiKey) {
    throw new Error(
      '未找到火山方舟 API Key。请设置 VOLC_ARK_API_KEY 或 VOLCENGINE_API_KEY ' +
      '（或放一份含 VOLCENGINE_API_KEY 的 .env 到 ~/.claude/skills/volcengine-generation/.env）。'
    );
  }
  const { url, model } = resolveTarget();
  const width = opts.width || 1024;
  const height = opts.height || 1024;

  // 方舟原生文生图 payload（非 OpenAI 格式：无 messages/response_format/size）
  const payload = {
    req_key: 'high_aes_general',
    model,
    prompt: opts.prompt,
    width,
    height,
    use_prompt_embed: true,
    return_url: true,
    n: 1,
  };
  if (opts.negative_prompt) payload.negative_prompt = opts.negative_prompt;
  if (opts.style) payload.style = opts.style;

  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return reject(new Error('火山 endpoint 非法: ' + url));
    }
    const req = https.request(
      u,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`火山图像 API HTTP ${res.statusCode}: ${text.slice(0, 600)}`));
          }
          try {
            const json = JSON.parse(text);
            const item = (json.data && json.data[0]) || {};
            const imgUrl = item.url || item.image_url;
            if (imgUrl) return fetchUrl(imgUrl).then(resolve, reject);
            if (item.b64_json) return resolve(Buffer.from(item.b64_json, 'base64'));
            return reject(new Error('火山图像 API 返回无图像数据: ' + text.slice(0, 300)));
          } catch (e) {
            return reject(new Error('解析火山响应失败: ' + e.message + ' / ' + text.slice(0, 300)));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : require('http');
    client.get(u, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`拉取图像 URL HTTP ${res.statusCode}`));
        }
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

module.exports = { genImage, resolveTarget };
