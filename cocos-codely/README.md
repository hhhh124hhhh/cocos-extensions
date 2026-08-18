# cocos-codely（dsh bundle）

Cocos Creator 版「团结 Codely」的 **dsh 客户端 bundle**。它只做两件事：

1. **挂载 MCP 配置**：通过 `dsh-cocos-mount.patch.yml` 把 `cocos-mcp-bridge` 的 HTTP MCP 服务（默认 `http://127.0.0.1:8765/`）挂进 dsh，让模型获得 `mcp__cocos__*` 系列工具。
2. **提供专家预设**：`presets/cocos/agent.cordis.yml` 给 dsh 注入 Cocos 工程理解的系统提示词（Loop Engineering 纪律）。

**本包不再包含 Cocos 扩展面板**。编辑器内聊天面板已迁移到 `cocos-mcp-bridge`（Codely 面板）。

---

## 目录结构

```
cocos-codely/
├── package.json              # dsh bundle manifest（dsh.bundle.patch）
├── dsh-cocos-mount.patch.yml # dsh patch：把 cocos-mcp-bridge 的 8765 MCP server 挂进 dsh
├── presets/
│   └── cocos/
│       └── agent.cordis.yml  # Cocos Codely 专家预设（persona）
├── SYSTEM_PROMPT.md          # 给 dsh 的「工程理解」系统提示（Loop Engineering 纪律）
├── README.md                 # 本文件
└── QUICKSTART.md             # 快速上手（端到端链路验证）
```

---

## 三个进程 / 三个端口

| 端口 | 谁 | 作用 |
| ---- | ---- | ---- |
| **3080** | `deepseek-harness`（dsh，AI 大脑） | 网页聊天界面 |
| **8765** | `cocos-mcp-bridge` | 场景读/写/构建 MCP 服务 |
| — | `cocos-codely` | **仅 dsh bundle**：patch + preset，不监听任何端口 |

---

## 安装（由 install-cocos-stack.mjs 自动完成）

不需要手动操作。运行仓库根目录的一键安装器即可：

```bash
node install-cocos-stack.mjs
```

安装器会：
1. 把本包的白名单文件复制到 `~/.dsh/profiles/web/node_modules/cocos-codely/`
2. 在 profile `package.json` 注册 `cocos-codely` 为 dependency + bundle

---

## 手动验证（dsh 侧）

```bash
dsh --profile web --dump-config 2>&1 | grep -A6 "mcp-cocos"
# 期望：看到 mcp-cocos -> name '@deepseek-ai/dsh-mcp-client' / url http://127.0.0.1:8765/
```

---

## 相关文件

- `dsh-cocos-mount.patch.yml` — dsh 挂载 cocos-mcp-bridge 的配置
- `SYSTEM_PROMPT.md` — 给 dsh 的「工程理解」系统提示（Loop Engineering 纪律约束）
- `cocos-mcp-bridge` — Cocos 编辑器扩展（含 Codely 面板 + MCP Server）
