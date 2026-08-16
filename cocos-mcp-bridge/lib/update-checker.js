'use strict';
// [fork] 原 update-checker 已剥离：本 fork 为自有构建，不回连上游 GitHub。
// 仅保留 checkForUpdate 导出以兼容 browser.js / tool-registry.js 的 require；不做任何网络请求。

function checkForUpdate() {
  return Promise.resolve({
    ok: false,
    disabled: true,
    currentVersion: '',
    latestVersion: 'unknown',
    message: 'Auto-update disabled in this fork (sovereign build, no phone-home).',
  });
}

module.exports = { checkForUpdate };
