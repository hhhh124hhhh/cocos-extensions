'use strict';
// [fork] 内置 AI 出图工具（原 asset-gen 独立进程 @9180 已并入本扩展，单端口 8765）。
// 零 Cocos 运行时依赖：仅依赖 VOLC_ARK_API_KEY（火山方舟）写 PNG/JPEG + .meta 落盘。
// 由 createImageGenTools({ createSchema, getRuntimeContext }) 注入 tool-registry。

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// 火山方舟（Volcengine Ark）文生图封装
// ---------------------------------------------------------------------------
const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DEFAULT_MODEL = 'doubao-seedream-5.0-lite-260128';
// 实测可用接入点（2026-08-15 验证出图成功）：本账号仅 ep- 接入点能出图，模型名直调必 404。
// 用户必须配置 VOLC_IMAGE_ENDPOINT 环境变量（火山方舟接入点 ID）

function loadEnvCandidates() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(__dirname, '..', '..', '.env'),
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

function resolveTarget(opts = {}) {
  // 面板配置优先（分享时接收方填自己的接入点）；其次环境变量；最后内置兜底（仅限本账号）。
  const cfgEp = (opts.endpoint || '').trim();
  const cfgModel = (opts.model || '').trim();
  if (cfgEp) {
    if (/^ep-/i.test(cfgEp)) return { url: DEFAULT_BASE, model: cfgEp };
    if (/^https?:\/\//i.test(cfgEp)) return { url: cfgEp, model: cfgModel || process.env.VOLC_IMAGE_ENDPOINT || 'ep-YOUR_ENDPOINT' };
    return { url: DEFAULT_BASE, model: cfgModel || process.env.VOLC_IMAGE_ENDPOINT || 'ep-YOUR_ENDPOINT' };
  }
  if (cfgModel) return { url: DEFAULT_BASE, model: cfgModel };
  const rawEp = process.env.VOLC_IMAGE_ENDPOINT || process.env.VOLCENGINE_IMAGE_ENDPOINT || '';
  const ep = rawEp.trim();
  if (/^ep-/i.test(ep)) {
    return { url: DEFAULT_BASE, model: ep };
  }
  if (/^https?:\/\//i.test(ep)) {
    const m = process.env.VOLC_IMAGE_MODEL;
    if (m) return { url: ep, model: m };
    return { url: DEFAULT_BASE, model: process.env.VOLC_IMAGE_ENDPOINT || 'ep-YOUR_ENDPOINT' };
  }
  if (process.env.VOLC_IMAGE_MODEL) {
    return { url: DEFAULT_BASE, model: process.env.VOLC_IMAGE_MODEL };
  }
  return { url: DEFAULT_BASE, model: process.env.VOLC_IMAGE_ENDPOINT || 'ep-YOUR_ENDPOINT' };
}

function genImage(opts) {
  const apiKey = (opts && opts.apiKey) || process.env.VOLC_ARK_API_KEY || process.env.VOLCENGINE_API_KEY;
  if (!apiKey) {
    throw new Error(
      '未找到火山方舟 API Key。可在 Cocos MCP Bridge 扩展面板的 Settings 中填写「Volcengine API Key」，' +
      '或设置环境变量 VOLC_ARK_API_KEY / VOLCENGINE_API_KEY' +
      '（也可放一份含 VOLCENGINE_API_KEY 的 .env 到 ~/.claude/skills/volcengine-generation/.env）。'
    );
  }
  const { url, model } = resolveTarget(opts);
  const width = opts.width || 1024;
  const height = opts.height || 1024;

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
    const client = u.protocol === 'https:' ? https : http;
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

// ---------------------------------------------------------------------------
// Cocos Creator 资源落盘：写 PNG/JPEG + 手写 .meta（含 sprite-frame subMeta）
// ---------------------------------------------------------------------------
function uuidHex() {
  return crypto.randomUUID().replace(/-/g, '');
}

function imageSize(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) {
    if (buf.length < 24) throw new Error('PNG 文件过短');
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return jpegSize(buf);
  }
  throw new Error('非 PNG/JPEG 文件，无法读取尺寸');
}

function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return [w, h];
    }
    const len = buf.readUInt16BE(i + 2);
    if (len <= 0) throw new Error('JPEG 尺寸解析失败');
    i += 2 + len;
  }
  throw new Error('JPEG 尺寸解析失败');
}

function spriteMeta({ uuid, w, h, name }) {
  return {
    ver: '2.2.0',
    uuid,
    type: 'texture',
    wrapMode: 'clamp',
    filterMode: 'bilinear',
    premultiplyAlpha: false,
    packable: true,
    subMetas: {
      [name]: {
        uuid: `${uuid}@f9941`,
        type: 'sprite-frame',
        wrapMode: 'clamp',
        filterMode: 'bilinear',
        premultiplyAlpha: false,
      },
    },
    maxTextureSize: '2048',
    imageWidth: w,
    imageHeight: h,
  };
}

function writeAsset(targetDir, fileBase, buf) {
  fs.mkdirSync(targetDir, { recursive: true });
  const [w, h] = imageSize(buf);
  const uuid = uuidHex();
  const isPng = buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47;
  const ext = isPng ? 'png' : 'jpg';
  const imgPath = path.join(targetDir, `${fileBase}.${ext}`);
  const metaPath = path.join(targetDir, `${fileBase}.${ext}.meta`);
  fs.writeFileSync(imgPath, buf);
  fs.writeFileSync(metaPath, JSON.stringify(spriteMeta({ uuid, w, h, name: fileBase }), null, 2));
  return {
    pngPath: imgPath,
    metaPath,
    uuid,
    spriteFrameUuid: `${uuid}@f9941`,
    width: w,
    height: h,
  };
}

// ---------------------------------------------------------------------------
// 提示词组装 + 工具定义
// ---------------------------------------------------------------------------
function buildPrompt(a) {
  let p = a.prompt || '';
  if (a.style_anchor) p = `${a.style_anchor}，${p}`;
  if (a.ui_mode) {
    p += '，游戏 UI 图标，居中构图，透明背景，统一描边，清晰边缘，扁平或像素风';
  } else {
    p += '，透明背景，游戏资产设定图，高清 PNG';
  }
  return p;
}

async function generateImageInternal(args) {
  const size = Array.isArray(args.size) ? args.size : [1024, 1024];
  const width = size[0] || 1024;
  const height = size[1] || 1024;
  const prompt = buildPrompt(args);

  // 面板填写的 key/endpoint/model 优先于环境变量（getRuntimeContext().config.*）
  const runtimeContext = args.getRuntimeContext ? args.getRuntimeContext() : undefined;
  const cfg = (runtimeContext && runtimeContext.config) || {};
  const panelApiKey = cfg.volcArkApiKey;

  const buf = await genImage({
    prompt,
    width,
    height,
    apiKey: panelApiKey,
    endpoint: cfg.volcImageEndpoint,
    model: cfg.volcImageModel,
  });

  const projectRoot = args.project_root || (args.getRuntimeContext && args.getRuntimeContext().projectPath) || process.cwd();
  const targetDir = args.target_dir
    ? path.resolve(args.target_dir)
    : path.join(projectRoot, 'assets', 'resources', 'textures');
  const fileBase = `${args.category || 'prop'}_${args.name || 'asset'}`;

  const out = writeAsset(targetDir, fileBase, buf);
  return (
    `✅ 已生成「${fileBase}」\n` +
    `尺寸: ${out.width}x${out.height}\n` +
    `PNG: ${out.pngPath}\n` +
    `meta: ${out.metaPath}\n` +
    `spriteFrame uuid: ${out.spriteFrameUuid}\n` +
    `项目根: ${projectRoot}`
  );
}

function createImageGenTools({ createSchema, getRuntimeContext }) {
  function run(args) {
    return generateImageInternal({ ...args, getRuntimeContext });
  }
  return [
    {
      name: 'generate_sprite',
      profile: 'full',
      description: '[image] Generate a 2D game sprite (character/enemy/prop/avatar), write Cocos .meta and save into project assets/, returning the spriteFrame uuid for scene/prefab wiring. Requires VOLC_ARK_API_KEY.',
      inputSchema: createSchema(
        {
          prompt: { type: 'string', description: '自然语言描述，如 "绿色史莱姆，正面，透明背景"' },
          category: {
            type: 'string',
            enum: ['char', 'enemy', 'prop', 'ui', 'fx', 'bg'],
            description: '命名前缀',
            default: 'prop',
          },
          name: { type: 'string', description: '资产名，如 slime_green' },
          size: { type: 'array', items: { type: 'number' }, description: '默认 [1024,1024]' },
          style_anchor: { type: 'string', description: '风格锚词（同项目必带，保证一致性）' },
          ui_mode: { type: 'boolean', description: 'UI 图标专用构图' },
          target_dir: { type: 'string', description: '落盘目录，默认 <project>/assets/resources/textures' },
          project_root: { type: 'string', description: 'Cocos 工程根，默认运行时项目路径或 cwd' },
        },
        ['prompt', 'name']
      ),
      handler: async (args) => run(args),
    },
    {
      name: 'generate_image',
      profile: 'full',
      description: '[image] Generate any image (concept/scene/promo/UI), write Cocos .meta and save. ui_mode=true uses UI-specific composition. Requires VOLC_ARK_API_KEY.',
      inputSchema: createSchema(
        {
          prompt: { type: 'string' },
          size: { type: 'array', items: { type: 'number' } },
          style_anchor: { type: 'string' },
          ui_mode: { type: 'boolean', description: 'UI 图标/UI 图专用构图（居中、透明、统一描边）' },
          target_dir: { type: 'string' },
          project_root: { type: 'string' },
        },
        ['prompt']
      ),
      handler: async (args) => run(args),
    },
  ];
}

module.exports = { createImageGenTools, genImage, writeAsset, imageSize };
