# cocos-codely 快速上手 (QUICKSTART · Route B 薄壳)

> Cocos Creator 版「团结 Codely」外层插件（Route B 薄壳）。
> 一句话：在编辑器里开一个聊天面板，用自然语言让 AI 读场景、改场景、构建、修错。
> 面板只是 iframe 嵌 dsh web @3080——**dsh 要你自己（或守护进程）先起**，本扩展不拉起它。

---

## 1. 它是怎么连起来的（先建立心智模型，10 秒）

```
你（在编辑器里打字）
   └─ Codely 面板(iframe) 嵌着 dsh web 聊天界面 @ 3080
        └─ dsh 通过 patch 挂载 funplay 的 MCP server @ 8765
             └─ funplay 真的去读/改 Cocos 场景、构建、抓 console
```

三个端口，分属不同进程：

| 端口 | 谁 | 作用 |
|---|---|---|
| **3080** | `deepseek-harness`（dsh，AI 大脑） | 网页聊天界面，你在这对话 |
| **8765** | `funplay-cocos-mcp` | 场景读/写/构建服务（本扩展不自己提供） |
| — | `cocos-codely` | 只是「聊天面板」：iframe 3080，**不拉起任何进程** |

> **关键架构点**：dsh 的 ACP 是 stdio 传输，webview 面板连不上。所以面板用 **iframe 嵌 dsh 的 web 服务 @3080**，而不是直连 ACP。这点是 Route B 的命脉。

---

## 2. 前置条件（本机必须已具备）

1. **Cocos Creator 3.8.8** 已装。
2. **funplay-cocos-mcp** 全局扩展已启用，位于 `~/.CocosCreator/extensions/funplay-cocos-mcp`。
   - 编辑器一打开，它就会自动在 `8765` 起 HTTP MCP server —— 这是场景读写能力的来源。
3. **dsh 仓库（开源）** 已 clone 且依赖装好——这是 dsh（AI 大脑）本体。**本扩展不携带 dsh**。

---

## 3. 安装本扩展

软链或拷贝到 `~/.CocosCreator/extensions/cocos-codely/`（或任意工程的 `extensions/`）：

```bash
# 软链（推荐，单一源真相）
mklink /J "C:/Users/Lenovo/.CocosCreator/extensions/cocos-codely" "D:/ai-game-workstation/cocos-extensions/cocos-codely"
```

首次若改过 `src/`，在源仓重编：
```bash
cd cocos-codely
npm install        # 装 typescript / @types/node (devDeps)
npm run build      # tsc -p tsconfig.json → dist/ ，并把 index.html 拷到 dist/panels/default/
```
> ⚠️ 头号坑：`dist/` 不存在时，Cocos 启用扩展会因 `require('./dist/main.js')` 失败、`load()` 不执行。
> 启用后「啥也没发生」先查 `dist/` 在不在。（已把 `dist/` 提交进仓，默认就有。）

---

## 4. 启动 dsh（必须，本扩展不管）

dsh 要**外部先起**，且必须带 cocos patch 才能挂上 funplay：

```bash
cd <你的 dsh 仓库>
node --import tsx/esm apps/cli/src/bin.ts --profile web \
  --patch <cocos-codely>/dsh-cocos-mount.patch.yml
```

> - 不传 `--patch` → dsh 不挂 funplay → 场景工具（`mcp__cocos__*`）不可用。
> - 建议用常驻守护进程拉起（WorkBuddy/会话结束会回收子进程，3080 没了面板就一直「正在连接 dsh…」）。

浏览器 / 面板访问 `http://127.0.0.1:3080` 能打开聊天界面 = dsh 已就绪。

---

## 5. 日常启用（开面板 → 对话）

1. 打开任意 Cocos 工程，**先把目标场景在编辑器里加载好**（AI 只读得到当前打开的场景）。
2. 顶部菜单 **Extensions → Extension Manager**，本地扩展里找到 `cocos-codely`，**勾选启用**。
3. **手动打开面板**：顶部菜单 **Extensions → cocos-codely → Codely**。
   - ⚠️ 启用扩展**不会**自动弹面板，得自己点开。
   - 面板初始显示「正在连接 dsh…」遮罩，dsh 就绪后自动消失。
4. 面板里看到 dsh 聊天界面 = 通了。确认工具列表出现 `mcp__cocos__*` 系列（来自 funplay 挂载）= 场景读写链路打通。

---

## 6. 第一次该说什么（照 Loop Engineering 纪律）

别一上来就让 AI「做个游戏」。按 **读 → 改 → 验** 分步，它才不乱改。

**① 先读场景（建立认知，不改动）**
> 读取当前场景的节点层级，列出 Canvas 下的所有节点名、类型和关键属性，不要修改任何东西。

**② 再做一件小改 + 构建（闭环验证）**
> 在 Canvas 下新建一个 Button 节点，文字改成「开始游戏」，字号 36，居中；保存场景并执行构建。构建完成后读取构建日志，如果有报错就定位并修复。

**③ 出错时让它自愈**
> 刚才构建报了 XXX 错，读取 get_console 的控制台输出和构建日志，给出根因并直接改代码修复，再重新构建确认通过。

这三句命中 `query_scene / create_button / set_property / save_scene / build / get_console` 五件套，能端到端验证整条链路。

---

## 7. 没反应的排查（按概率排）

| 现象 | 大概率原因 | 处理 |
|---|---|---|
| 启用后什么都没发生 | `dist/` 没编 / 没 `npm install` | 回第 3 节重 `npm run build` |
| 面板一直「正在连接 dsh…」 | 3080 没服务（dsh 没起 / 被回收） | 确认 dsh 已用第 4 节命令起来（或守护拉起） |
| 面板能聊但**没有** `mcp__cocos__*` 工具 | funplay 没启用，或端口不是 8765，或 dsh 没带 `--patch` | 确认 funplay 启用 + dsh 带 `--patch cocos-codely/dsh-cocos-mount.patch.yml`；端口回退改 patch.yml `url` |
| 工具在但改场景没反应 | 目标场景没加载 / 工程不是当前打开的 | 先在编辑器里手动打开场景 |

---

## 8. 端口自定义

- **dsh 端口**：默认 3080，写在 `src/panels/default/index.{js,html}` 的 iframe `src`。两处一起改。
- **funplay 端口**：默认 8765，写在 `dsh-cocos-mount.patch.yml` 的 `url`。改一处即可。
- 两处（`index.js` / `index.html` / `patch.yml`）保持一致的端口，dsh 才能挂到对的 funplay 实例。

---

## 相关文件
- `dsh-cocos-mount.patch.yml` — dsh 挂载 funplay 的配置（给启动 dsh 的人用）
- `SYSTEM_PROMPT.md` — 给 dsh 的「工程理解」系统提示（Loop Engineering 纪律约束）
- `src/main.ts` — 扩展 main：仅 load/unload + 打开面板（不 spawn、不持 dsh 路径）
- `src/panels/default/index.html` — 面板 iframe 嵌 dsh web @3080
- 设计文档：（dsh 仓库内）`docs/cocos-codely-design.md`（架构与决策记录）
