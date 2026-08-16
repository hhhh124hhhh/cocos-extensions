'use strict';
// asset-gen MCP server（streamable-http，纯 Node 零依赖）。
// 照搬 funplay-cocos-mcp 的传输模式：MCP-Protocol-Version + Mcp-Session-Id 头，
// 响应 application/json。dsh 经 patch（mcp-assets）以 streamable-http 连 http://127.0.0.1:9180/。

const http = require('http');
const path = require('path');
const { genImage } = require('./volc');
const { writeAsset } = require('./cocos');

const PORT = Number(process.env.ASSET_GEN_PORT || 9180);
const PROTOCOL = '2025-11-25';
const sessions = new Map();

function sendJson(res, status, payload, sessionId) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'MCP-Protocol-Version': PROTOCOL };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

function sendEmpty(res, sessionId) {
  const headers = { 'MCP-Protocol-Version': PROTOCOL };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  res.writeHead(202, headers);
  res.end();
}

// ---- 工具定义 ----
const TOOLS = [
  {
    name: 'generate_sprite',
    description:
      '生成一张 2D 游戏精灵（角色/敌人/道具/头像），自动写 Cocos .meta 并落盘到工程 assets/，返回 spriteFrame uuid 供场景/prefab 接线。需 VOLC_ARK_API_KEY。',
    inputSchema: {
      type: 'object',
      properties: {
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
        project_root: { type: 'string', description: 'Cocos 工程根，默认 COCOS_PROJECT_ROOT 或 cwd' },
      },
      required: ['prompt', 'name'],
    },
  },
  {
    name: 'generate_image',
    description:
      '生成任意图片（概念图/场景/宣传图/UI 大图），写 Cocos .meta 落盘。ui_mode=true 走 UI 专用构图。需 VOLC_ARK_API_KEY。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        size: { type: 'array', items: { type: 'number' } },
        style_anchor: { type: 'string' },
        ui_mode: { type: 'boolean', description: 'UI 图标/UI 图专用构图（居中、透明、统一描边）' },
        target_dir: { type: 'string' },
        project_root: { type: 'string' },
      },
      required: ['prompt'],
    },
  },
];

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

async function callTool(params) {
  const a = params.arguments || {};
  const size = Array.isArray(a.size) ? a.size : [1024, 1024];
  const width = size[0] || 1024;
  const height = size[1] || 1024;
  const prompt = buildPrompt(a);

  const buf = await genImage({ prompt, width, height });

  const projectRoot = a.project_root || process.env.COCOS_PROJECT_ROOT || process.cwd();
  const targetDir = a.target_dir
    ? path.resolve(a.target_dir)
    : path.join(projectRoot, 'assets', 'resources', 'textures');
  const fileBase = `${a.category || 'prop'}_${a.name || 'asset'}`;

  const out = writeAsset(targetDir, fileBase, buf);
  return [
    {
      type: 'text',
      text:
        `✅ 已生成「${fileBase}」\n` +
        `尺寸: ${out.width}x${out.height}\n` +
        `PNG: ${out.pngPath}\n` +
        `meta: ${out.metaPath}\n` +
        `spriteFrame uuid: ${out.spriteFrameUuid}\n` +
        `项目根: ${projectRoot}`,
    },
  ];
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    return res.end();
  }
  let body = '';
  req.on('data', (c) => (body += c));
  await new Promise((r) => req.on('end', r));

  let msg;
  try {
    msg = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }

  const sid = req.headers['mcp-session-id'];
  const txid = msg.id != null ? msg.id : null;

  try {
    if (msg.method === 'initialize') {
      const id = crypto.randomUUID();
      sessions.set(id, { initialized: false });
      return sendJson(
        res,
        200,
        {
          jsonrpc: '2.0',
          id: txid,
          protocolVersion: PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { name: 'asset-gen', version: '0.1.0' },
        },
        id
      );
    }

    if (!sid || !sessions.has(sid)) {
      return sendJson(
        res,
        400,
        { jsonrpc: '2.0', id: txid, error: { code: -32000, message: 'No/unknown Mcp-Session-Id' } },
        sid
      );
    }

    if (msg.method === 'notifications/initialized') {
      sessions.get(sid).initialized = true;
      return sendEmpty(res, sid);
    }
    if (msg.method === 'ping') {
      return sendJson(res, 200, { jsonrpc: '2.0', id: txid, result: {} }, sid);
    }
    if (msg.method === 'tools/list') {
      return sendJson(res, 200, { jsonrpc: '2.0', id: txid, result: { tools: TOOLS } }, sid);
    }
    if (msg.method === 'tools/call') {
      try {
        const content = await callTool(msg.params || {});
        return sendJson(res, 200, { jsonrpc: '2.0', id: txid, result: { content } }, sid);
      } catch (e) {
        return sendJson(
          res,
          200,
          {
            jsonrpc: '2.0',
            id: txid,
            result: { content: [{ type: 'text', text: '❌ ' + (e.message || String(e)) }], isError: true },
          },
          sid
        );
      }
    }
    return sendJson(res, 200, { jsonrpc: '2.0', id: txid, error: { code: -32601, message: 'Method not found: ' + msg.method } }, sid);
  } catch (e) {
    return sendJson(res, 200, { jsonrpc: '2.0', id: txid, error: { code: -32603, message: String(e) } }, sid);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.error(`[asset-gen] MCP server on http://127.0.0.1:${PORT}/  (VOLC_ARK_API_KEY=${process.env.VOLC_ARK_API_KEY ? 'set' : 'MISSING'})`);
});
