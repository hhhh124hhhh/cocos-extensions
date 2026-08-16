# asset-gen MCP server（cocos-codely 第 1 批生图）

把火山方舟（Volcengine Ark）文生图接入 dsh，让 Cocos 面板里的 AI 也能生成 **2D 精灵 / 图片 / UI 图** 并直接落盘到工程 `assets/`。纯 Node 零依赖，照搬 funplay-cocos-mcp 的 streamable-http 传输。

## 后端说明
本机 WorkBuddy 的 ImageGen 工具是**进程内工具**，没有独立 HTTP 端点给 dsh 直连。所以 asset-gen 直接调**火山方舟图像 API**（`ark.cn-beijing.volces.com/api/v3/images/generations`），与你 ImageGen 同后端。dsh 在哪都能独立出图，不依赖 WorkBuddy。

## 环境变量（必填）
- `VOLC_ARK_API_KEY` —— 火山方舟 API Key（**必填**，无则工具返回明确错误）
- `VOLC_IMAGE_MODEL` —— 默认 `doubao-seedream-3.0-t2i-250415`，可换其他方舟文生图模型
- `VOLC_IMAGE_BASE_URL` —— 默认 `https://ark.cn-beijing.volces.com/api/v3/images/generations`
- `ASSET_GEN_PORT` —— 默认 `9180`
- `COCOS_PROJECT_ROOT` —— 默认落盘工程根（工具也可在调用时传 `project_root`）

## 运行
```bash
cd cocos-codely/asset-gen
export VOLC_ARK_API_KEY=your-key
node src/server.js
# 或 npm start
```

## 暴露的 MCP 工具（dsh 经 patch 挂载后自动可见）
- `generate_sprite({prompt, name, category, size?, style_anchor?, ui_mode?, target_dir?, project_root?})`
  → 出图 + 写 `.meta` + 落盘，返回 `spriteFrame uuid`（`<uuid>@f9941`）供场景接线
- `generate_image({prompt, size?, style_anchor?, ui_mode?, target_dir?, project_root?})`
  → 出图 + 写 `.meta` + 落盘，返回路径与 uuid

## 落盘位置
默认 `<project_root>/assets/resources/textures/<category>_<name>.png`（+ `.png.meta`）。
Cocos Creator 重新打开/聚焦工程即自动识别导入。

## 风格一致性（铁律，详见 ASSET_GEN_DSH_SPEC.md §1）
先出 1 张满意的主角立绘定调（风格锚），后续全部在 `style_anchor` 里**逐字重复**该锚词，禁止近义替换，否则风格漂移。
