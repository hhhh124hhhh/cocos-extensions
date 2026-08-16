/**
 * cocos-dsh-theme —— dsh 客户端插件(浏览器侧)
 * -------------------------------------------------------------
 * 把 dsh web 的 --dsw-alias-* 调色板整体覆盖成 Cocos Creator 3.x 深色风,
 * 让嵌入 Cocos 编辑器面板的 dsh 看起来"就是编辑器的一部分"。
 *
 * 这是 dsh "Everything is a Plugin" 的官方改 UI 路径:
 *   - 不需要重编客户端(web profile 已含 @deepseek-ai/dsh-cordis-client-runner)
 *   - 由 cordis_define / cordis_run 工具加载,持久化,重启不丢
 *   - 覆盖的是 dsh 设计系统最底层的 alias 变量,所以顶栏/按钮/滚动条/选区全变
 *
 * 加载方式(在 dsh web 会话里,用 cordis-plugin-development 技能):
 *   cordis_define({
 *     name: 'cocos-dsh-theme',
 *     code: { client: <本文件内容, 即从 "return {" 到结尾的整段函数体> }
 *   })
 *   cordis_run({ name: 'cocos-dsh-theme' })
 *
 * 本文件内容 = 动态插件浏览器侧的"函数体"(返回一个 Cordis 插件对象)。
 */
return {
  name: 'cocos-dsh-theme',
  apply(ctx) {
    const styleId = 'dsh-cocos-theme'
    if (document.getElementById(styleId)) return

    // Cocos Creator 3.x 深色编辑器调色板(实机 hex, 非猜测)
    const css = `
:root,
body[data-ds-dark-theme] {
  /* —— 背景层级:Cocos 深灰阶梯 —— */
  --dsw-alias-bg-base: #2b2b2b;
  --dsw-alias-bg-layer-1: #323232;
  --dsw-alias-bg-layer-2: #3a3a3a;
  --dsw-alias-bg-layer-3: #424242;
  --dsw-alias-bg-module-platform: #333333;
  --dsw-alias-bg-multi-select: #2f2f2f;
  --dsw-alias-bg-overlay: #2f2f2f;
  --dsw-alias-bg-skeleton: rgba(255, 255, 255, 0.06);
  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0.5);
  --dsw-alias-bg-mask-2: rgba(0, 0, 0, 0.2);
  --dsw-alias-bg-mask-3: rgba(0, 0, 0, 0.45);
  --dsw-alias-bg-mask-photo: rgba(0, 0, 0, 0.85);
  --dsw-alias-bg-mask-drop: rgba(20, 20, 24, 0.72);

  /* —— 边框:Cocos 同款极淡白描边 —— */
  --dsw-alias-border-l1: rgba(255, 255, 255, 0.06);
  --dsw-alias-border-l2: rgba(255, 255, 255, 0.1);
  --dsw-alias-border-l2-darkmode-thin: rgba(255, 255, 255, 0.06);
  --dsw-alias-border-l3: rgba(255, 255, 255, 0.16);
  --dsw-alias-border-l4: rgba(255, 255, 255, 0.22);
  --dsw-alias-border-inverted: rgba(255, 255, 255, 0.06);
  --dsw-alias-border-inverted2: rgba(255, 255, 255, 0.08);

  /* —— 品牌色:Cocos 蓝 —— */
  --dsw-alias-brand-primary: #2d8cf0;
  --dsw-alias-brand-primary-invert: #ffffff;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #2d8cf0;
  --dsw-alias-brand-text: #2d8cf0;
  --dsw-alias-state-business-primary: #2d8cf0;
  --dsw-alias-state-business-tertiary: #1c5f9e;

  /* —— 文本:Cocos 灰白阶梯 —— */
  --dsw-alias-label-primary: #cfcfcf;
  --dsw-alias-label-primary-bluish: #e6e6e6;
  --dsw-alias-label-primary-foreground: #1b1b1b;
  --dsw-alias-label-primary-inverted: #2b2b2b;
  --dsw-alias-label-primary-dimmed: #dcdcdc;
  --dsw-alias-label-secondary: #b0b0b0;
  --dsw-alias-label-tertiary: #9a9a9a;
  --dsw-alias-label-dimmed: #7a7a7a;
  --dsw-alias-label-caption: #8a8a8a;
  --dsw-alias-label-quaternary: #6a6a6a;

  /* —— 交互态 —— */
  --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, 0.08);
  --dsw-alias-interactive-bg-hover-accent: rgba(45, 140, 240, 0.18);
  --dsw-alias-interactive-bg-hover-solid: #3a3a3a;
  --dsw-alias-interactive-bg-active: rgba(255, 255, 255, 0.14);
  --dsw-alias-interactive-bg-hover-danger: rgba(230, 88, 77, 0.16);

  /* —— 按钮 —— */
  --dsw-alias-button-primary-fill: #2d8cf0;
  --dsw-alias-button-primary-hover: #53a2f5;
  --dsw-alias-button-primary-dimmed: #1c5f9e;
  --dsw-alias-button-contrast-fill: #cfcfcf;
  --dsw-alias-button-elevated-fill: #3a3a3a;
  --dsw-alias-button-floating-fill: #383838;
  --dsw-alias-button-floating-hover: #444444;
  --dsw-alias-button-ghost-active-fill: #3a3a3a;
  --dsw-alias-button-ghost-active-hover: #444444;
  --dsw-alias-button-ghost-active-border: #555555;
  --dsw-alias-button-info-fill: #2d8cf0;
  --dsw-alias-button-info-hover: #53a2f5;
  --dsw-alias-button-tool-bar-fill: rgba(120, 120, 120, 0.4);
  --dsw-alias-button-tool-bar-fill-invisible: rgba(20, 20, 20, 0.36);
  --dsw-alias-button-tool-bar-hover: rgba(120, 120, 120, 0.55);

  /* —— 滚动条:Cocos 深灰 —— */
  --dsw-alias-scrollbar-bg-l1: #4a4a4a;
  --dsw-alias-scrollbar-bg-l2: #5a5a5a;
  --dsw-alias-scrollbar-hover-l1: #6a6a6a;
  --dsw-alias-scrollbar-hover-l2: #7a7a7a;

  /* —— 状态色 —— */
  --dsw-alias-state-error-primary: #e6584d;
  --dsw-alias-state-error-secondary: #e6584d;
  --dsw-alias-state-success-primary: #4caf50;
  --dsw-alias-state-success-secondary: #5bbf5f;
  --dsw-alias-state-success-tertiary: #1f3a22;
  --dsw-alias-state-warn-primary: #d98c1f;
  --dsw-alias-state-warn-secondary: #d98c1f;
  --dsw-alias-state-warn-tertiary: #3a2e12;
  --dsw-alias-state-warn-label: #d98c1f;

  /* —— markdown / 代码块 —— */
  --dsw-alias-markdown-code-block: #1f1f1f;
  --dsw-alias-markdown-code-block-banner: #333333;
  --dsw-alias-markdown-inline-code: #333333;
  --dsw-alias-markdown-tag: #333333;
  --dsw-alias-markdown-citation: #2f2f2f;
  --dsw-alias-markdown-code-segment-selected: #2f2f2f;
  --dsw-alias-markdown-code-segment-unselected: #1f1f1f;
  --dsw-alias-markdown-placeholder: #2f2f2f;

  /* —— 杂项 —— */
  --dsw-alias-toast-bg: #383838;
  --dsw-alias-tooltip-bg: #383838;
}
`

    const el = document.createElement('style')
    el.id = styleId
    el.textContent = css
    document.head.appendChild(el)
    ctx.effect(() => { el.remove() }, 'cocos-dsh-theme: remove injected stylesheet')
  },
}
