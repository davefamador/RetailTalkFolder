$ErrorActionPreference = "Stop"
$PYTHON = "$PSScriptRoot\..\venv\Scripts\python.exe"

# ─── Dataset ───
$SQD_PATH = "$PSScriptRoot\..\shopping_queries_dataset\"

# ─── Model output ───
$MODEL_SAVE_PATH = "$PSScriptRoot\model"

# ─── Hyperparameters ───
$RANDOM_STATE = 42
$TRAIN_BATCH_SIZE = 32
$NUM_EPOCHS = 2
$LR = 7e-6
$WARMUP_STEPS = 1000
$EVAL_STEPS = 100
$N_DEV_QUERIES = 200
$MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-12-v2"

# ─── 1. Train the ranking model ───
Write-Host "`n=========================================="
Write-Host "  RANKING MODEL TRAINING"
Write-Host "==========================================`n"

& $PYTHON "$PSScriptRoot\train.py" `
    $SQD_PATH `
    $MODEL_SAVE_PATH `
    --random_state $RANDOM_STATE `
    --train_batch_size $TRAIN_BATCH_SIZE `
    --num_epochs $NUM_EPOCHS `
    --lr $LR `
    --warmup_steps $WARMUP_STEPS `
    --evaluation_steps $EVAL_STEPS `
    --n_dev_queries $N_DEV_QUERIES `
    --model_name $MODEL_NAME
if ($LASTEXITCODE -ne 0) { Write-Error "Training failed."; exit 1 }

# ─── 2. Evaluate the trained model ───
Write-Host "`n=========================================="
Write-Host "  RANKING MODEL EVALUATION"
Write-Host "==========================================`n"

& $PYTHON "$PSScriptRoot\evaluate_ranking.py" `
    $SQD_PATH `
    $MODEL_SAVE_PATH `
    --output_csv "evaluation_results.csv" `
    --random_state $RANDOM_STATE `
    --n_dev_queries $N_DEV_QUERIES
if ($LASTEXITCODE -ne 0) { Write-Error "Evaluation failed."; exit 1 }

Write-Host "`nDone! Model saved to $MODEL_SAVE_PATH"
Write-Host "Evaluation results saved to $MODEL_SAVE_PATH\evaluation_results.csv"
