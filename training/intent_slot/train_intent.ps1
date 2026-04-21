# ============================================================
#  Intent Classifier Training
#
#  Usage:
#    .\train_intent.ps1            # Fresh train
#    .\train_intent.ps1 -Resume    # Resume from last checkpoint
#    .\train_intent.ps1 -Epochs 10 -BatchSize 16 -LR 2e-5
# ============================================================

param(
    [switch]$Resume,
    [int]$Epochs    = 10,
    [int]$BatchSize = 16,
    [float]$LR      = 2e-5
)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $scriptDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) { $pythonPath = "python" }

$dataFile  = Join-Path $scriptDir "shopping_queries_dataset\IntentDataset_cleaned.xlsx"
$modelDir  = Join-Path $scriptDir "models\intent_classifier"
$ckptFile  = Join-Path $modelDir "checkpoint.pt"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($Resume) {
    Write-Host "  Intent Classifier — Resuming Training" -ForegroundColor Cyan
} else {
    Write-Host "  Intent Classifier — Fresh Training" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check dataset
if (-not (Test-Path $dataFile)) {
    Write-Host "  ERROR: Dataset not found:" -ForegroundColor Red
    Write-Host "    $dataFile" -ForegroundColor Red
    Write-Host "  Please place IntentDataset_cleaned.xlsx in shopping_queries_dataset\" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"; exit 1
}

# Check checkpoint when resuming
if ($Resume) {
    if (Test-Path $ckptFile) {
        Write-Host "  Checkpoint found: $ckptFile" -ForegroundColor Green
        Write-Host "  Resuming from last saved epoch..." -ForegroundColor Cyan
    } else {
        Write-Host "  WARNING: No checkpoint found at:" -ForegroundColor Yellow
        Write-Host "    $ckptFile" -ForegroundColor Yellow
        Write-Host "  Starting from scratch instead." -ForegroundColor Yellow
    }
}

Write-Host "  Config:" -ForegroundColor White
Write-Host "    Epochs     : $Epochs" -ForegroundColor White
Write-Host "    Batch size : $BatchSize" -ForegroundColor White
Write-Host "    LR         : $LR" -ForegroundColor White
Write-Host "    Model dir  : $modelDir" -ForegroundColor White
Write-Host ""

New-Item -ItemType Directory -Force -Path $modelDir | Out-Null

$args = @(
    (Join-Path $scriptDir "train_intent_classifier.py"),
    "--data",       $dataFile,
    "--save_dir",   $modelDir,
    "--epochs",     $Epochs,
    "--batch_size", $BatchSize,
    "--lr",         $LR
)
if ($Resume) { $args += "--resume" }

& $pythonPath @args

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Training Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Output files in: $modelDir" -ForegroundColor Cyan
    Write-Host "    model.pt               - Best trained model" -ForegroundColor White
    Write-Host "    checkpoint.pt          - Resume checkpoint (last epoch)" -ForegroundColor White
    Write-Host "    label_map.json         - Intent label mappings" -ForegroundColor White
    Write-Host "    config.json            - Training configuration" -ForegroundColor White
    Write-Host "    evaluation_results.json - Metrics (F1, accuracy, etc.)" -ForegroundColor White
    Write-Host "    training_history.json  - Per-epoch loss & F1" -ForegroundColor White
    Write-Host ""
    Write-Host "  To deploy: copy model.pt to:" -ForegroundColor Yellow
    Write-Host "    RetailTalk\backend\models\intent_classifier\model.pt" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  ERROR: Training failed. Check the output above." -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close"
