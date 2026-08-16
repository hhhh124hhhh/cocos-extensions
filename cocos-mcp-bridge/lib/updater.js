'use strict';
// [fork] 原 updater 已剥离：本 fork 为自有构建，不回连上游 GitHub 下载/替换扩展包。
// 仅保留 installLatestUpdate 导出以兼容 browser.js 的 require；不做任何网络请求、文件替换。
function installLatestUpdate() {
  return Promise.resolve({
    ok: false,
    disabled: true,
    installedVersion: '',
    message: 'Auto-update disabled in this fork (sovereign build, no phone-home).',
  });
}
module.exports = { installLatestUpdate };
