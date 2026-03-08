$PYTHON = "$PSScriptRoot\..\..\venv\Scripts\python.exe"

# ============================================================
# Quick Train Pipeline
# Uses the PARTIAL product checkpoint to build a temporary
# classifier model for testing the application.
# ============================================================

$SQD_PATH = "$PSScriptRoot\..\..\shopping_queries_dataset\"
$PRODUCT_CHECKPOINT = "$PSScriptRoot\..\text_representations\task2\dict_products_train.npy_checkpoint.npy"
$OUTPUT_DIR = "$PSScriptRoot\data"
$MODELS_PATH = "$PSScriptRoot\models"

$BERT_MODEL_NAME = "bert-base-multilingual-uncased"
$BERT_MAX_LENGTH = 256
$BERT_BATCH_SIZE = 128

$LABELS_TYPE = "esci_labels"

# Training hyperparameters
$MODEL_SAVE_PATH = "$MODELS_PATH\quick_classifier_model"
$RANDOM_STATE = 42
$BATCH_SIZE = 256
$WEIGHT_DECAY = 0.01
$NUM_TRAIN_EPOCHS = 4
$LR = 5e-5
$EPS = 1e-8
$NUM_WARMUP_STEPS = 0
$MAX_GRAD_NORM = 1
$VALIDATION_STEPS = 100
$NUM_DEV_EXAMPLES = 2000

# --- Step 1: Build input data from checkpoint ---
Write-Host ''
Write-Host '================================================'
Write-Host ' QUICK TRAIN - Step 1: Build input data'
Write-Host ' Using partial product checkpoint'
Write-Host ' This may take a while for BERT encoding...'
Write-Host '================================================'
Write-Host ''

# Suppress stderr warnings from BERT model loading
$ErrorActionPreference = 'SilentlyContinue'
& $PYTHON "$PSScriptRoot\build_input_data_model.py" `
    $SQD_PATH `
    $PRODUCT_CHECKPOINT `
    $OUTPUT_DIR `
    --labels_type $LABELS_TYPE `
    --bert_size 768 `
    --bert_model_name $BERT_MODEL_NAME `
    --bert_max_length $BERT_MAX_LENGTH `
    --bert_batch_size $BERT_BATCH_SIZE
$step1Exit = $LASTEXITCODE
$ErrorActionPreference = 'Continue'

if ($step1Exit -ne 0) {
    Write-Host "ERROR: Step 1 failed with exit code $step1Exit"
    exit 1
}

# Verify Step 1 output exists
if (-not (Test-Path "$OUTPUT_DIR\array_queries_train.npy")) {
    Write-Host 'ERROR: Step 1 did not produce output files. Check errors above.'
    exit 1
}

Write-Host 'Step 1 complete - data files created.'

# --- Step 2: Train the classifier ---
Write-Host ''
Write-Host '================================================'
Write-Host ' QUICK TRAIN - Step 2: Train classifier'
Write-Host '================================================'
Write-Host ''

$ErrorActionPreference = 'SilentlyContinue'
& $PYTHON "$PSScriptRoot\train.py" `
    "$OUTPUT_DIR\array_queries_train.npy" `
    "$OUTPUT_DIR\array_products_train.npy" `
    "$OUTPUT_DIR\array_labels_train.npy" `
    $MODEL_SAVE_PATH `
    $LABELS_TYPE `
    --random_state $RANDOM_STATE `
    --batch_size $BATCH_SIZE `
    --weight_decay $WEIGHT_DECAY `
    --num_train_epochs $NUM_TRAIN_EPOCHS `
    --lr $LR `
    --eps $EPS `
    --num_warmup_steps $NUM_WARMUP_STEPS `
    --max_grad_norm $MAX_GRAD_NORM `
    --validation_steps $VALIDATION_STEPS `
    --num_dev_examples $NUM_DEV_EXAMPLES
$step2Exit = $LASTEXITCODE
$ErrorActionPreference = 'Continue'

if ($step2Exit -ne 0) {
    Write-Host "ERROR: Step 2 failed with exit code $step2Exit"
    exit 1
}

Write-Host ''
Write-Host '================================================'
Write-Host ' QUICK TRAIN COMPLETE!'
Write-Host ''
Write-Host " Model saved to: $MODEL_SAVE_PATH"
Write-Host ''
Write-Host ' To use in RetailTalk, set in .env:'
Write-Host "   CLASSIFIER_MODEL_PATH=$MODEL_SAVE_PATH\pytorch_model.bin"
Write-Host '================================================'
Write-Host ''
