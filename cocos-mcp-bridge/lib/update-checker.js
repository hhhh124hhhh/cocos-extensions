'use strict';
// [fork] 更新检查：指向自有远仓 github.com/hhhh124hhhh/cocos-extensions，
// 读取远仓 cocos-mcp-bridge/package.json 的 version 与本地对比，提示是否有新版。
//
// ⚠️ 远仓为 private 时，raw.githubusercontent.com 无认证访问返回 404，面板会显示
// "更新源不可达(HTTP 404)：远仓为私有..."；将仓库设为 public 后本检查自动生效。
// 可用环境变量 COCOS_MCP_UPDATE_URL 覆盖检查地址。
//
// 更新动作本身不在此处：本 fork 的更新方式 = 安装器 install-cocos-stack.mjs 或
// git pull（不做自动下载替换，避免 EDR 写锁 / 权限问题）。

const https = require('node:https');
const pkg = require('../package.json');

const DEFAULT_UPDATE_URL =
  'https://raw.githubusercontent.com/hhhh124hhhh/cocos-extensions/master/cocos-mcp-bridge/package.json';
const DEFAULT_TIMEOUT_MS = 8000;

function httpGetJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { accept: 'application/json' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const status = res.statusCode || 0;
        const body = Buffer.concat(chunks).toString('utf8');
        if (status < 200 || status >= 300) {
          return reject(new Error(`HTTP ${status}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('响应不是合法 JSON'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('请求超时')));
  });
}

async function checkForUpdate(options = {}) {
  const url = process.env.COCOS_MCP_UPDATE_URL || DEFAULT_UPDATE_URL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const currentVersion = pkg.version || '';
  try {
    const remote = await httpGetJson(url, timeoutMs);
    const latestVersion = typeof remote.version === 'string' ? remote.version : '';
    if (!latestVersion) {
      return {
        ok: false,
        disabled: false,
        currentVersion,
        latestVersion: 'unknown',
        message: '更新源未返回版本号',
      };
    }
    if (latestVersion !== currentVersion) {
      return {
        ok: true,
        disabled: false,
        currentVersion,
        latestVersion,
        message: `发现新版本 ${latestVersion}（当前 ${currentVersion}），用 install-cocos-stack.mjs 或 git pull 更新`,
      };
    }
    return {
      ok: true,
      disabled: false,
      currentVersion,
      latestVersion,
      message: `已是最新版本（${currentVersion}）`,
    };
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    const hint = msg.includes('404') || msg.includes('401') ? '：远仓为私有或路径不存在（设为 public 后自动生效）' : '';
    return {
      ok: false,
      disabled: false,
      currentVersion,
      latestVersion: 'unknown',
      message: `更新源不可达${hint}（${msg}）`,
    };
  }
}

module.exports = { checkForUpdate };
