$ErrorActionPreference = "Stop"
$PYTHON = "$PSScriptRoot\..\venv\Scripts\python.exe"

$HYPOTHESIS_PATH = "$PSScriptRoot\hypothesis"
$HYPOTHESIS_PATH_FILE = "$HYPOTHESIS_PATH\task_2_esci_classifier_model.csv"
$OUTPUT_DIR = "$PSScriptRoot\evaluation_results"

if (!(Test-Path -Path $HYPOTHESIS_PATH_FILE)) {
    Write-Warning "Hypothesis CSV not found at $HYPOTHESIS_PATH_FILE. Please allow the prediction script to finish first."
    exit 1
}

Write-Host "Running comprehensive evaluation script..."
& $PYTHON "$PSScriptRoot\evaluate.py" $HYPOTHESIS_PATH_FILE --output_dir $OUTPUT_DIR
if ($LASTEXITCODE -ne 0) { Write-Error "Evaluation script failed."; exit 1 }

Write-Host "Evaluation pictures and textual report generated successfully in $OUTPUT_DIR!"
