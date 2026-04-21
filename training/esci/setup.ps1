# ============================================================
#  ESCI Classifier Training - Setup Script
#  Run this ONCE after cloning the repository.
#  Right-click this file -> "Run with PowerShell"
# ============================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ESCI Classifier Training - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/3] Checking Python..." -ForegroundColor Yellow
try {
    $v = python --version 2>&1
    Write-Host "  OK: $v" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python not found. Install Python 3.9+ and add to PATH." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

# Create venv
Write-Host "[2/3] Setting up virtual environment..." -ForegroundColor Yellow
$venvPath = Join-Path $scriptDir "venv"
if (Test-Path $venvPath) {
    Write-Host "  OK: venv already exists" -ForegroundColor Green
} else {
    python -m venv $venvPath
    Write-Host "  OK: venv created" -ForegroundColor Green
}

# Install deps
Write-Host "[3/3] Installing dependencies..." -ForegroundColor Yellow
$pip = Join-Path $venvPath "Scripts\pip.exe"
& $pip install --timeout 120 -r (Join-Path $scriptDir "requirements.txt")
Write-Host "  OK: Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Place your CSV files in: custom_esci\finalescidataset\" -ForegroundColor Cyan
Write-Host "  2. Run: .\run_training.ps1" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"
