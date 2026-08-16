#!/bin/bash
# 一键起 cocos 开发环境：asset-gen server + dsh（带 assets patch）。
# 前提：
#   1) 已 clone deepseek-harness（DSH_DIR 指向它）
#   2) 已在 Cocos Creator 全局装 funplay-cocos-mcp（Cocos 侧自动起 @8765）
#   3) 已设 VOLC_ARK_API_KEY（asset-gen 调火山方舟出图）
# 用法： bash start-cocos-dev.sh   （建议放进 dsh-watchdog 同类常驻守护，免会话回收）
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
ASSET_DIR="$HERE/asset-gen"
DSH_DIR="${DSH_DIR:-$HOME/deepseek-harness}"
PATCH="${COCOS_CODELY_PATCH:-$HERE/dsh-cocos-assets.patch.yml}"
LOG="$HERE/../cocos-dev.log"

echo "[start] asset-gen  -> http://127.0.0.1:9180/"
NODE_OPTIONS= node "$ASSET_DIR/src/server.js" >> "$LOG" 2>&1 &

echo "[start] dsh web --patch $PATCH  -> http://127.0.0.1:3080/"
cd "$DSH_DIR"
NODE_OPTIONS= node --import tsx/esm apps/cli/src/bin.ts --profile web --patch "$PATCH" >> "$LOG" 2>&1 &

echo "[start] 完成。Cocos Creator 打开 Codely 面板即可；funplay 由 Cocos 扩展自动起。"
echo "[start] 如需常驻自愈，把本脚本接入 dsh-watchdog.sh（每 30s 探 3080/9180，挂了重拉）。"
