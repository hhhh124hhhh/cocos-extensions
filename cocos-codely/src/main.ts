/**
 * cocos-codely 扩展 main 进程（Route B 薄壳）
 * ------------------------------------------------------------------
 * 本扩展不再 spawn dsh、不持有任何 dsh 路径。dsh 由外部启动
 * （守护进程 / 手动 `dsh --profile web --patch dsh-cocos-mount.patch.yml`）。
 * 扩展只做一件事：在编辑器内打开面板（面板 iframe 嵌入 dsh web @ 3080）。
 * 场景读写由 funplay-cocos-mcp(8765) 经 dsh patch 挂载提供，与扩展无关。
 */

// Cocos 扩展 main 进程有全局 Editor；官方无公开 .d.ts，用 any 兜底。
declare const Editor: any;

function logInfo(...args: unknown[]): void {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (typeof Editor !== 'undefined' && Editor.log) Editor.log('[cocos-codely] ' + msg);
  else console.log('[cocos-codely] ' + msg);
}

export function load(): void {
  logInfo('cocos-codely 已加载；dsh 由外部启动，本扩展仅提供编辑器内面板（iframe 3080）。');
}

export function unload(): void {
  // Route B：不持有 dsh 子进程，无需清理。
}

export const methods = {
  openPanel(): void {
    if (typeof Editor !== 'undefined' && Editor.Panel && typeof Editor.Panel.open === 'function') {
      Editor.Panel.open('cocos-codely');
      logInfo('打开 Codely 面板');
    } else {
      console.error('[cocos-codely] Editor.Panel.open 不可用，无法打开面板');
    }
  },
};
