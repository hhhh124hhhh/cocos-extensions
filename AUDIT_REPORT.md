# Cocos MCP Stack 审查报告

> 审查对象：`D:\ai-game-workstation\cocos-extensions`（cocos-codely + cocos-mcp-bridge + agent-presets + 安装器）
> 对照要求：AGENTS.md 安装指南、分享边界、Cordis preset 规范、Cocos 扩展 v2 规范

---

## 一、总体结论

**✅ 核心结构合规，分享边界清白，可分发。**

但存在 **1 个中等优先级文档/安装器缺口** 和 **2 个低优先级优化项**，详见下文。

---

## 二、分项审查

### 2.1 cocos-codely（dsh 客户端插件 / Cocos 扩展）

| 检查项 | 状态 | 说明 |
|---|---|---|
| package.json 结构 | ✅ | name/version/package_version:2/main/panels/contributions/scripts/files/dsh.bundle.patch 齐全 |
| 白名单文件 | ✅ | package.json、dsh-cocos-mount.patch.yml、presets/、SYSTEM_PROMPT.md、README.md、QUICKSTART.md、AGENTS.md 全部存在 |
| dsh-cocos-mount.patch.yml | ✅ | 正确配置 mcp-cocos → http://127.0.0.1:8765/，transport: streamable-http，reconnect 策略完整 |
| tsconfig.json | ✅ | target ES2020、module node16、outDir dist、allowJs、skipLibCheck |
| src/main.ts | ✅ | 不 spawn dsh、不持有 dsh 路径，仅 load/unload/openPanel |
| src/panels/default/index.js | ✅ | iframe 3080、boot mask、轮询探活、90s 超时、退化重载逻辑完整 |
| dist/ 编译产物 | ✅ | 存在（dist/main.js、dist/panels/default/） |
| **files 数组缺 dist/** | ⚠️ | package.json `files` 未包含 `dist/` 和 `src/`。对 dsh bundle 无影响（bundle 只读 patch + presets），但**作为 Cocos 扩展安装时**，若只复制 files 白名单会导致 `dist/main.js` 缺失、扩展加载失败 |

**关键发现**：cocos-codely 身兼二职——既是 dsh bundle（供 dsh 加载 patch），又是 Cocos 扩展（供编辑器加载面板）。但：
- `AGENTS.md` 和 `install-cocos-stack.mjs` **只安装了 dsh bundle 部分**（复制到 profile node_modules）
- **没有将 cocos-codely 安装为 Cocos 扩展**（即没有复制/链接到 `~/.CocosCreator/extensions/` 或项目 `extensions/`）
- 而 `cocos-codely/README.md` 明确说「把本目录软链或拷贝为 `<Cocos工程>/extensions/cocos-codely/`」

**结论**：安装文档与脚本**遗漏了 cocos-codely 的 Cocos 扩展安装步骤**。用户按 AGENTS.md 一键安装后，dsh 侧工具可用，但**编辑器内不会出现 Codely 面板**（因为扩展没装进 Cocos）。

---

### 2.2 cocos-mcp-bridge（Cocos 编辑器扩展 / MCP Server）

| 检查项 | 状态 | 说明 |
|---|---|---|
| package.json 结构 | ✅ | package_version:2、main: browser.js、panels（3 个）、contributions（menu/messages/scene）、bin、mcpName、keywords、engines 齐全 |
| server.json | ✅ | MCP 服务器清单，name/io.github.ai-game-studio/cocos-mcp-bridge，version 0.5.0，transport: stdio |
| 目录结构 | ✅ | lib/、panel/、i18n/、bin/、docs/、test/、browser.js、scene.js 齐全 |
| lib/tools/ | ✅ | assets-advanced.js、cocos-project.js、files.js、image-gen.js、scene-events.js 共 5 组工具 |
| LICENSE | ✅ | MIT |
| README.md / README_CN.md | ✅ | 双语文档 |

**结论**：cocos-mcp-bridge 结构完整，符合 Cocos 扩展 v2 规范，可直接发布到 Cocos Store。

---

### 2.3 agent-presets（专家团预设）

| 检查项 | 状态 | 说明 |
|---|---|---|
| 预设数量 | ✅ | 8 个：cocos-game-studio（队长）+ cocos-gameplay、cocos-art-audio、cocos-narrative、cocos-genre-strategy、cocos-market、cocos-engine-impl、cocos-codely（7 角色） |
| preset.yml | ✅ | 每个预设目录都有 name/description/order |
| agent.cordis.yml | ✅ | 每个预设目录都有，cocos-game-studio 含 AgentTeams 协议与角色清单 |
| Cordis 规范 | ✅ | persona/shell/fs/jobs/skills/goals/planning/compaction/delegation 等行完整，isolate realm 使用正确 |

**结论**：预设结构规范，可直接同步到 `~/.dsh/.agent-presets/`。

---

### 2.4 分享边界（AGENTS.md §6.7）

| 检查项 | 状态 | 说明 |
|---|---|---|
| 无 `lab-intel/` 目录 | ✅ | 仓库内不存在 |
| 无 `_cocos-kit/` 目录 | ✅ | 仓库内不存在 |
| 无 `bp-*.md` 文件 | ✅ | 全仓搜索无命中 |
| 私有资产引用方式 | ✅ | 所有引用均为条件化文字：「仅作者本机有；若不存在则跳过此约束」 |

**结论**：分享边界严格遵守，方法论数据未越界入仓。

---

### 2.5 install-cocos-stack.mjs（一键安装器）

| 检查项 | 状态 | 说明 |
|---|---|---|
| 幂等设计 | ✅ | 覆盖式同步、junction 幂等检测、profile package.json 幂等校准 |
| EDR 兼容 | ✅ | 不调用 fs.rmSync，用 execSync 调系统 rmdir/unlink 绕 safe-delete shim |
| 三步安装 | ✅ | STEP1 cocos-codely → dsh profile、STEP2 cocos-mcp-bridge → Cocos 扩展、STEP3 agent-presets → ~/.dsh/.agent-presets |
| AgentTeams 激活 | ✅ | 检测 @nanmicoder/dsh-agent-teams 并自动挂 bundle |
| **缺 cocos-codely 扩展安装** | ⚠️ | 脚本只把 cocos-codely 当 dsh bundle 装，没有把它链到 Cocos 扩展目录 |

---

## 三、问题汇总与修复建议

### 🔶 问题 1：cocos-codely 的 Cocos 扩展安装被遗漏（中等优先级）

**现象**：
- `AGENTS.md` 说「cocos-codely 只属于 dsh profile，不要放进 `~/.CocosCreator/extensions/`」
- 但 cocos-codely 的代码（main.ts、panels/、package.json 的 main/panels/contributions）**明确是一个 Cocos 扩展**
- `install-cocos-stack.mjs` 没有把 cocos-codely 装进任何 Cocos 扩展目录
- 用户按文档一键安装后，编辑器里**看不到 Codely 面板**

**修复方案（二选一）**：

**方案 A：让 cocos-codely 回归纯 dsh bundle（推荐，最干净）**
- 把面板代码从 cocos-codely 迁出，合并到 cocos-mcp-bridge（cocos-mcp-bridge 已经有 3 个面板，再加一个 Codely 面板）
- cocos-codely 只保留 dsh bundle 所需文件（package.json、patch.yml、presets/、md 文档）
- 这样 AGENTS.md 的说法就成立了：cocos-codely 确实「只属于 dsh profile」

**方案 B：接受 cocos-codely 身兼二职，补全安装文档/脚本**
- 在 `install-cocos-stack.mjs` 增加 STEP 1.5：把 cocos-codely 也 junction/cp 到 `~/.CocosCreator/extensions/cocos-codely`（或项目级 extensions）
- 修改 `AGENTS.md` 第 4 节，明确说明 cocos-codely 需要同时装到两个地方（dsh profile + Cocos 扩展目录）
- 修改「常见坑」一节，删除「cocos-codely 只属于 dsh profile」的绝对化表述

---

### 🔹 问题 2：cocos-codely/presets/cocos/ 与 agent-presets/cocos-codely/ 重复（低优先级）

**现象**：两个目录内容几乎相同（都是 Cocos Codely 的 agent preset）。

**说明**：这可能是 intentional 的——`cocos-codely/presets/cocos/` 供 dsh bundle 挂载用，`agent-presets/cocos-codely/` 供独立同步到 `~/.dsh/.agent-presets/` 用。但维护两份副本容易漂移。

**修复建议**：在 `install-cocos-stack.mjs` 的 STEP 3 中，除了同步 `agent-presets/` 下的 8 个预设，也把 `cocos-codely/presets/cocos/` 同步为 `~/.dsh/.agent-presets/cocos-codely/`（覆盖或校验一致性），确保单点真相。

---

### 🔹 问题 3：cocos-codely package.json `files` 数组（低优先级）

**现象**：`files` 未包含 `dist/` 和 `src/`。

**影响**：
- 对 dsh bundle 场景：无影响（bundle 只读 patch + presets）
- 对「用 npm pack 分发 Cocos 扩展」场景：`dist/` 会被排除，扩展无法加载

**修复建议**：如果 cocos-codely 需要作为独立 npm 包发布（供 Cocos Store 或 npm install），应在 `files` 中追加 `"dist"`、`"src"`、`"tsconfig.json"`。若仅作为源码分发（用户自己 `npm run build`），则保持现状即可。

---

## 四、合规性总评

| 维度 | 评分 | 说明 |
|---|---|---|
| 结构完整性 | ⭐⭐⭐⭐⭐ | 三组件齐全，目录规范 |
| 安装脚本 | ⭐⭐⭐⭐☆ | 幂等、EDR 兼容，但缺 cocos-codely 扩展安装 |
| 分享边界 | ⭐⭐⭐⭐⭐ | 无私有资产入仓，条件引用规范 |
| 文档一致性 | ⭐⭐⭐☆☆ | AGENTS.md 与代码实际行为存在矛盾 |
| 预设规范 | ⭐⭐⭐⭐⭐ | 8 预设完整，Cordis 写法标准 |

**结论**：**符合分发要求**，但建议修复问题 1（文档/安装器缺口）后再对外分享，否则接收方会遭遇「装完没有 Codely 面板」的困惑。
