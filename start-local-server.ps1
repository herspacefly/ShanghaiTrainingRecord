$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173
$pythonCandidates = @(
  "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe"
)

$python = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $python) {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand) { $python = $pythonCommand.Source }
}

if (-not $python) {
  Write-Host "未找到 Python。请安装 Python 3，或使用 Nginx 将 Project 作为站点根目录。" -ForegroundColor Red
  Read-Host "按 Enter 退出"
  exit 1
}

$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
  Start-Process -FilePath $python -ArgumentList "-m","http.server",$port,"--directory",$projectRoot -WindowStyle Hidden
  Start-Sleep -Milliseconds 700
}

$url = "http://127.0.0.1:$port/"
Write-Host "上海实训地图已启动：$url" -ForegroundColor Green
Start-Process $url
