# ============================================================
#  Intent & Slot Training - Run Training
#
#  Usage:
#    .\run_training.ps1                    # Interactive menu (fresh train)
#    .\run_training.ps1 -Mode intent       # Train intent only
#    .\run_training.ps1 -Mode slot         # Train slot only
#    .\run_training.ps1 -Mode both         # Train both
#    .\run_training.ps1 -Mode intent -Resume  # Resume intent from checkpoint
#    .\run_training.ps1 -Mode slot -Resume    # Resume slot from checkpoint
#    .\run_training.ps1 -Mode both -Resume    # Resume both from checkpoint
# ============================================================

param(
    [ValidateSet("intent", "slot", "both", "")]
    [string]$Mode = "",
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

# Model output directories
$intentModelDir = Join-Path $scriptDir "models\intent_classifier"
$slotModelDir = Join-Path $rootDir "models\slot_extractor"
New-Item -ItemType Directory -Force -Path $intentModelDir | Out-Null
New-Item -ItemType Directory -Force -Path $slotModelDir | Out-Null

function Train-IntentClassifier {
    param([switch]$WithResume)

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    if ($WithResume) {
        Write-Host "  Resuming Intent Classifier..." -ForegroundColor Cyan
    } else {
        Write-Host "  Training Intent Classifier..." -ForegroundColor Cyan
    }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $intentData = Join-Path $datasetDir "IntentDataset_cleaned.xlsx"
    if (-not (Test-Path $intentData)) {
        Write-Host "  ERROR: Dataset not found: $intentData" -ForegroundColor Red
        return $false
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
    if ($WithResume) { $args += "--resume" }

    & $pythonPath @args

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  Intent Classifier training COMPLETE!" -ForegroundColor Green
        Write-Host "  Model saved to: $intentModelDir" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ERROR: Training failed." -ForegroundColor Red
        return $false
    }
}

function Train-SlotExtractor {
    param([switch]$WithResume)

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    if ($WithResume) {
        Write-Host "  Resuming Slot Extractor..." -ForegroundColor Cyan
    } else {
        Write-Host "  Training Slot Extractor..." -ForegroundColor Cyan
    }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $slotData = Join-Path $datasetDir "slotannotationdataset_cleaned.xlsx"
    if (-not (Test-Path $slotData)) {
        Write-Host "  ERROR: Dataset not found: $slotData" -ForegroundColor Red
        return $false
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
    if ($WithResume) { $args += "--resume" }

    & $pythonPath @args

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  Slot Extractor training COMPLETE!" -ForegroundColor Green
        Write-Host "  Model saved to: $slotModelDir" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ERROR: Training failed." -ForegroundColor Red
        return $false
    }
}

function Show-Summary {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  All Training Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Trained models saved to:" -ForegroundColor White
    Write-Host "    Intent: $intentModelDir" -ForegroundColor Cyan
    Write-Host "    Slot:   $slotModelDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Output files per model:" -ForegroundColor White
    Write-Host "    model.pt               - Trained model weights" -ForegroundColor White
    Write-Host "    checkpoint.pt          - Resume checkpoint" -ForegroundColor White
    Write-Host "    label_map.json         - Label/tag mappings" -ForegroundColor White
    Write-Host "    config.json            - Training configuration" -ForegroundColor White
    Write-Host "    evaluation_results.json - All evaluation metrics" -ForegroundColor White
    Write-Host "    training_history.json   - Per-epoch training history" -ForegroundColor White
}

# --- Non-interactive mode (command-line args) ---
if ($Mode -ne "") {
    switch ($Mode) {
        "intent" { Train-IntentClassifier -WithResume:$Resume }
        "slot"   { Train-SlotExtractor -WithResume:$Resume }
        "both"   {
            Train-IntentClassifier -WithResume:$Resume
            Train-SlotExtractor -WithResume:$Resume
            Show-Summary
        }
    }
    exit 0
}

# --- Interactive mode ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Intent & Slot Model Training" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Choose what to train:" -ForegroundColor White
Write-Host "    [1] Intent Classifier only" -ForegroundColor Yellow
Write-Host "    [2] Slot Extractor only" -ForegroundColor Yellow
Write-Host "    [3] Both (recommended)" -ForegroundColor Yellow
Write-Host "    [4] Resume Intent from checkpoint" -ForegroundColor Yellow
Write-Host "    [5] Resume Slot from checkpoint" -ForegroundColor Yellow
Write-Host "    [6] Resume Both from checkpoint" -ForegroundColor Yellow
Write-Host "    [7] Exit" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "  Enter your choice (1-7)"

switch ($choice) {
    "1" { Train-IntentClassifier }
    "2" { Train-SlotExtractor }
    "3" {
        Train-IntentClassifier
        Train-SlotExtractor
        Show-Summary
    }
    "4" { Train-IntentClassifier -WithResume }
    "5" { Train-SlotExtractor -WithResume }
    "6" {
        Train-IntentClassifier -WithResume
        Train-SlotExtractor -WithResume
        Show-Summary
    }
    "7" { Write-Host "  Goodbye!" -ForegroundColor Cyan; exit 0 }
    default {
        Write-Host "  Invalid choice." -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to close"
