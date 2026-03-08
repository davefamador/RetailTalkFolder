# RetailTalk - Setup Script
# Run this script once after cloning the repository to set up the Python environment.
# Requirements: Python 3.9+ must be installed on your system.

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RetailTalk - Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Found $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Error "Python is not installed or not in PATH. Please install Python 3.9+ first."
    exit 1
}

# Create virtual environment
$venvPath = Join-Path $PSScriptRoot "venv"
if (Test-Path $venvPath) {
    Write-Host "[OK] Virtual environment already exists at $venvPath" -ForegroundColor Yellow
}
else {
    Write-Host "[..] Creating virtual environment..." -ForegroundColor Cyan
    python -m venv $venvPath
    Write-Host "[OK] Virtual environment created." -ForegroundColor Green
}

# Install dependencies
$pipPath = Join-Path $venvPath "Scripts\pip.exe"
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"

Write-Host "[..] Installing dependencies from requirements.txt..." -ForegroundColor Cyan
& $pipPath install --timeout 120 -r $requirementsPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies."
    exit 1
}
Write-Host "[OK] All dependencies installed." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the scripts:" -ForegroundColor White
Write-Host "  - Training:   .\classification_identification\train_task2.ps1" -ForegroundColor White
Write-Host "  - Prediction: .\classification_identification\predict_task2.ps1" -ForegroundColor White
Write-Host "  - Evaluation: .\classification_identification\evaluate_task2.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or open this folder in VS Code and press F5 to run any Python file." -ForegroundColor White
