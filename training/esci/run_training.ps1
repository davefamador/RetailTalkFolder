# ============================================================
#  ESCI Classifier Training
#
#  Usage:
#    .\run_training.ps1           # Interactive menu
#    .\run_training.ps1 -Mode prepare   # Step 1 only (BERT embeddings)
#    .\run_training.ps1 -Mode train     # Step 2 only (train classifier)
#    .\run_training.ps1 -Mode both      # Step 1 + Step 2
# ============================================================

param(
    [ValidateSet("prepare", "train", "both", "")]
    [string]$Mode = ""
)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $scriptDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) { $pythonPath = "python" }

$csvDir      = Join-Path $scriptDir "custom_esci\finalescidataset"
$preparedDir = Join-Path $scriptDir "custom_esci\prepared"
$modelDir    = Join-Path $scriptDir "custom_esci\trained_model"

function Run-Prepare {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Step 1: Preparing Dataset (BERT embeddings)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    & $pythonPath (Join-Path $scriptDir "prepare_custom_dataset.py") `
        $csvDir $preparedDir `
        --model_name bert-base-multilingual-uncased `
        --max_length 32 `
        --batch_size 256
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Embeddings saved to $preparedDir" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Prepare step failed." -ForegroundColor Red
    }
}

function Run-Train {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Step 2: Training ESCI Classifier" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    & $pythonPath (Join-Path $scriptDir "train.py") `
        (Join-Path $preparedDir "queries.npy") `
        (Join-Path $preparedDir "products.npy") `
        (Join-Path $preparedDir "labels.npy") `
        $modelDir `
        esci_labels `
        --use_class_weights `
        --batch_size 256 `
        --num_train_epochs 5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Model saved to $modelDir" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Training failed." -ForegroundColor Red
    }
}

if ($Mode -ne "") {
    switch ($Mode) {
        "prepare" { Run-Prepare }
        "train"   { Run-Train }
        "both"    { Run-Prepare; Run-Train }
    }
    exit 0
}

# Interactive menu
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ESCI Classifier Training" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [1] Step 1 only — Prepare dataset (BERT embeddings)" -ForegroundColor Yellow
Write-Host "  [2] Step 2 only — Train classifier (needs Step 1 done)" -ForegroundColor Yellow
Write-Host "  [3] Both steps (full pipeline)" -ForegroundColor Yellow
Write-Host "  [4] Exit" -ForegroundColor Yellow
Write-Host ""
$choice = Read-Host "  Enter choice (1-4)"
switch ($choice) {
    "1" { Run-Prepare }
    "2" { Run-Train }
    "3" { Run-Prepare; Run-Train }
    "4" { exit 0 }
    default { Write-Host "  Invalid choice." -ForegroundColor Red }
}

Write-Host ""
Read-Host "Press Enter to close"
