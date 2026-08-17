# Cocos MCP Stack — 接收方安装指南 (QUICKSTART)

> 本仓库是 **Cocos AI 工程助手** 的完整可分发单元：`cocos-codely`（dsh 客户端插件）+ `cocos-mcp-bridge`（Cocos Creator 编辑器扩展）+ `agent-presets`（专家团预设）+ 安装器。
> 完整分工/排查见 `AGENTS.md`。本文只讲"拿到仓库 → 装好 → 能用"。

## 0. 前置

- Windows 10/11，已装 **Git** 与 **Node.js 18+**
- **Cocos Creator 3.x**（编辑器本体；bridge 是编辑器扩展，必须装进你的 Creator）
- 一个 Cocos 工程（用于载入后让 bridge 起 8765）

## 1. 克隆（私有仓，需被加成协作者）

```bash
git clone https://github.com/hhhh124hhhh/cocos-extensions.git
cd cocos-extensions
```

## 2. 安装（推荐用安装器）

```bash
node install-cocos-stack.mjs
```

- 装完后：`cocos-codely`（dsh 插件）→ `~/.dsh/profiles/web`；`cocos-mcp-bridge`（编辑器扩展）→ `~/.CocosCreator/extensions/`
- **自包含拷贝**（不依赖你本地路径，适合分发）：`node install-cocos-stack.mjs --copy-bridge`
- 手动安装见 `AGENTS.md`

## 3. 启用（装完 ≠ 能用，时序关键）

1. 彻底关掉 CocosCreator.exe + CocosDashboard.exe 全部进程
2. 重开 Creator → **载入你的工程** → 顶部菜单 `扩展 / Extension Manager` → 启用 `cocos-mcp-bridge`
3. 确认 8765 起来：`netstat -ano | findstr :8765` 应见 `LISTENING`（或 `curl -X POST http://127.0.0.1:8765/` 返回 4xx 而非连接失败）

> **必须先起 8765，再开 dsh 会话**——MCP 工具在会话初始化时挂载，中途起的服务不会注入已存在的会话。

## 4. 挂进 dsh

用 `cocos-codely/dsh-cocos-mount.patch.yml`（streamable-http → `http://127.0.0.1:8765/`）：

```bash
cd D:/deepseek-harness
node --import tsx/esm apps/cli/src/bin.ts web --patch D:/path/to/cocos-codely/dsh-cocos-mount.patch.yml
```

## 5. 验证

1. **确认 8765 已监听**（第 3 步）→ 再启动/重开 dsh
2. 新会话里工具表应出现 `mcp__cocos__*`（场景/节点/资源等编辑器工具）
3. 让 AI 试一个：读取/列出当前工程场景 → 应能操作

## 常见坑

| 症状 | 原因/解法 |
|---|---|
| `mcp__cocos__*` 没出现 | 会话早于 8765 启动 → **先起 8765 再新开会话**；`Ctrl+Shift+R` 只刷新 UI 不重挂 MCP |
| 8765 不监听 | Creator 没载入工程 / 扩展没启用 → 回到第 3 步；检查扩展管理器里 `cocos-mcp-bridge` 是否启用 |
| 装完 dsh 插件没生效 | 看 `~/.dsh/profiles/web` 下插件是否在；重开 dsh |
| 多开 Creator 进程 | bridge 可能绑定冲突 → 全关再开 |

## 其他

- **专家团预设**：`agent-presets/`，配合 AgentTeams 用（见 AGENTS.md）
- **多引擎并行**：cocos 与 godot（`godot-extensions` 仓库）是两个独立轨，可同时挂进 dsh
