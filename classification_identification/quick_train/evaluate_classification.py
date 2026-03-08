"""
Classification Model Evaluation — Compute metrics for a trained QueryProductClassifier.

Computes: Loss, Accuracy, Precision, Recall, F1 (macro + per-class), Confusion Matrix
Saves results to evaluation_results.csv
"""

import argparse
import csv
import os
import sys
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, SequentialSampler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)

# Add parent path so we can import query_product
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from query_product import QueryProductClassifier, generate_dataset


def main():
    parser = argparse.ArgumentParser(description="Evaluate a trained classification model.")
    parser.add_argument("queries_path", type=str, help="Path to array_queries_train.npy")
    parser.add_argument("products_path", type=str, help="Path to array_products_train.npy")
    parser.add_argument("labels_path", type=str, help="Path to array_labels_train.npy")
    parser.add_argument("model_path", type=str, help="Path to the saved model (pytorch_model.bin).")
    parser.add_argument("task", type=str, choices=['esci_labels', 'substitute_identification'],
                        help="Task type (determines number of labels).")
    parser.add_argument("--output_csv", type=str, default="evaluation_results.csv",
                        help="Output CSV file for results.")
    parser.add_argument("--random_state", type=int, default=42, help="Random seed.")
    parser.add_argument("--batch_size", type=int, default=256, help="Evaluation batch size.")
    parser.add_argument("--num_dev_examples", type=int, default=2000, help="Number of dev examples.")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    task2num_labels = {
        "esci_labels": 4,
        "substitute_identification": 2,
    }
    num_labels = task2num_labels[args.task]

    label_names_map = {
        "esci_labels": ['Exact', 'Substitute', 'Complement', 'Irrelevant'],
        "substitute_identification": ['Non-Substitute', 'Substitute'],
    }
    label_names = label_names_map[args.task]

    # --- 1. Load data ---
    print("[Step 1] Loading data...")
    query_array = np.load(args.queries_path)
    asin_array = np.load(args.products_path)
    labels_array = np.load(args.labels_path)
    n_examples = labels_array.shape[0]

    print(f"  Total examples: {n_examples}, Labels: {num_labels}, Device: {device}")

    # --- 2. Create dev split (same as training) ---
    print("[Step 2] Creating dev split...")
    dev_count = min(args.num_dev_examples, int(n_examples * 0.15))
    dev_size = dev_count / n_examples

    ids_train, ids_dev = train_test_split(
        range(0, n_examples),
        test_size=dev_size,
        random_state=args.random_state,
    )

    query_array_dev = query_array[ids_dev]
    asin_array_dev = asin_array[ids_dev]
    labels_array_dev = labels_array[ids_dev]
    dev_dataset = generate_dataset(query_array_dev, asin_array_dev, labels_array_dev)

    print(f"  Dev examples: {len(ids_dev)}")

    # --- 3. Load model ---
    print(f"[Step 3] Loading model from: {args.model_path}")
    model = QueryProductClassifier(num_labels=num_labels)

    # Handle both directory and direct file paths
    if os.path.isdir(args.model_path):
        model_file = os.path.join(args.model_path, "pytorch_model.bin")
    else:
        model_file = args.model_path

    model.load_state_dict(torch.load(model_file, map_location=device, weights_only=True))
    model.to(device)
    model.eval()

    # --- 4. Run predictions ---
    print("[Step 4] Running predictions...")
    dev_sampler = SequentialSampler(dev_dataset)
    dev_dataloader = DataLoader(dev_dataset, sampler=dev_sampler, batch_size=args.batch_size)

    if model.num_labels > 2:
        criterion = nn.CrossEntropyLoss()
    else:
        criterion = nn.BCELoss()

    all_preds = []
    all_labels = []
    all_losses = []

    with torch.no_grad():
        for batch in dev_dataloader:
            labels = batch[2].to(device)
            logits = model(batch[0].to(device), batch[1].to(device))

            if model.num_labels > 2:
                loss = criterion(logits.view(-1, model.num_labels), labels.view(-1))
                preds = np.argmax(logits.detach().cpu().numpy(), axis=1)
            else:
                output = torch.sigmoid(logits)
                output = output.type(torch.FloatTensor)
                labels_float = labels.type(torch.FloatTensor)
                loss = criterion(output, labels_float)
                preds = np.digitize(output.detach().cpu().numpy(), [0.5])

            all_preds.extend(preds.tolist())
            all_labels.extend(labels.detach().cpu().numpy().tolist())
            all_losses.append(loss.item())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)

    # --- 5. Compute metrics ---
    print("[Step 5] Computing metrics...")

    avg_loss = float(np.mean(all_losses))
    accuracy = accuracy_score(all_labels, all_preds)
    precision_macro = precision_score(all_labels, all_preds, average='macro', zero_division=0)
    recall_macro = recall_score(all_labels, all_preds, average='macro', zero_division=0)
    f1_macro = f1_score(all_labels, all_preds, average='macro', zero_division=0)

    # Per-class metrics
    precision_per_class = precision_score(all_labels, all_preds, average=None, zero_division=0)
    recall_per_class = recall_score(all_labels, all_preds, average=None, zero_division=0)
    f1_per_class = f1_score(all_labels, all_preds, average=None, zero_division=0)

    cm = confusion_matrix(all_labels, all_preds)

    # --- 6. Print results ---
    print("\n" + "=" * 60)
    print("  CLASSIFICATION MODEL EVALUATION RESULTS")
    print("=" * 60)
    print(f"  Model:              {args.model_path}")
    print(f"  Task:               {args.task}")
    print(f"  Dev examples:       {len(ids_dev)}")
    print("-" * 60)
    print(f"  Loss:               {avg_loss:.6f}")
    print(f"  Accuracy:           {accuracy:.4f}")
    print(f"  Precision (macro):  {precision_macro:.4f}")
    print(f"  Recall (macro):     {recall_macro:.4f}")
    print(f"  F1 Score (macro):   {f1_macro:.4f}")
    print("-" * 60)

    # Per-class breakdown
    print("  Per-Class Breakdown:")
    print(f"  {'Class':<20} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    print(f"  {'-'*50}")
    for i, name in enumerate(label_names[:len(precision_per_class)]):
        print(f"  {name:<20} {precision_per_class[i]:>10.4f} {recall_per_class[i]:>10.4f} {f1_per_class[i]:>10.4f}")

    print("-" * 60)
    print("  Confusion Matrix:")
    header = "  " + " " * 15 + "  ".join(f"{n[:6]:>6}" for n in label_names[:cm.shape[1]])
    print(header)
    for i, row in enumerate(cm):
        name = label_names[i] if i < len(label_names) else f"Class {i}"
        vals = "  ".join(f"{v:>6}" for v in row)
        print(f"  {name:<15} {vals}")
    print("=" * 60)

    # --- 7. Save to CSV ---
    output_dir = os.path.dirname(args.model_path) or '.'
    output_path = os.path.join(output_dir, args.output_csv)

    metrics = {
        'model_path': args.model_path,
        'task': args.task,
        'dev_examples': len(ids_dev),
        'loss': avg_loss,
        'accuracy': accuracy,
        'precision_macro': precision_macro,
        'recall_macro': recall_macro,
        'f1_macro': f1_macro,
    }

    # Add per-class metrics
    for i, name in enumerate(label_names[:len(precision_per_class)]):
        metrics[f'precision_{name.lower()}'] = precision_per_class[i]
        metrics[f'recall_{name.lower()}'] = recall_per_class[i]
        metrics[f'f1_{name.lower()}'] = f1_per_class[i]

    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=metrics.keys())
        writer.writeheader()
        writer.writerow(metrics)

    print(f"\n[DONE] Results saved to: {output_path}")


if __name__ == "__main__":
    main()
