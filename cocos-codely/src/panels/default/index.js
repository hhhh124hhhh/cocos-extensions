/**
 * cocos-codely Panel(批 E+):iframe 嵌入 dsh web 聊天界面
 * ------------------------------------------------------------------
 * Cocos 3.8 标准面板 API = Editor.Panel.define({ template, style, $, methods, ready })。
 * 之前用 `exports.ready(root)` 带参是错的 —— Cocos 不传 root, 元素要通过
 * `$` 选择器映射 + `this.$.xxx` 访问(funplay panel 同款模式)。
 *
 * 批 E 修复: dsh web boot 20-40s, 面板若在 dsh 就绪前打开 → iframe 连接被拒、
 * 不触发 load → 遮罩永远卡住。现加 dsh 就绪轮询: 每 2s no-cors fetch 探 3080,
 * 可连后带 cache-buster 重载 iframe, load 才揭幕; fetch 连续失败 ≥3 次退化为
 * iframe 周期性重载; 遮罩实时显示已等待秒数, 超 90s 给指引。
 */
const DSH_WEB_URL = 'http://127.0.0.1:3080';
const POLL_MS = 2000;
const MAX_ATTEMPTS = 45; // 约 90 秒上限
const FETCH_FAIL_LIMIT = 3;

module.exports = Editor.Panel.define({
  template: `
    <div id="panel">
      <iframe id="dsh-frame" src="http://127.0.0.1:3080" title="Codely (dsh web)"></iframe>
      <div id="boot-mask">
        <div class="spinner"></div>
        <div>正在连接 dsh…</div>
        <div class="hint">dsh web 启动中，面板会自动等待并加载。</div>
      </div>
    </div>
  `,
  style: `
    #panel { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; background: #1e1e1e; }
    #panel::before {
      content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: #2d8cf0; z-index: 20;
    }
    #dsh-frame { flex: 1; width: 100%; border: 0; display: block; background: #1e1e1e; }
    #boot-mask {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 8px; background: #1e1e1e; color: #cfcfcf; z-index: 10;
    }
    #boot-mask .spinner {
      width: 28px; height: 28px; border: 3px solid #3a3a3a; border-top-color: #2d8cf0;
      border-radius: 50%; animation: codely-spin 0.9s linear infinite;
    }
    #boot-mask .hint { font-size: 12px; color: #9a9a9a; max-width: 80%; text-align: center; line-height: 1.5; }
    @keyframes codely-spin { to { transform: rotate(360deg); } }
  `,
  $: {
    frame: '#dsh-frame',
    mask: '#boot-mask',
    hint: '#boot-mask .hint',
  },
  ready() {
    const frame = this.$.frame;
    const mask = this.$.mask;
    const hint = this.$.hint;

    let ready = false; // 已确认 dsh web 可连
    let loaded = false; // iframe 已触发过 load
    let attempts = 0;
    let fetchFailStreak = 0;

    function hideMask() {
      if (mask) mask.style.display = 'none';
    }

    // 只要 load 且已确认 dsh 就绪才揭幕(避免把 404/连接拒绝页亮给用户)
    frame.addEventListener('load', () => {
      loaded = true;
      if (ready) hideMask();
    });

    async function poll() {
      if (ready || loaded) return;
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        if (hint) {
          hint.textContent =
            'dsh web 长时间未就绪（超过约 90 秒）。请确认 dsh 已在 3080 启动（守护进程会自动拉起，' +
            '或手动 `dsh --profile web --patch dsh-cocos-mount.patch.yml`），然后重开面板。';
        }
        return;
      }

      // no-cors 探测: 能连通(res.type!=='error')即视为服务已起; 连接失败 throw → 继续轮询
      let up = false;
      try {
        const res = await fetch(DSH_WEB_URL + '/favicon.svg', { mode: 'no-cors', cache: 'no-store' });
        up = res.type !== 'error';
        fetchFailStreak = 0;
      } catch (_e) {
        up = false;
        fetchFailStreak++;
      }

      // webview 禁了 fetch(连续失败): 退化为周期性重载 iframe, 靠 load 事件揭幕
      if (fetchFailStreak >= FETCH_FAIL_LIMIT) {
        if (hint && attempts % 3 === 0) {
          hint.textContent = '正在启动 dsh…（已等待约 ' + Math.round((attempts * POLL_MS) / 1000) + 's）';
        }
        if (!loaded) frame.src = DSH_WEB_URL + '?t=' + Date.now();
        setTimeout(poll, POLL_MS);
        return;
      }

      if (up) {
        ready = true;
        if (hint) hint.textContent = 'dsh web 已就绪，正在加载界面…';
        // 等一小段让 SPA 路由注册完成再加载 iframe(避开启动期 404 窗口);
        // 始终带 cache-buster 强制重新加载,避免命中旧的连接拒绝/404 结果。
        setTimeout(() => {
          frame.src = DSH_WEB_URL + '?t=' + Date.now();
        }, 1500);
        return;
      }

      if (hint && attempts % 5 === 0) {
        hint.textContent = '正在启动 dsh…（已等待约 ' + Math.round((attempts * POLL_MS) / 1000) + 's）';
      }
      setTimeout(poll, POLL_MS);
    }

    console.log('[cocos-codely-panel] iframe 指向', DSH_WEB_URL);
    poll();
  },
  close() {},
});
