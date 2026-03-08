# PowerShell script to replicate launch-predictions-task2.sh

$ErrorActionPreference = "Stop"
$PYTHON = "$PSScriptRoot\..\venv\Scripts\python.exe"

$BATCH_SIZE = 128
$BERT_MODEL_NAME = "bert-base-multilingual-uncased"
$BERT_MAX_LENGTH = 256
$BERT_SIZE = 768
$LABELS_TYPE = "esci_labels"

$SQD_PATH = "$PSScriptRoot\..\shopping_queries_dataset\"
$DATA_REPRESENTATIONS_PATH = "$PSScriptRoot\text_representations\task2"

$DICT_PRODUCTS_PATH_FILE = "$DATA_REPRESENTATIONS_PATH\dict_product_test.npy"
$DICT_QUERIES_PATH_FILE = "$DATA_REPRESENTATIONS_PATH\dict_examples_test.npy"

$ARRAY_PRODUCTS_PATH_FILE = "$DATA_REPRESENTATIONS_PATH\array_product_test.npy"
$ARRAY_QUERIES_PATH_FILE = "$DATA_REPRESENTATIONS_PATH\array_queries_test.npy"
$ARRAY_LABELS_PATH_FILE = "$DATA_REPRESENTATIONS_PATH\array_labels_test.npy"

if (!(Test-Path -Path $DATA_REPRESENTATIONS_PATH)) {
    New-Item -ItemType Directory -Force -Path $DATA_REPRESENTATIONS_PATH
}

# 1. Get BERT representations for queries and products
Write-Host "1. Calculating BERT representations (Test Set)..."
& $PYTHON "$PSScriptRoot\compute_bert_representations.py" `
    $SQD_PATH `
    "test" `
    --output_queries_path_file $DICT_QUERIES_PATH_FILE `
    --output_product_catalogue_path_file $DICT_PRODUCTS_PATH_FILE `
    --model_name $BERT_MODEL_NAME `
    --bert_max_length $BERT_MAX_LENGTH `
    --batch_size $BATCH_SIZE

# 2. Build inputs datasets from BERT representations
Write-Host "2. Building input data model (Test Set)..."
& $PYTHON "$PSScriptRoot\build_input_data_model.py" `
    $SQD_PATH `
    "test" `
    $DICT_PRODUCTS_PATH_FILE `
    $DICT_QUERIES_PATH_FILE `
    $ARRAY_QUERIES_PATH_FILE `
    $ARRAY_PRODUCTS_PATH_FILE `
    $ARRAY_LABELS_PATH_FILE `
    --bert_size $BERT_SIZE `
    --labels_type $LABELS_TYPE 

$MODELS_PATH = "$PSScriptRoot\models"
$MODEL_PATH = "$MODELS_PATH\task_2_esci_classifier_model"
$BATCH_SIZE = 256
$HYPOTHESIS_PATH = "$PSScriptRoot\hypothesis"
$HYPOTHESIS_PATH_FILE = "$HYPOTHESIS_PATH\task_2_esci_classifier_model.csv"

if (!(Test-Path -Path $HYPOTHESIS_PATH)) {
    New-Item -ItemType Directory -Force -Path $HYPOTHESIS_PATH
}

# Check if model exists
if (!(Test-Path -Path "$MODEL_PATH\pytorch_model.bin")) {
    Write-Error "Model file not found at $MODEL_PATH\pytorch_model.bin. Please run train_task2.ps1 first to train the model."
    exit 1
}
# 3. Perform the predictions
Write-Host "3. Running inference..."
& $PYTHON "$PSScriptRoot\inference.py" `
    $SQD_PATH `
    "test"  `
    $ARRAY_QUERIES_PATH_FILE `
    $ARRAY_PRODUCTS_PATH_FILE `
    $MODEL_PATH `
    $LABELS_TYPE `
    $HYPOTHESIS_PATH_FILE `
    --batch_size $BATCH_SIZE

if ($LASTEXITCODE -ne 0) { Write-Error "Step 3 failed."; exit 1 }

# 4. Run evaluation on the full test set
Write-Host "4. Running evaluation on the full test set..."
$OUTPUT_DIR = "$PSScriptRoot\evaluation_results"
& $PYTHON "$PSScriptRoot\evaluate.py" $HYPOTHESIS_PATH_FILE --output_dir $OUTPUT_DIR
if ($LASTEXITCODE -ne 0) { Write-Error "Step 4 (evaluation) failed."; exit 1 }

Write-Host "Prediction and evaluation complete! Results saved to $OUTPUT_DIR"
