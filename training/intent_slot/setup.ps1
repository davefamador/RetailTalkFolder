# ============================================================
#  Intent & Slot Training - Setup Script
#  Run this ONCE after cloning the repository.
#  Right-click this file → "Run with PowerShell"
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Intent & Slot Training - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ------ Check Python ------
Write-Host "[1/5] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  OK: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "  ERROR: Python is not installed!" -ForegroundColor Red
    Write-Host "  Please download Python 3.9+ from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "  Make sure to check 'Add Python to PATH' during installation." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ------ Create Virtual Environment ------
Write-Host "[2/5] Setting up virtual environment..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath  = Join-Path $scriptDir "venv"

if (Test-Path $venvPath) {
    Write-Host "  OK: Virtual environment already exists" -ForegroundColor Green
}
else {
    Write-Host "  Creating virtual environment (this may take a moment)..." -ForegroundColor Cyan
    python -m venv $venvPath
    Write-Host "  OK: Virtual environment created" -ForegroundColor Green
}

# ------ Activate & Install Dependencies ------
Write-Host "[3/5] Installing dependencies..." -ForegroundColor Yellow
$pipPath = Join-Path $venvPath "Scripts\pip.exe"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"
$requirementsPath = Join-Path $scriptDir "requirements.txt"

Write-Host "  Installing packages (this may take 5-10 minutes the first time)..." -ForegroundColor Cyan
& $pipPath install --timeout 120 -r $requirementsPath 2>&1 | ForEach-Object {
    if ($_ -match "Successfully installed") {
        Write-Host "  $_" -ForegroundColor Green
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to install dependencies." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  OK: All packages installed" -ForegroundColor Green

# ------ Download NLTK Data (needed for BLEU score) ------
Write-Host "[4/5] Downloading NLTK data..." -ForegroundColor Yellow
& $pythonPath -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); print('  OK: NLTK data downloaded')"

# ------ Verify Dataset Files ------
Write-Host "[5/5] Checking dataset files..." -ForegroundColor Yellow
$datasetDir = Join-Path $scriptDir "datasets"
$intentFile = Join-Path $datasetDir "intentdataset.xlsx"
$slotFile   = Join-Path $datasetDir "slotdataset.xlsx"

$allGood = $true

if (Test-Path $intentFile) {
    Write-Host "  OK: Intent dataset found" -ForegroundColor Green
}
else {
    Write-Host "  WARNING: Intent dataset not found at:" -ForegroundColor Yellow
    Write-Host "    $intentFile" -ForegroundColor Yellow
    Write-Host "    You need this file to train the Intent Classifier." -ForegroundColor Yellow
    $allGood = $false
}

if (Test-Path $slotFile) {
    Write-Host "  OK: Slot dataset found" -ForegroundColor Green
}
else {
    Write-Host "  WARNING: Slot dataset not found at:" -ForegroundColor Yellow
    Write-Host "    $slotFile" -ForegroundColor Yellow
    Write-Host "    You need this file to train the Slot Extractor." -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  To train the models, run:" -ForegroundColor White
Write-Host "    .\run_training.ps1" -ForegroundColor Cyan
Write-Host ""

if (-not $allGood) {
    Write-Host "  NOTE: Some dataset files are missing." -ForegroundColor Yellow
    Write-Host "  Please add them before running training." -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "Press Enter to close"
