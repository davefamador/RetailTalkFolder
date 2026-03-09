# ============================================================
#  Intent & Slot Training - Run Training
#  Right-click this file → "Run with PowerShell"
#  Make sure you ran setup.ps1 first!
# ============================================================

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$pythonPath = Join-Path $scriptDir "venv\Scripts\python.exe"
$datasetDir = Join-Path $rootDir "shopping_queries_dataset"

# Check if setup was run
if (-not (Test-Path $pythonPath)) {
    Write-Host ""
    Write-Host "  ERROR: Setup has not been run yet!" -ForegroundColor Red
    Write-Host "  Please run setup.ps1 first." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Intent & Slot Model Training" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Choose what to train:" -ForegroundColor White
Write-Host "    [1] Intent Classifier only" -ForegroundColor Yellow
Write-Host "    [2] Slot Extractor only" -ForegroundColor Yellow
Write-Host "    [3] Both (recommended)" -ForegroundColor Yellow
Write-Host "    [4] Exit" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "  Enter your choice (1/2/3/4)"

# Create output directories
$intentModelDir = Join-Path $rootDir "models\intent_classifier"
$slotModelDir = Join-Path $rootDir "models\slot_extractor"
New-Item -ItemType Directory -Force -Path $intentModelDir | Out-Null
New-Item -ItemType Directory -Force -Path $slotModelDir | Out-Null

function Train-IntentClassifier {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Training Intent Classifier..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $intentData = Join-Path $datasetDir "IntentDataset_cleaned.xlsx"
    if (-not (Test-Path $intentData)) {
        Write-Host "  ERROR: Dataset not found: $intentData" -ForegroundColor Red
        return $false
    }
    
    $trainScript = Join-Path $scriptDir "train_intent_classifier.py"
    & $pythonPath $trainScript `
        --data $intentData `
        --save_dir $intentModelDir `
        --epochs 5 `
        --batch_size 16 `
        --lr 2e-5
    
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
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Training Slot Extractor..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $slotData = Join-Path $datasetDir "slotannotationdataset.xlsx"
    if (-not (Test-Path $slotData)) {
        Write-Host "  ERROR: Dataset not found: $slotData" -ForegroundColor Red
        return $false
    }
    
    $trainScript = Join-Path $scriptDir "train_slot_extractor.py"
    & $pythonPath $trainScript `
        --data $slotData `
        --save_dir $slotModelDir `
        --epochs 8 `
        --batch_size 16 `
        --lr 3e-5
    
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

# Execute based on choice
switch ($choice) {
    "1" { Train-IntentClassifier }
    "2" { Train-SlotExtractor }
    "3" {
        $r1 = Train-IntentClassifier
        $r2 = Train-SlotExtractor
        
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
        Write-Host "    label_map.json         - Label/tag mappings" -ForegroundColor White
        Write-Host "    config.json            - Training configuration" -ForegroundColor White
        Write-Host "    evaluation_results.json - All evaluation metrics" -ForegroundColor White
        Write-Host "    training_history.json   - Per-epoch training history" -ForegroundColor White
    }
    "4" { Write-Host "  Goodbye!" -ForegroundColor Cyan; exit 0 }
    default {
        Write-Host "  Invalid choice. Please run again and enter 1, 2, 3, or 4." -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to close"
