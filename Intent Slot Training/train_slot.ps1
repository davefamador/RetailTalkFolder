# ============================================================
#  Train Slot Extractor
#
#  Usage:
#    .\train_slot.ps1            # Fresh training
#    .\train_slot.ps1 -Resume    # Resume from checkpoint
# ============================================================

param(
    [switch]$Resume
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$pythonPath = Join-Path $scriptDir "venv\Scripts\python.exe"
$datasetDir = Join-Path $rootDir "shopping_queries_dataset"

# Fallback to system python if venv doesn't exist
if (-not (Test-Path $pythonPath)) {
    $pythonPath = "python"
}

$slotModelDir = Join-Path $rootDir "models\slot_extractor"
New-Item -ItemType Directory -Force -Path $slotModelDir | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($Resume) {
    Write-Host "  Resuming Slot Extractor Training" -ForegroundColor Cyan
} else {
    Write-Host "  Training Slot Extractor" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$slotData = Join-Path $datasetDir "slotannotationdataset_cleaned.xlsx"
if (-not (Test-Path $slotData)) {
    Write-Host "  ERROR: Dataset not found: $slotData" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

$trainScript = Join-Path $scriptDir "train_slot_extractor.py"
$args = @(
    $trainScript,
    "--data", $slotData,
    "--save_dir", $slotModelDir,
    "--epochs", "8",
    "--batch_size", "16",
    "--lr", "3e-5"
)
if ($Resume) { $args += "--resume" }

Write-Host "  Dataset:  $slotData" -ForegroundColor White
Write-Host "  Output:   $slotModelDir" -ForegroundColor White
Write-Host "  Epochs:   8" -ForegroundColor White
Write-Host "  Batch:    16" -ForegroundColor White
Write-Host "  LR:       3e-5" -ForegroundColor White
Write-Host ""

& $pythonPath @args

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Slot Extractor Training COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Model saved to: $slotModelDir" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "  ERROR: Training failed with exit code $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close"
