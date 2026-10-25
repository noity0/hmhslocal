# HMHSLocal: fetch the official Ollama source into this repository.
# Run from the repository root in PowerShell.
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$vendorRoot = Join-Path $repoRoot "vendor"
$ollamaPath = Join-Path $vendorRoot "ollama"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required. Install Git for Windows, then reopen PowerShell."
}

New-Item -ItemType Directory -Force -Path $vendorRoot | Out-Null

if (Test-Path (Join-Path $ollamaPath ".git")) {
  Write-Host "Ollama source already exists; updating it..."
  git -C $ollamaPath pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw "Could not update Ollama source." }
} elseif (Test-Path $ollamaPath) {
  throw "Path exists but is not an Ollama Git checkout: $ollamaPath"
} else {
  git clone --depth 1 https://github.com/ollama/ollama.git $ollamaPath
  if ($LASTEXITCODE -ne 0) { throw "Failed to clone official Ollama source." }
}

Write-Host ""
Write-Host "Official Ollama source is available at: $ollamaPath"
Write-Host "This fetches source code only; it does not install/run Ollama or download model weights."
Write-Host "See vendor/ollama/README.md for next steps."
