# cocos-codely（Route B · 薄壳）

Cocos Creator 版「团结 Codely」外层插件。架构是 **dsh（DeepSeek Harness，AI 大脑）
+ funplay-cocos-mcp（场景读写 MCP server）+ cocos-codely（编辑器内聊天面板）** 的闭环 Agent，
让 AI 直接在 Cocos 编辑器里「读懂场景 → 改场景 → 构建 → 看报错再修」。

## Route B 薄壳定位

cocos-codely **只做一件事**：在编辑器内开一个面板，用 `<iframe>` 嵌入 dsh 的 web 聊天界面
（默认 `http://127.0.0.1:3080`）。它**不再 spawn dsh、不持有任何 dsh 路径**——dsh 由外部启动
（守护进程 / 你手动跑）。场景读写由 funplay-cocos-mcp（默认 `http://127.0.0.1:8765/`）经 dsh
patch 挂载提供，与本扩展无关。

> 为什么是 iframe 嵌 dsh web 而不是接 dsh 的 ACP？
> dsh 的 ACP 是 **stdio 传输**，webview 面板连不上；但 `dsh --profile web` 会起一个
> **HTTP web 聊天服务**（默认 `127.0.0.1:3080`），面板用 iframe 嵌它即可——这是 panel
> 能连上 dsh 的唯一稳定路径。

---

## 目录结构

```
cocos-codely/
├── package.json              # 扩展 manifest（main / panels）
├── tsconfig.json             # 编译配置：src → dist
├── dsh-cocos-mount.patch.yml # dsh patch：把 funplay 的 8765 MCP server 挂进 dsh（给启动 dsh 的人用）
├── src/
│   ├── main.ts               # 扩展 main 进程：仅 load/unload + 打开面板方法（不 spawn、不持 dsh 路径）
│   └── panels/default/
│       ├── index.js          # Panel 生命周期：iframe 3080，dsh 就绪前显示「正在连接 dsh…」遮罩
│       └── index.html        # Panel DOM：撑满面板的 iframe + 遮罩
└── dist/                     # tsc 编译产物（npm run build 生成，启用前必须存在）
```

---

## 三个进程 / 三个端口

| 端口 | 谁 | 作用 |
| ---- | ---- | ---- |
| **3080** | `deepseek-harness`（dsh，AI 大脑） | 网页聊天界面，面板 iframe 它 |
| **8765** | `funplay-cocos-mcp` | 场景读/写/构建服务（本扩展不自己提供） |
| — | `cocos-codely` | 仅「聊天面板」：iframe 3080，**不拉起任何进程** |

---

## 运行方式（端到端）

1. **安装依赖 + 编译**（在本扩展目录内）：
   ```bash
   cd cocos-codely
   npm install
   npm run build          # tsc 把 src 编到 dist，并把 index.html 拷到 dist/panels/default/
   ```
2. **放进某 Cocos 工程**：把本目录**软链或拷贝**为
   `<你的Cocos工程>/extensions/cocos-codely/`（目录名必须正好是 `cocos-codely`）。
3. **启动 dsh（外部，本扩展不管）**：
   ```bash
   cd <你的 dsh 仓库>
   node --import tsx/esm apps/cli/src/bin.ts --profile web \
     --patch <cocos-codely>/dsh-cocos-mount.patch.yml
   ```
   > 建议用常驻守护进程拉起（WorkBuddy/会话结束会回收子进程，3080 没了面板就一直等）。
   > 不传 `--patch` 则 dsh 不挂 funplay，场景工具（`mcp__cocos__*`）不可用。
4. **编辑器启用 + 打开面板**：Extensions → Extension Manager 勾选 `cocos-codely`；
   菜单打开 **Codely** 面板（dockable，420×720）。面板 iframe 3080，dsh 就绪后自动加载；
   若 dsh 未起，遮罩会一直「正在连接 dsh…」直到 3080 通。
5. **funplay 场景 server**：由 funplay-cocos-mcp 扩展提供（默认全局装在
   `~/.CocosCreator/extensions/`，编辑器启动即自动起 server），监听 `http://127.0.0.1:8765/`。
   `dsh-cocos-mount.patch.yml` 已把它挂进 dsh，模型即可见 funplay 全套工具。

---

## 端口与自定义

| 服务 | 默认地址 | 改哪 |
| ---- | -------- | ---- |
| dsh web 聊天界面（面板 iframe 目标） | `http://127.0.0.1:3080` | `src/panels/default/index.{js,html}` 的 iframe `src`（两处一起改） |
| funplay 场景 MCP server | `http://127.0.0.1:8765/` | `dsh-cocos-mount.patch.yml` 的 `url` |

---

## 加载前还差什么（诚实清单）

1. **`dist/` 必须先存在**：Cocos 启用扩展时会 `require('./dist/main.js')`。
   若没先 `npm install` + `npm run build`，扩展加载报错、`load()` 不执行。这是最常见"启用后没反应"根因。
2. **本扩展不负责启动 dsh**：3080 没服务，面板就一直等。确认 dsh 已用第 3 步命令起来（或守护拉起）。
3. **无需额外 `@editor` 类型包 / 无 MCP SDK 依赖**：main 进程用全局 `Editor`，已
   `declare const Editor: any` 兜底。
4. **真机端到端需用户本机验证**：本仓库保证 build 通过 + 代码逻辑正确（Route B 薄壳、iframe 指向 3080）。
   Cocos+dsh 同跑的实际连通由用户本机确认。

---

## 技术约定（已遵守）

- 扩展 main 进程：仅 `load`/`unload` + `methods.openPanel`（用 `Editor.Panel.open` 打开面板）。
- 不再 `spawn` 任何子进程，不引用 dsh 仓库路径——dsh 的生命周期完全在扩展之外。
- Panel 是纯 webview：不碰 `cc` / 场景，只走 DOM（iframe + 遮罩）。
- TypeScript 源码在 `src/`，`tsconfig.json`：target ES2020、module/node16（无 `"type": "module"`，
  emit 为 CommonJS，契合 Cocos 扩展 main 约定）、outDir=dist、allowJs、含 DOM lib、skipLibCheck，
  `Editor` 缺失类型用 `declare const Editor: any` 兜底。
