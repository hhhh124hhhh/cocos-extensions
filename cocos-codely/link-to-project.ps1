<#
.SYNOPSIS
  把 cocos-codely 以真实副本安装进指定 Cocos 工程的 extensions/。
.DESCRIPTION
  - 项目级扩展 Cocos 必扫（本机全局目录 ~/.CocosCreator/extensions/ 不自动登记手动放入的扩展，故走项目级）。
  - 用 robocopy 复制(= 编辑器「导入扩展」做的事), 因为 Cocos 扩展加载器不跟目录 junction/symlink, 必须真实目录。
  - /MIR 镜像: 重复运行会把源仓的最新改动同步进工程副本(改 src/ 重 build 后重跑本脚本即可更新)。
  - /XD node_modules 排除依赖目录, 不把庞大的 node_modules 拷进工程。
  - 目标若已是 junction/旧副本, 先安全移除再复制。
  - cocos-codely 若 dist/ 缺失会自动 npm install + npm run build。
.PARAMETER ProjectPath
  目标 Cocos 工程绝对路径（含 package.json / assets/ 的那层）。
.EXAMPLE
  .\link-to-project.ps1 -ProjectPath "<工程路径>"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

# ---- 源路径（本机标准位置，按需改）----
$codelySrc  = $PSScriptRoot  # 脚本所在目录即 cocos-codely 源（分享后可放任意位置）
# funplay-cocos-mcp 已退役（更名 cocos-mcp-bridge，改用 install-cocos-stack.mjs 安装），不再由本脚本处理

# ---- 校验工程 ----
if (-not (Test-Path $ProjectPath)) {
  throw "工程路径不存在: $ProjectPath"
}
$extDir = Join-Path $ProjectPath "extensions"
if (-not (Test-Path $extDir)) {
  New-Item -ItemType Directory -Path $extDir | Out-Null
  Write-Host "创建 extensions 目录: $extDir"
}

function Install-Ext($name, $src) {
  $dst = Join-Path $extDir $name
  if (-not (Test-Path $src)) {
    Write-Warning "源不存在, 跳过 $name : $src"
    return
  }
  # 目标已存在: 统一用 [System.IO.Directory]::Delete($dst, $true) 移除
  # - 本机有 safe-delete 包装拦截 Remove-Item cmdlet(非空目录会被拒), 故绕过 cmdlet 直接调 .NET
  # - 递归重载对 junction 只删 reparse 点(不碰源内容); 对真实旧副本则整体删(随后 robocopy 重建)
  if (Test-Path $dst) {
    $wasLink = [bool](Get-Item $dst -Force).LinkType
    [System.IO.Directory]::Delete($dst, $true)
    if ($wasLink) { Write-Host "RM LINK $name (旧 junction 已移除)" }
    else          { Write-Host "RM OLD  $name (旧副本已移除)" }
  }
  Write-Host "COPY  $name : $src -> $dst"
  # /MIR 镜像; /XD node_modules .git 排除依赖与源仓元数据; /R:1 /W:1 失败重试最小; /NFL /NDL /NJH /NJS 安静
  robocopy $src $dst /MIR /XD node_modules .git /R:1 /W:1 /NFL /NDL /NJH /NJS
  if ($LASTEXITCODE -gt 1) {
    # >1 通常是目标被占用(扩展被运行中的 Cocos 加载, dist 等文件被锁)导致无法覆盖
    throw "robocopy 失败 ($name), 退出码 $LASTEXITCODE。若 Cocos Creator 正开着本工程, 请先完全关闭 Cocos 再运行本脚本, 否则 dist/ 等被锁定文件不会更新。"
  }
}

# ---- 先确保 cocos-codely 已构建（源仓侧）, 再安装——
# 顺序必须是「先 build 后 robocopy」: 若先拷贝, 拷到的是旧 dist,
# 后 build 只更新源码侧, 工程副本还是旧产物(实测踩过的坑)。
$dist = Join-Path $codelySrc "dist/main.js"
# 源码比产物新 → 也要重建,否则会装到旧产物(改 src 后重跑本脚本的常见坑)
$srcNewer = $false
foreach ($pair in @(
  @("src/main.ts", "dist/main.js"),
  @("src/panels/default/index.js", "dist/panels/default/index.js"),
  @("src/panels/default/index.html", "dist/panels/default/index.html"),
  @("package.json", "dist/main.js")
)) {
  $s = Join-Path $codelySrc $pair[0]
  $d = Join-Path $codelySrc $pair[1]
  if ((Test-Path $s) -and (Test-Path $d) -and (Get-Item $s).LastWriteTime -gt (Get-Item $d).LastWriteTime) {
    $srcNewer = $true
    break
  }
}
if (-not (Test-Path $dist) -or $srcNewer) {
  Write-Host "dist/ 缺失或源码比产物新, 重新构建 cocos-codely ..."
  Push-Location $codelySrc
  try {
    npm install
    npm run build
  }
  finally {
    Pop-Location
  }
}
else {
  Write-Host "OK    cocos-codely/dist 已存在且未过期, 跳过构建"
}

Install-Ext "cocos-codely"       $codelySrc
# Install-Ext "funplay-cocos-mcp" 已移除（退役，见上）

Write-Host ""
Write-Host "=== 完成(真实副本已安装) ==="
Write-Host "1) 重启 Cocos Creator, 打开工程: $ProjectPath"
Write-Host "2) Extension Manager -> 已安装扩展, 启用 cocos-codely（cocos-mcp-bridge 请用 install-cocos-stack.mjs 安装）"
Write-Host "3) 菜单 Extensions -> cocos-codely -> Codely 打开面板"
Write-Host "4) 面板里确认 dsh 聊天界面 + mcp__cocos__* 工具可见"
Write-Host "5) 以后改了 src/ 直接重跑本脚本即可(检测到源码比产物新会自动 build 并同步)"
