# Intent & Slot Model Training

Train the **Intent Classifier** and **Slot Extractor** models for RetailTalk's search engine.

## Quick Start (2 Steps)

### Step 1: Setup
Right-click **`setup.ps1`** → **Run with PowerShell**

This will:
- Create a virtual environment
- Install all Python dependencies
- Download required NLTK data
- Verify your dataset files exist

### Step 2: Train
Right-click **`run_training.ps1`** → **Run with PowerShell**

Choose from the menu:
1. Train Intent Classifier only
2. Train Slot Extractor only
3. Train both (recommended)

## Requirements

- **Python 3.9+** — [Download here](https://www.python.org/downloads/)
  > ⚠️ Check **"Add Python to PATH"** during installation
- **Dataset files** in `shopping_queries_dataset/`:
  - `IntentDataset_cleaned.xlsx` (for intent classifier)
  - `slotannotationdataset.xlsx` (for slot extractor)

## Output

After training, models are saved to the `models/` folder:

```
models/
├── intent_classifier/
│   ├── model.pt                  ← Trained model
│   ├── label_map.json            ← Intent label mappings
│   ├── config.json               ← Training config
│   ├── evaluation_results.json   ← All metrics (accuracy, F1, BLEU, etc.)
│   └── training_history.json     ← Per-epoch loss & F1
│
└── slot_extractor/
    ├── model.pt                  ← Trained model
    ├── tag_map.json              ← BIO tag mappings
    ├── config.json               ← Training config
    ├── evaluation_results.json   ← All metrics
    └── training_history.json     ← Per-epoch loss & F1
```

## Evaluation Metrics

| Metric | Intent Classifier | Slot Extractor |
|--------|:-:|:-:|
| Accuracy | ✅ | ✅ (token-level) |
| Precision | ✅ (per-label + micro/macro) | ✅ (per-tag + micro/macro) |
| Recall | ✅ (per-label + micro/macro) | ✅ (per-tag + micro/macro) |
| F1 Score | ✅ (per-label + micro/macro/weighted) | ✅ (per-tag + micro/macro/weighted) |
| BLEU Score | ✅ | ✅ |
| Exact Match | ✅ | — |
| Hamming Loss | ✅ | — |
| Entity-Level F1 | — | ✅ (strict span matching) |
| Confusion Matrix | ✅ (per-label) | — |
