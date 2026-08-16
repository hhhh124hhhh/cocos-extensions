# Asset-Gen DSH 接入规格（第 1 批：2D 精灵 / 图片 / UI 图）

> 目的：把 `cocos-sprite-author` + `game-ai-asset-prompt-kit` 的 know-how 抄成 dsh asset-gen 的
> **agent 指令素材 + MCP tool 定义**，让 Cocos 面板里的 AI 也能生成精灵图 / 图片 / UI 图并直接落盘。
> 对标：https://codely-docs.tuanjie.cn/ai-generation-tools/intro （非 3D 部分）。
> 来源 skill：`cocos-sprite-author`（SKILL.md 全文）、`game-ai-asset-prompt-kit`（SKILL.md 全文）。

---

## 0. MCP Tools（asset-gen server 暴露给 dsh）

照搬 funplay 的 `streamable-http` 挂载模式（见 `dsh-cocos-mount.patch.yml` 的 `mcp-cocos`）。

### T1. `generate_sprite`
生成一张 2D 游戏精灵（角色 / 敌人 / 道具 / 头像），自动写 Cocos `.meta` 并落盘。
入参：
```
prompt: string            # 用户自然语言描述，如 "绿色史莱姆，正面，透明背景"
category: 'char'|'enemy'|'prop'|'ui'|'fx'|'bg'   # 命名前缀用
name: string              # 资产名，如 "slime_green"
size?: [w,h]              # 默认 [1024,1024]
style_anchor?: string     # 风格锚词（同名项目必带，保证一致性）
style_ref_image?: string  # 参考图路径（风格锚定点图）
target_dir?: string       # 落盘目录，默认 assets/resources/textures/
```
行为：
1. 拼 prompt（见 §2 模板）→ 调图像后端 → PNG 落盘 `target_dir/<category>_<name>.png`
2. 读真实 PNG 宽高 → 写 `.<name>.png.meta`（见 §4  Cocos 手写 .meta 模板，uuid 用 crypto.randomUUID）
3. 返回 spriteFrame uuid（`<uuid>@f9941`）供 scene/prefab 接线

### T2. `generate_image`
生成任意图片（概念图 / 场景 / 宣传图 / UI 大图），不强求 sprite-frame 接线。
入参：
```
prompt, size?, style_anchor?, style_ref_image?, target_dir?
ui_mode?: boolean         # true=UI 图标/UI 图专用构图（居中、透明、统一描边）
```
行为：拼 prompt（UI 模式用 §2.1.4 模板）→ 出图落盘 → 写普通 image `.meta`（含 sprite-frame subMeta）→ 返回 uuid。

---

## 1. 风格锚定工作流（顺序不可跳，铁律）
```
1. 风格锚定   → 先出 1 张满意的主角立绘（定调：画风/色板/视角）
2. 角色三视图 → 基于立绘生成正面/侧面/背面（保证后续不漂移）
3. 批量生成   → 敌人/道具/瓦片/UI，全部引用立绘作为风格锚
4. 动画生成   → 序列帧（idle/run/attack）——必须有参考图（本批不含，第 2 批）
5. 引擎集成   → 切图/导入/接线（本 skill 负责 Cocos 落盘）
6. 验证       → dsh cocos-verify 编译闸 + 实机看效果
```
**铁律**：跳过第 1 步直接批量生 = 风格漂移地狱。

## 2. 提示词模板（风格锚词必须逐字重复出现每条，禁止近义替换）

### 2.1 角色立绘（风格锚）
```
[角色名]，[风格锚词]风格，正面，全身立绘，背景透明，游戏角色设定图，高清 PNG
```

### 2.2 敌人 / 怪物（附参考图=主角立绘）
```
[敌人类型]，与参考图相同的[风格锚词]风格，[体型描述]，[姿态]，背景透明，侧视游戏精灵
```

### 2.3 瓦片 / 场景贴图（第 2 批 PBR 用，本批图片模式可出平铺）
```
[材质]无缝平铺贴图，[风格锚词]风格，tileable seamless，1024×1024，无文字无水印
```

### 2.4 UI 图标 / UI 图
```
[物品名]游戏道具图标，[风格锚词]风格，居中构图，正方形，背景透明，同一套图标统一描边粗细
```

## 3. 风格一致性三规则
1. **风格锚词逐字重复**——全项目只用一个锚词串（例："国风水墨剪影，暗色调，烛光氛围"），写进每条提示词
2. **参考图永远在场**——生成任何非首图资产时附上主角立绘作为 style reference
3. **批量前试单张**——每类资产先出 1 张验收，风格对再批量（错一张返工一批）

## 4. 资产命名规范（引擎无关）
```
<类别>_<名称>_<变体>.<ext>
```
| 前缀 | 例 |
|------|-----|
| `char_` | char_player.png / char_boss_phase2.png |
| `enemy_` | enemy_zombie_fast.png |
| `tile_` | tile_tomb_wall.png |
| `prop_` | prop_coffin.png / prop_torch.png |
| `ui_` | ui_btn_settings.png / ui_frame_hud.png |
| `fx_` | fx_candle_glow.png |
| `bg_` | bg_tomb_far.png（far/mid/near 视差层） |

动画帧（第 2 批）：`char_player_idle_00.png` …（两位序号从 00 起）。

## 5. 尺寸规格表
| 用途 | 生成尺寸 | 注意 |
|------|---------|-----------|
| 主角/敌人立绘 | 1024×1024 | 同一场景统一 pixels_per_unit，靠裁剪控身高 |
| 瓦片 | 256² 或 512² | 必须 2 的幂方便平铺 |
| UI 图标 | 256×256 | 2 倍图，引擎内缩 0.5 显示 |
| 序列帧单帧（第 2 批） | 512×512 | 帧间画布尺寸必须一致 |

**统一原则**：同一场景所有精灵用同一 pixels_per_unit，只改裁剪不改密度。

## 6. Cocos 落盘规则（手写 .meta，引 cocos-sprite-author 模板）
- PNG + `<name>.png.meta` 同置于 `assets/resources/textures/`（或 assets/ 子目录）
- `.meta` 必须匹配 Cocos image importer 格式（`ver:1.0.27`），否则 sprite 解析为 null/白
- spriteFrame 引用用全 uuid + `@f9941`（如 `341068d1-...@f9941`）；组件 `__type__` 用 23 位压缩 uuid
- `imported:true` 让 Cocos 信任 uuid 而不是重新生成
- scene/prefab 接 spriteFrame：`"spriteFrame":{"__uuid__":"<uuid>@f9941"}`；sprite `color` 设 `{r:255,g:255,b:255,a:255}`（非白 tint 会乘算毁图）
- 节点必须有 `cc.UITransform._contentSize`（sprite 无 UITransform 渲染为 0 尺寸=隐身）
- 完整 `.meta` JSON 模板见 `cocos-sprite-author` SKILL.md §2（vertices/uv 按真实 PNG 宽高算：hw=W/2, hh=H/2）

## 7. 成本与纪律
1. 占位阶段**禁止**动用正式生成——色块/剪影够（可玩优先）
2. 风格未锁定**禁止**批量——先单张验收
3. 批量留痕：提示词/参数/路径记入项目 `Docs/` 日志
4. 每条提示词加唯一项目前缀，避免批量文件名碰撞

---

## 8. 图像后端（唯一待定项 — 见 dsh-cocos-assets.patch.yml 注释）
asset-gen server 调图后端从 dsh 运行环境触达即可，三选一（复用 `ip-image-skill` 的 `provider` 环境变量切换思路）：
- A. ImageGen 服务（WorkBuddy 内置，本机已可用；dsh 环境需可达同款端点）
- B. 小云雀 xyq（视频/图生成）
- C. 外部 API（用户填 key）

**默认按 A（ImageGen）实现，预留 provider 切换。** 后端确定后补 asset-gen server 的调图实现。

## 9. 第 2/3 批缺口（本批不做）
- 第 2 批：表面材质 PBR（需"可平铺/无缝"约束 + .meta）、序列帧/精灵表（绿幕抠图+网格切片+AnimationClip 导出层，工程不是提示词）
- 第 3 批：音频/TTS（无原生生成器，需接后端）、视频（xyq 已有）、资产库搜索（需接 API）
