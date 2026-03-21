# ============================================================
#  Train Intent Classifier
#
#  Usage:
#    .\train_intent.ps1            # Fresh training
#    .\train_intent.ps1 -Resume    # Resume from checkpoint
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

$intentModelDir = Join-Path $scriptDir "models\intent_classifier"
New-Item -ItemType Directory -Force -Path $intentModelDir | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($Resume) {
    Write-Host "  Resuming Intent Classifier Training" -ForegroundColor Cyan
} else {
    Write-Host "  Training Intent Classifier" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$intentData = Join-Path $datasetDir "IntentDataset_cleaned.xlsx"
if (-not (Test-Path $intentData)) {
    Write-Host "  ERROR: Dataset not found: $intentData" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

$trainScript = Join-Path $scriptDir "train_intent_classifier.py"
$args = @(
    $trainScript,
    "--data", $intentData,
    "--save_dir", $intentModelDir,
    "--epochs", "5",
    "--batch_size", "16",
    "--lr", "2e-5"
)
if ($Resume) { $args += "--resume" }

Write-Host "  Dataset:  $intentData" -ForegroundColor White
Write-Host "  Output:   $intentModelDir" -ForegroundColor White
Write-Host "  Epochs:   5" -ForegroundColor White
Write-Host "  Batch:    16" -ForegroundColor White
Write-Host "  LR:       2e-5" -ForegroundColor White
Write-Host ""

& $pythonPath @args

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Intent Classifier Training COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Model saved to: $intentModelDir" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "  ERROR: Training failed with exit code $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close"
