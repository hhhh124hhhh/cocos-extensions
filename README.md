# Cocos MCP Stack

把 **dsh 客户端插件（`cocos-codely`）** 与 **Cocos Creator 编辑器扩展（`cocos-mcp-bridge`）** 打包成一个可分发仓库，让 dsh / agent 能直接驱动 Cocos Creator 做游戏开发。

## 组件

| 组件 | 角色 | 安装位置 |
|---|---|---|
| `cocos-codely` | dsh 客户端插件（"电话线"） | `~/.dsh/profiles/web` |
| `cocos-mcp-bridge` | Cocos Creator 编辑器扩展（"接电话的人"） | `~/.CocosCreator/extensions/` |

> ⚠️ **两者必须同时存活**。dsh 插件只负责"打电话"（把 MCP 调用发到 `http://127.0.0.1:8765/`）；真正干活的是 Cocos 编辑器里跑的 bridge HTTP 服务。缺了 bridge，dsh 插件就是空谈。

## 快速安装（推荐 agent 跑）

```bash
git clone <本仓库地址> cocos-extensions
cd cocos-extensions
node install-cocos-stack.mjs
```

安装器参数：

| 参数 | 说明 |
|---|---|
| `--profile <name>` | dsh profile，默认 `web` |
| `--try-dsh` | 先试官方 `dsh plugin add`（本机 EDR 会拦时自动回退手工同步，不碰杀软） |
| `--copy-bridge` | 把 bridge 拷贝（而非 junction）到扩展目录 —— **分享给别人时用这个**，避免链接指向你本地路径 |
| `--dry-run` | 只打印将要做什么，不落盘 |

## 手动安装 / 详细教程

见 **[AGENTS.md](./AGENTS.md)** —— agent 安装指南，含：组件分工心智模型、前置条件、一键/手动两条路、验证命令、**运行时必做 5 步**、常见坑（含"两个组件装错位置""8765 全死"等排查）。

## 启用（装完 ≠ 能用，运行时必做）

1. 彻底关掉 CocosCreator.exe + CocosDashboard.exe 全部进程
2. 重开 Creator → **载入任意一个工程** → 顶部菜单 `扩展 / Extension Manager` → 启用 `cocos-mcp-bridge`
3. 回 dsh（3080）→ `Ctrl+Shift+R` 硬刷新 → 选 `Cocos Codely` 预设

bridge 的 `browser.js` 在「载入工程 + 扩展启用」时 `startServer()`，8765 自起；之后 dsh 里出现 `mcp__cocos__*` 工具即打通。

## 组件各自文档

- `cocos-codely`：`cocos-codely/README.md`、`cocos-codely/QUICKSTART.md`
- `cocos-mcp-bridge`：`cocos-mcp-bridge/README_CN.md`

## 分享给别人

整个仓库自包含。接收方 `git clone` + 跑安装器即可；或更换机器时用 `node install-cocos-stack.mjs --copy-bridge` 打一份不依赖你本地路径的自包含拷贝。
