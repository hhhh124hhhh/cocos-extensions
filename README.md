# Cocos MCP Stack

**让 AI 直接驱动 Cocos Creator 做游戏开发** — DeepSeek Harness + MCP 全栈方案

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-rc.8-orange.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![Cocos](https://img.shields.io/badge/Cocos-3.8.x-blue.svg)](https://www.cocos.com/creator)

---

把 **dsh 客户端插件（`cocos-codely`）** 与 **Cocos Creator 编辑器扩展（`cocos-mcp-bridge`）** 打包成一个可分发仓库，让 dsh / agent 能直接驱动 Cocos Creator 做游戏开发。

## ✨ 这是什么

一句话：**AI 直接操作 Cocos Creator 场景**。

- 🎯 **场景操作** — AI 创建节点、设置属性、挂载脚本
- 🔨 **构建验证** — AI 触发构建，读取报错，自动修复
- 👁️ **视觉验证** — 截图对比，像素级 UI 还原度检查
- 🧠 **专家预设** — Loop Engineering 方法论，AI 遵循工程纪律
- 👥 **多 Agent 团队** — 7 角色游戏开发工作室（可选）

## 🏗️ 组件

| 组件 | 角色 | 安装位置 |
|---|---|---|
| `cocos-codely` | dsh 客户端插件（"电话线"） | `~/.dsh/profiles/web` |
| `cocos-mcp-bridge` | Cocos Creator 编辑器扩展（"接电话的人"） | `~/.CocosCreator/extensions/` |
| `agent-presets/` | 专家团预设（7 角色 + Cocos Game Studio 队长）+ AgentTeams | `~/.dsh/.agent-presets/` |

> ⚠️ **两者必须同时存活**。dsh 插件只负责"打电话"（把 MCP 调用发到 `http://127.0.0.1:8765/`）；真正干活的是 Cocos 编辑器里跑的 bridge HTTP 服务。缺了 bridge，dsh 插件就是空谈。

## 🎬 效果演示

```
你：「在 Canvas 下创建一个按钮，居中显示，点击时播放音效」

AI：
  1. query_scene → 确认 Canvas 节点 uuid
  2. create_button → 创建按钮节点
  3. set_property → 设置 position、锚点
  4. save_scene → 保存场景
  5. build → 构建验证
  6. vision_html_screenshot → 截图确认效果
```

## 🚀 快速安装

```bash
git clone https://github.com/hhhh124hhhh/cocos-extensions.git
cd cocos-extensions
node install-cocos-stack.mjs
```

安装器参数：

| 参数 | 说明 |
|---|---|
| `--profile <name>` | dsh profile，默认 `web` |
| `--try-dsh` | 先试官方 `dsh plugin add`（EDR 拦截时自动回退） |
| `--copy-bridge` | 拷贝而非 junction（**分享给别人时用**） |
| `--dry-run` | 只打印，不落盘 |

## 📖 手动安装 / 详细教程

见 **[AGENTS.md](./AGENTS.md)** — agent 安装指南，含：
- 组件分工心智模型
- 前置条件
- 一键/手动两条路
- 验证命令
- **运行时必做 5 步**
- 常见坑排查

## ✅ 启用（装完 ≠ 能用）

1. 彻底关掉 CocosCreator.exe + CocosDashboard.exe 全部进程
2. 重开 Creator → **载入任意一个工程** → 顶部菜单 `扩展` → 启用 `cocos-mcp-bridge`
3. 回 dsh（3080）→ `Ctrl+Shift+R` 硬刷新 → 选 `Cocos Codely` 预设

bridge 的 `browser.js` 在「载入工程 + 扩展启用」时 `startServer()`，8765 自起；之后 dsh 里出现 `mcp__cocos__*` 工具即打通。

### ⚡ 启动顺序（重要！）

MCP 工具在 **dsh 会话初始化时** 注册，中途起来的服务不会注入已存在的会话：

1. **先** 开 Cocos Creator → 载入工程 → 启用 bridge（8765 开始监听）
2. **确认** 8765 活着：`netstat -ano | grep 8765` 应见 `LISTENING`
3. **再** 启动/重开 dsh 会话 → 工具表出现 `mcp__cocos__*`

> 💡 **常见坑**：dsh 会话先开着、8765 后起 → 当前会话没有工具。`Ctrl+Shift+R` 硬刷新**不会重新挂载 MCP**，正确做法是**新开一个会话**。

## 🔧 MCP 工具列表

AI 可以调用的 Cocos 工具（`mcp__cocos__` 前缀）：

| 工具 | 功能 |
|------|------|
| `query_scene` | 查询场景树 |
| `inspect_node` | 查看节点详情 |
| `create_node` | 创建节点 |
| `set_property` | 设置属性 |
| `delete_node` | 删除节点 |
| `save_scene` | 保存场景 |
| `build` | 构建项目 |
| `get_console` | 读取控制台日志 |
| `generate_sprite` | AI 生成精灵图 |
| `generate_image` | AI 生成任意图片 |

## 👥 多 Agent 团队（AgentTeams）

新会话选 **「Cocos Game Studio」** 队长预设，说「用 AgentTeams 做 X」即可拉一支游戏开发工作室团队：

- 队长建队 → 按角色加成员（玩法/美术音效/叙事/品类策略/发行/引擎实现/工程）
- 拆有依赖的任务 → 协调汇报 → 汇总拍板
- Web UI 有实时团队活动面板

依赖第三方插件 `@nanmicoder/dsh-agent-teams`（MIT）— 安装器会自动挂载。

## 📝 方法论

预设注入的 **Loop Engineering** 纪律：

1. **先读后写** — 改之前先 `query_scene` 看清现状
2. **小步提交** — 一次只改一件事
3. **构建验证** — 改完必须 build + get_console
4. **错误归因** — 按真实报错修，不猜
5. **视觉验证** — UI 改动必须截图对比

## 🔗 组件各自文档

- `cocos-codely`：[`cocos-codely/README.md`](./cocos-codely/README.md)、[`cocos-codely/QUICKSTART.md`](./cocos-codely/QUICKSTART.md)
- `cocos-mcp-bridge`：[`cocos-mcp-bridge/README_CN.md`](./cocos-mcp-bridge/README_CN.md)

## 📤 分享给别人

整个仓库自包含。接收方 `git clone` + 跑安装器即可；或更换机器时用 `node install-cocos-stack.mjs --copy-bridge` 打一份不依赖你本地路径的自包含拷贝。

## 📄 License

MIT © 2026 hhhh124hhhh

## 💬 交流

欢迎提 Issue 讨论，或加微信  + 'hhhh124hhhh' + （备注 Cocos Codely）入群交流。
