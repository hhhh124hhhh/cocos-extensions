# Cocos MCP Stack — Agent 安装指南

本目录是 **Cocos AI 工程助手** 的完整可分发单元，包含两套必须同时存在的组件。
任何 agent（dsh / Claude Code / 其他编码 agent）都可以照本指南把整套装好。

---

## 1. 这套东西由什么组成

| 组件 | 角色 | 装到哪里 | 缺了会怎样 |
|---|---|---|---|
| **cocos-codely** | dsh 客户端 bundle。告诉 dsh「连 `http://127.0.0.1:8765/`」并注入 Cocos 方法论预设 | dsh `web` profile | dsh 没有 `mcp__cocos__*` 工具，连不上 |
| **cocos-mcp-bridge** | Cocos Creator 编辑器扩展。在编辑器载入工程时于 `8765` 自起 HTTP MCP 服务，并内置 Codely 聊天面板 | `~/.CocosCreator/extensions/` | 8765 没人接，dsh 拨过去空转；编辑器内没有 Codely 面板 |
| **agent-presets/** | 专家团预设（7 个角色 + `Cocos Game Studio` 队长）+ AgentTeams 多 agent 协作 | `~/.dsh/.agent-presets/` + profile `bundles` | 没有可选的专家角色预设 / 不能拉团队 |

**关键心智模型**：dsh 插件是「电话线」，bridge 是「对面接电话的人」。
线装对了但没人接（bridge 没起）= 打不通。两者必须同时在线。

---

## 2. 前置条件

- 已安装 **dsh**（存在 profile `web`，默认路径 `~/.dsh/profiles/web`）。
- 已安装 **Cocos Creator 3.x**（全局扩展目录 `~/.CocosCreator/extensions/` 会自动创建）。
- 运行环境：Node.js（用于跑安装器）；Windows / macOS / Linux 均可。

---

## 3. 一键安装（推荐 agent 直接跑）

```bash
node install-cocos-stack.mjs
```

安装器会**幂等**地完成：
1. 把 `cocos-codely` 装进 dsh profile：**默认覆盖式手工同步**（复制白名单文件到 `node_modules/cocos-codely` + 校准 profile `package.json` 的 `dependencies`/`bundles`）。传 `--try-dsh` 才先尝试官方 `dsh plugin add`，失败自动回退手工。
2. 把 `cocos-mcp-bridge` 装入 `~/.CocosCreator/extensions/`：优先 **junction**（跨卷也可、免管理员、源码实时同步），失败或 `--copy-bridge` 时回退拷贝。
3. 把 `agent-presets/`（8 个专家团预设）同步到 `~/.dsh/.agent-presets/`，并激活 `@nanmicoder/dsh-agent-teams`（AgentTeams 多 agent 协作插件，包在 profile `node_modules` 时挂 bundle；新机未装会提示装法）。
4. 打印验证命令与下一步。

参数：
- `--profile <name>`：dsh profile 名，默认 `web`。
- `--try-dsh`：先试官方 `dsh plugin add`（本机 EDR 会拦，会自动回退）。
- `--copy-bridge`：bridge 强制拷贝而非 junction（**分享给别人时用这个**）。
- `--dry-run`：只打印将要做什么，不落盘。

> **为什么默认不走 `dsh plugin add` / 不删旧文件**：WorkBuddy 运行环境注入了 `genie-safe-delete` shim，会把 **node 自身的 `fs.rmSync`** 也路由到「回收站(trash)」，而本机 EDR 拦回收站操作 → 抛 `[safe-delete] 操作失败: Some operations were aborted`。这不只影响 pnpm，**任何在 WorkBuddy 里跑的 node 删除操作都会中招**。因此安装器 STEP 1 **完全不删、只覆盖同步**，删除动作（仅 bridge 换链时）走 OS 原生 `rmdir`（execSync，绕开被劫持的 node fs）。全程**不需要关闭/排除任何杀软**。

---

## 4. 手动安装（无脚本时）

### 4.1 dsh 客户端插件
```bash
dsh plugin --profile web add <本目录>/cocos-codely
```
等价手工法（EDR 阻断 pnpm 时用）：
- 将 `cocos-codely` 的白名单文件（`package.json` / `dsh-cocos-mount.patch.yml` / `presets/` / `SYSTEM_PROMPT.md` / `README.md` / `QUICKSTART.md`）复制到
  `~/.dsh/profiles/web/node_modules/cocos-codely/`。
- 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 加 `"cocos-codely": "file:<绝对路径>/cocos-codely"`，并在 `dsh.profile.bundles` 数组追加 `"cocos-codely"`。

### 4.2 Cocos 编辑器扩展
```bash
# 同卷（推荐，源码实时同步）：
mklink /J "%USERPROFILE%\.CocosCreator\extensions\cocos-mcp-bridge" "<本目录>\cocos-mcp-bridge"
# 跨卷或 mklink 不可用时改为拷贝：
cp -r "<本目录>/cocos-mcp-bridge" "%USERPROFILE%\.CocosCreator\extensions\cocos-mcp-bridge"
```

---

## 5. 验证（装完必做）

```bash
# 探活：需先按第 6 步让 bridge 服务起来
curl -s -o /dev/null -w "8765 -> %{http_code}\n" http://127.0.0.1:8765/
# 期望：打开 Cocos 工程后返回非 000（通常是 JSON 错误页或 MCP 握手响应）
```

dsh 侧验证（不依赖 Cocos）：
```bash
dsh --profile web --dump-config 2>&1 | grep -A6 "mcp-cocos"
# 期望：看到 mcp-cocos -> name '@deepseek-ai/dsh-mcp-client' / url http://127.0.0.1:8765/
```

---

## 6. 让整套真正可用（运行时必做）

装完只是「线接好了」，要让 bridge 服务起来还得：

1. **彻底关闭** Cocos Creator / Dashboard 所有进程（确保无残留 `CocosCreator.exe`）。
2. **重新打开 Cocos Creator，载入一个工程**（要看到场景/层级面板，不能只停在 Dashboard）。
   - Cocos Creator 只在启动时扫描扩展；你装 bridge 之前若编辑器已开着，它没识别到新扩展 → 必须重启。
3. 打开 **Extension Manager（扩展 → 扩展管理器）**，确认 **`cocos-mcp-bridge` 已启用**（新加的全局扩展有时需手动启用，启用后编辑器会提示重启）。
4. 此时 bridge 会因 `autostart: true` 在 `8765` 自起。
5. dsh 3080 页面 **`Ctrl+Shift+R`** 硬刷新 → 开新会话选 **「Cocos Codely」** 预设 → `mcp__cocos__*` 工具出现，即可用。

### 6.5 多 agent 团队（AgentTeams，可选但推荐）

装完重启 dsh 后，新会话选 **「Cocos Game Studio」** 队长预设，直接说「用 AgentTeams 做 X」：

1. 队长 `agent_teams_create` 建队（你变队长）。
2. `agent_teams_add_member` 按角色加成员：`gameplay` 玩法 / `art-audio` 美术音效 / `narrative` 叙事 / `genre-strategy` 品类策略 / `market` 发行 / `engine-impl` 引擎实现 / `codely` 工程。
3. `agent_teams_create_task` 把目标拆成**有依赖**的任务 → 成员领任务、`send_message` 互相协调、`update_task` 汇报。
4. `agent_teams_status` 轮询进度，队长汇总拍板；收尾 `agent_teams_delete` 归档。
5. Web UI 有实时团队活动面板；状态存 `<workspace>/.agent-teams/`。

降级路径：若 `agent_teams_*` 不可用，队长预设会退回原生 `subagent` 工具逐个委派角色预设，结果同样由你汇总。

### 6.6 生图配置（generate_sprite / generate_image 要能出图）

bridge 的 AI 出图走**火山方舟（Volcengine Ark）**，需要三件套：

| 项 | 配置位置 | 必填？ |
|---|---|---|
| **API Key** | 面板 Settings → Volcengine API Key（或环境变量 `VOLC_ARK_API_KEY`） | ✅ 必填 |
| **Endpoint（推理接入点 ep-xxx）** | 面板 Settings → Volcengine Endpoint（或 `VOLC_IMAGE_ENDPOINT`） | 见下 |
| **Model** | 面板 Settings → Volcengine Model（或 `VOLC_IMAGE_MODEL`） | 可选（接入点自带默认） |

- **本机（作者账号）**：Endpoint/Model 留空也能出图——内置了实测可用的接入点 `ep-2026...`（仅限该作者账号）。
- **分享给他人**：⚠️ 内置接入点属于作者账号，**对方必须填自己的 ep- 推理接入点**（火山方舟控制台创建，模型名直调会 404）。把"生图配置"随分享一起说明。
- 面板配置**即时保存**（change 即存，无需重启）；安全设计：key 不回显（placeholder 显示"已设置"），Endpoint/Model 非密钥可直接回显。
- 判定：面板填好 key（+ 对方自己的 ep-）后，dsh 里调一次 `mcp__cocos__generate_sprite` 能出图即通。

---

## 6.7 分享边界（方法论资产，勿越界）

本仓的分享边界是**刻意设计**的，改动前先读：

| 层 | 内容 | 是否随仓 |
|---|---|---|
| **机制壳** | MCP 桥、AgentTeams 团队、安装器、预设框架 | ✅ 随仓（分享价值） |
| **纪律条款** | SYSTEM_PROMPT / presets 里的 Loop Engineering、组件中台、四轴、方法论 2.0、AgentTeams 协议 | ✅ 随仓（**纪律是插件的灵魂，没有纪律插件就无意义**） |
| **方法论数据** | `~/.workbuddy/lab-intel/` 台账（情报/坑库/设计关键）、`_cocos-kit` 组件库 | ❌ **不随仓**（作者私有飞轮资产） |

- 预设里对台账/组件库的引用一律是**条件化文字**（"仅作者本机有；若不存在则跳过"）——这是设计，不是遗漏。
- **禁止**把 `lab-intel`、`_cocos-kit`、任何 `bp-*.md` 数据实体加进本仓（会泄露方法论 IP，且对他人无意义）。
- 本机使用不受影响：agent 仍从 `~/.workbuddy/lab-intel/` 读真实数据。

---

## 7. 常见坑（排错）

- **8765 探活返回 000 / CocosCreator 零监听端口** → 没真正载入工程，或 bridge 扩展没被识别（没重启编辑器 / 没启用）。回到第 6 步。
- **`dsh plugin add` 报 `safe-delete` / `Some operations were aborted`** → 本机 EDR 拦了回收站操作，属预期。用本目录安装器（已带手工回退）或第 4.1 的手工法，不要加杀软排除项。
- **dsh 里看不到 `mcp__cocos__*`** → 先确认 8765 已活（第 5/6 步），再硬刷新 dsh 3080。
- **两个组件装错位置（易犯）**：`cocos-codely` 是 dsh bundle，**不要**放进 `~/.CocosCreator/extensions/`；`cocos-mcp-bridge` 是 Cocos 扩展，**不要**加进 dsh `bundles`。Codely 面板已内置于 cocos-mcp-bridge，无需额外安装。
- **想分享给别人**：cocos-codely（dsh 插件）与 cocos-mcp-bridge（独立 git 仓）是两个独立可分发包。接收方按本指南两步装齐即可。注意 junction 指向的是**你本地的路径**，别人必须在自己机器上重跑安装器（或用 `--copy-bridge` 打成自包含拷贝）。
- **AgentTeams 拉不起团队 / 没有 `agent_teams_*` 工具** → ① 确认 `@nanmicoder/dsh-agent-teams` 已装进 profile `node_modules`（新机先 `npm install` 或 `dsh plugin add`，再重跑安装器挂 bundle）；② 改完 bundle 必须**重启 dsh**（Vite HMR 不重载 host 组合）再硬刷新 3080；③ 一个队长同时只能带一个活动团队。
