# cocos-codely 快速上手 (QUICKSTART)

> Cocos Creator 版「团结 Codely」的 dsh bundle。
> 一句话：给 dsh 挂上 cocos-mcp-bridge 的 MCP 工具 + 注入 Cocos 工程专家预设。

---

## 1. 它是怎么连起来的（先建立心智模型，10 秒）

```
你（在 dsh 3080 聊天界面打字）
   └─ dsh 通过本包的 patch 挂载 cocos-mcp-bridge 的 MCP server @ 8765
        └─ cocos-mcp-bridge 真的去读/改 Cocos 场景、构建、抓 console
```

三个端口，分属不同进程：

| 端口 | 谁 | 作用 |
|---|---|---|
| **3080** | `deepseek-harness`（dsh，AI 大脑） | 网页聊天界面，你在这对话 |
| **8765** | `cocos-mcp-bridge` | 场景读/写/构建服务 |
| — | `cocos-codely` | 仅 dsh bundle：patch + preset |

> **关键架构点**：编辑器内聊天面板（Codely 面板）已内置于 `cocos-mcp-bridge` 扩展，无需额外安装。

---

## 2. 前置条件（本机必须已具备）

1. **Cocos Creator 3.8.8** 已装。
2. **`cocos-mcp-bridge`** 已作为 Cocos 扩展启用（全局或项目级），位于 `~/.CocosCreator/extensions/cocos-mcp-bridge` 或 `<项目>/extensions/cocos-mcp-bridge`。
   - 编辑器一打开，它就会自动在 `8765` 起 HTTP MCP server —— 这是场景读写能力的来源。
   - 同时提供编辑器内 **Codely 面板**（Cocos AI → Codely）。
3. **dsh 仓库** 已 clone 且依赖装好——这是 dsh（AI 大脑）本体。**本包不携带 dsh**。

---

## 3. 安装本 bundle

由仓库根目录的 `install-cocos-stack.mjs` 自动完成：

```bash
node install-cocos-stack.mjs
```

手动等效操作（EDR 阻断 pnpm 时用）：
- 将本包的 `package.json` / `dsh-cocos-mount.patch.yml` / `presets/` / `SYSTEM_PROMPT.md` / `README.md` / `QUICKSTART.md` 复制到 `~/.dsh/profiles/web/node_modules/cocos-codely/`。
- 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 加 `"cocos-codely": "file:<绝对路径>/cocos-codely"`，并在 `dsh.profile.bundles` 数组追加 `"cocos-codely"`。

---

## 4. 启动 dsh（必须）

dsh 要**外部先起**，且必须带 cocos patch 才能挂上 cocos-mcp-bridge：

```bash
cd <你的 dsh 仓库>
node --import tsx/esm apps/cli/src/bin.ts --profile web \
  --patch <cocos-codely>/dsh-cocos-mount.patch.yml
```

> - 不传 `--patch` → dsh 不挂 cocos-mcp-bridge → 场景工具（`mcp__cocos__*`）不可用。
> - 建议用常驻守护进程拉起（WorkBuddy/会话结束会回收子进程，3080 没了面板就一直「正在连接 dsh…」）。

浏览器 / 面板访问 `http://127.0.0.1:3080` 能打开聊天界面 = dsh 已就绪。

---

## 5. 打开 Codely 面板

Codely 面板现在内置于 `cocos-mcp-bridge` 扩展：

1. 打开任意 Cocos 工程，**先把目标场景在编辑器里加载好**（AI 只读得到当前打开的场景）。
2. 顶部菜单 **Extensions → cocos-mcp-bridge → Codely**。
3. 面板初始显示「正在连接 dsh…」遮罩，dsh 就绪后自动消失。
4. 面板里看到 dsh 聊天界面 = 通了。确认工具列表出现 `mcp__cocos__*` 系列 = 场景读写链路打通。

---

## 6. 第一次该说什么（照 Loop Engineering 纪律）

别一上来就让 AI「做个游戏」。按 **读 → 改 → 验** 分步，它才不乱改。

**① 先读场景（建立认知，不改动）**
> 读取当前场景的节点层级，列出 Canvas 下的所有节点名、类型和关键属性，不要修改任何东西。

**② 再做一件小改 + 构建（闭环验证）**
> 在 Canvas 下新建一个 Button 节点，文字改成「开始游戏」，字号 36，居中；保存场景并执行构建。构建完成后读取构建日志，如果有报错就定位并修复。

**③ 出错时让它自愈**
> 刚才构建报了 XXX 错，读取 get_console 的控制台输出和构建日志，给出根因并直接改代码修复，再重新构建确认通过。

这三句命中 `get_scene_info / create_button / set_component_property / validate_scene / get_recent_logs` 五件套，能端到端验证整条链路。

---

## 7. 没反应的排查（按概率排）

| 现象 | 大概率原因 | 处理 |
|---|---|---|
| 面板一直「正在连接 dsh…」 | 3080 没服务（dsh 没起 / 被回收） | 确认 dsh 已用第 4 节命令起来（或守护拉起） |
| 面板能聊但**没有** `mcp__cocos__*` 工具 | cocos-mcp-bridge 没启用，或端口不是 8765，或 dsh 没带 `--patch` | 确认 cocos-mcp-bridge 启用 + dsh 带 `--patch cocos-codely/dsh-cocos-mount.patch.yml`；端口回退改 patch.yml `url` |
| 工具在但改场景没反应 | 目标场景没加载 / 工程不是当前打开的 | 先在编辑器里手动打开场景 |

---

## 8. 端口自定义

- **dsh 端口**：默认 3080，在 cocos-mcp-bridge 的 Codely 面板代码（`panel/codely.js`）的 `DSH_WEB_URL` 常量处修改。
- **cocos-mcp-bridge 端口**：默认 8765，写在 `dsh-cocos-mount.patch.yml` 的 `url`。改一处即可。
- 两处保持一致的端口，dsh 才能挂到对的 cocos-mcp-bridge 实例。

---

## 相关文件
- `dsh-cocos-mount.patch.yml` — dsh 挂载 cocos-mcp-bridge 的配置
- `SYSTEM_PROMPT.md` — 给 dsh 的「工程理解」系统提示（Loop Engineering 纪律约束）
- `cocos-mcp-bridge` — Cocos 编辑器扩展（含 Codely 面板 + MCP Server）
