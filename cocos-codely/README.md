# Cocos Codely

**让 AI 直接操作 Cocos Creator 场景** — DeepSeek Harness 插件

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-rc.8-orange.svg)](https://github.com/deepseek-ai/deepseek-harness)

---

## ✨ 这是什么

Cocos Codely 是一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，让 AI 能**直接读写 Cocos Creator 场景**：

- 🎯 **场景操作**：创建节点、设置属性、挂载脚本 — AI 直接调用 MCP 工具
- 🔨 **构建验证**：AI 触发构建，读取报错日志，自动修复
- 👁️ **视觉验证**：截图对比，像素级 UI 还原度检查
- 🧠 **专家预设**：注入 Loop Engineering 方法论，AI 遵循工程纪律

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

## 🏗️ 架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   DSH Web UI    │────▶│  Cocos Codely   │────▶│ cocos-mcp-bridge│
│   (AI 对话)      │     │   (preset)      │     │   (MCP Server)  │
│   :3080         │     │                 │     │   :8765         │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Cocos Creator   │
                                                 │   编辑器        │
                                                 └─────────────────┘
```

## 🚀 快速开始

### 前置条件

- Node.js ≥ 22
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 已安装
- Cocos Creator 3.8.x 已安装
- [cocos-mcp-bridge](../cocos-mcp-bridge) 已启动（`:8765`）

### 安装

```bash
# 方式 1：一键安装（推荐）
node install-cocos-stack.mjs

# 方式 2：手动安装
dsh plugin --profile web add ./cocos-codely
```

### 使用

1. 启动 Cocos Creator，打开你的项目
2. 启动 cocos-mcp-bridge（默认 `:8765`）
3. 启动 DSH：`dsh web`
4. 打开 http://127.0.0.1:3080
5. 选择 **「Cocos Codely」** 预设
6. 开始对话！

## 📦 包含内容

| 文件 | 作用 |
|------|------|
| `presets/cocos/agent.cordis.yml` | 专家预设（persona）— Loop Engineering 纪律 |
| `dsh-cocos-mount.patch.yml` | MCP 挂载配置 |
| `SYSTEM_PROMPT.md` | 系统提示词源文档 |
| `QUICKSTART.md` | 端到端教程 |

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

## 👁️ 视觉验证

配合 [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) 实现截图验证闭环：

```
改代码 → 构建 → 截图 → 像素对比 → 差异 > 5% → 定位修复 → 再验证
```

## 📝 方法论

预设注入的 **Loop Engineering** 纪律：

1. **先读后写** — 改之前先 `query_scene` 看清现状
2. **小步提交** — 一次只改一件事
3. **构建验证** — 改完必须 build + get_console
4. **错误归因** — 按真实报错修，不猜
5. **视觉验证** — UI 改动必须截图对比

## 🔗 相关项目

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — AI Agent 运行时
- [cocos-mcp-bridge](../cocos-mcp-bridge) — Cocos MCP Server
- [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) — 视觉验证插件

## 📄 License

MIT © 2026 hhhh124hhhh