import argparse
import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score, 
    confusion_matrix, classification_report, cohen_kappa_score, matthews_corrcoef
)

def plot_metrics(y_true, y_pred, labels, output_dir):
    """Generates and saves visual charts for the evaluation metrics."""
    # 1. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title('Confusion Matrix')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'confusion_matrix.png'), dpi=300)
    plt.close()

    # 2. Per-class F1, Precision, Recall
    report = classification_report(y_true, y_pred, target_names=labels, output_dict=True)
    metrics_data = {
        'Precision': [report[label]['precision'] for label in labels],
        'Recall': [report[label]['recall'] for label in labels],
        'F1-Score': [report[label]['f1-score'] for label in labels]
    }
    x = np.arange(len(labels))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(x - width, metrics_data['Precision'], width, label='Precision', color='#4c72b0')
    ax.bar(x, metrics_data['Recall'], width, label='Recall', color='#dd8452')
    ax.bar(x + width, metrics_data['F1-Score'], width, label='F1-Score', color='#55a868')

    ax.set_ylabel('Scores')
    ax.set_title('Per-Class Precision, Recall, and F1-Score')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend(loc='lower right')
    ax.set_ylim(0, 1.1)

    # Add numeric labels on top of bars
    for i, p in enumerate(ax.patches):
        ax.annotate(f'{p.get_height():.2f}', (p.get_x() + p.get_width() / 2., p.get_height()),
                    ha='center', va='center', xytext=(0, 5), textcoords='offset points', fontsize=8)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'per_class_metrics.png'), dpi=300)
    plt.close()

    print(f"✅ Saved visualizations to {output_dir}/confusion_matrix.png and {output_dir}/per_class_metrics.png")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("hypothesis_csv", type=str, help="Path to the hypothesis CSV file.")
    parser.add_argument("--output_dir", type=str, default="evaluation_results", help="Directory to save evaluation reports and visualizations.")
    args = parser.parse_args()

    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)

    print(f"Reading hypothesis file from {args.hypothesis_csv}...")
    try:
        df = pd.read_csv(args.hypothesis_csv)
    except FileNotFoundError:
        print(f"Error: Hypothesis file '{args.hypothesis_csv}' not found.")
        print("Note: If the prediction script is still running, please wait for it to finish and produce the CSV.")
        return

    # Check required columns
    pred_col = "esci_label" if "esci_label" in df.columns else "substitute_label" # fallback
    if pred_col not in df.columns and "label" in df.columns:
        pred_col = "label"
    
    gold_col = "gold_label"

    if pred_col not in df.columns or gold_col not in df.columns:
        print(f"Error: Missing expected columns. Found: {df.columns.tolist()}")
        return

    y_true = df[gold_col].tolist()
    y_pred = df[pred_col].tolist()
    labels = sorted(list(set(y_true) | set(y_pred)))

    print("\n--- Model Evaluation Results ---\n")

    # Overall metrics
    acc = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average='macro')
    micro_f1 = f1_score(y_true, y_pred, average='micro')
    weighted_f1 = f1_score(y_true, y_pred, average='weighted')
    kappa = cohen_kappa_score(y_true, y_pred)
    mcc = matthews_corrcoef(y_true, y_pred)

    print(f"Accuracy:       {acc:.4f}")
    print(f"Macro F1:       {macro_f1:.4f}")
    print(f"Micro F1:       {micro_f1:.4f}")
    print(f"Weighted F1:    {weighted_f1:.4f}")
    print(f"Cohen's Kappa:  {kappa:.4f}")
    print(f"MCC:            {mcc:.4f}\n")

    print("--- Classification Report ---\n")
    print(classification_report(y_true, y_pred, target_names=labels))

    # Calculate exact match ratio (label sequence BLEU-like substitute)
    exact_matches = sum([1 for yt, yp in zip(y_true, y_pred) if yt == yp])
    print(f"--- Label-level Exact Match (BLEU-like) ---\n")
    print(f"Exact Match Ratio: {exact_matches/len(y_true):.4f} ({exact_matches}/{len(y_true)} items)\n")

    # Generate visual charts
    try:
        plot_metrics(y_true, y_pred, labels, args.output_dir)
    except Exception as e:
        print(f"Could not generate visual charts. Make sure matplotlib and seaborn are installed. Error: {e}")

    # Save textual report
    report_path = os.path.join(args.output_dir, "metrics_report.txt")
    with open(report_path, "w") as f:
        f.write(f"Accuracy: {acc:.4f}\nMacro F1: {macro_f1:.4f}\nMicro F1: {micro_f1:.4f}\nWeighted F1: {weighted_f1:.4f}\n")
        f.write(f"Cohen's Kappa: {kappa:.4f}\nMCC: {mcc:.4f}\n\n")
        f.write(classification_report(y_true, y_pred, target_names=labels))
    
    print(f"✅ Textual report saved to {report_path}")

if __name__ == "__main__":
    main()
