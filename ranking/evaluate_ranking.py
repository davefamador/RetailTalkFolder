"""
Ranking Model Evaluation — Compute metrics for a trained CrossEncoder model.

Computes: MSE Loss, Accuracy, Precision, Recall, F1, MAP@10, NDCG@10, MRR
Saves results to evaluation_results.csv
"""

import argparse
import csv
import math
import os
import numpy as np
import pandas as pd
import torch
from sentence_transformers.cross_encoder import CrossEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from collections import defaultdict


def compute_ndcg(relevances, k=10):
    """Compute NDCG@k for a single query."""
    relevances = relevances[:k]
    dcg = sum(rel / math.log2(i + 2) for i, rel in enumerate(relevances))
    ideal = sorted(relevances, reverse=True)
    idcg = sum(rel / math.log2(i + 2) for i, rel in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0


def compute_map(relevances, k=10):
    """Compute Average Precision@k for a single query."""
    relevances = relevances[:k]
    hits = 0
    sum_precision = 0.0
    for i, rel in enumerate(relevances):
        if rel > 0:
            hits += 1
            sum_precision += hits / (i + 1)
    return sum_precision / hits if hits > 0 else 0.0


def compute_mrr(relevances):
    """Compute Reciprocal Rank for a single query."""
    for i, rel in enumerate(relevances):
        if rel > 0:
            return 1.0 / (i + 1)
    return 0.0


def main():
    parser = argparse.ArgumentParser(description="Evaluate a trained ranking model.")
    parser.add_argument("dataset_path", type=str, help="Directory where the dataset is stored.")
    parser.add_argument("model_path", type=str, help="Path to the trained model checkpoint.")
    parser.add_argument("--output_csv", type=str, default="evaluation_results.csv",
                        help="Output CSV file for results.")
    parser.add_argument("--random_state", type=int, default=42, help="Random seed.")
    parser.add_argument("--n_dev_queries", type=int, default=200, help="Number of dev queries.")
    parser.add_argument("--relevance_threshold", type=float, default=0.05,
                        help="Gain threshold for binary relevance (for accuracy/F1).")
    parser.add_argument("--batch_size", type=int, default=64, help="Prediction batch size.")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # --- Config ---
    col_query = "query"
    col_query_id = "query_id"
    col_product_id = "product_id"
    col_product_title = "product_title"
    col_product_locale = "product_locale"
    col_esci_label = "esci_label"
    col_small_version = "small_version"
    col_split = "split"
    col_gain = "gain"

    esci_label2gain = {
        'E': 1.0,
        'S': 0.1,
        'C': 0.01,
        'I': 0.0,
    }

    # --- 1. Load data ---
    print("[Step 1] Loading dataset...")
    df_examples = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_examples.parquet'))
    df_products = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_products.parquet'))

    df = pd.merge(
        df_examples, df_products,
        how='left',
        left_on=[col_product_locale, col_product_id],
        right_on=[col_product_locale, col_product_id]
    )

    df = df[df[col_small_version] == 1]
    df = df[df[col_split] == "train"]
    df[col_gain] = df[col_esci_label].apply(lambda x: esci_label2gain[x])
    df = df.dropna(subset=[col_product_title])

    # --- 2. Get dev split (same as training) ---
    print("[Step 2] Creating dev split...")
    list_query_id = df[col_query_id].unique()
    dev_size = min(args.n_dev_queries / len(list_query_id), 0.1)
    _, list_query_id_dev = train_test_split(
        list_query_id, test_size=dev_size, random_state=args.random_state
    )

    df_dev = df[df[col_query_id].isin(list_query_id_dev)]
    df_dev = df_dev[[col_query_id, col_query, col_product_title, col_gain]]
    print(f"  Dev examples: {len(df_dev)}")

    # --- 3. Load model ---
    print(f"[Step 3] Loading model from: {args.model_path}")
    model = CrossEncoder(
        args.model_path,
        num_labels=1,
        max_length=512,
        activation_fn=torch.nn.Identity(),
        device=device,
    )

    # --- 4. Predict ---
    print("[Step 4] Running predictions...")
    queries = df_dev[col_query].tolist()
    products = df_dev[col_product_title].tolist()
    true_gains = df_dev[col_gain].values

    sentence_pairs = list(zip(queries, products))
    predictions = model.predict(sentence_pairs, batch_size=args.batch_size, show_progress_bar=True)

    # --- 5. Compute metrics ---
    print("[Step 5] Computing metrics...")

    # 5a. MSE Loss
    mse_loss = float(np.mean((predictions - true_gains) ** 2))

    # 5b. Binary classification metrics (relevant vs irrelevant)
    true_binary = (true_gains > args.relevance_threshold).astype(int)
    pred_binary = (predictions > args.relevance_threshold).astype(int)

    accuracy = accuracy_score(true_binary, pred_binary)
    precision = precision_score(true_binary, pred_binary, zero_division=0)
    recall = recall_score(true_binary, pred_binary, zero_division=0)
    f1 = f1_score(true_binary, pred_binary, zero_division=0)

    # 5c. Ranking metrics (per-query, then averaged)
    query_ids = df_dev[col_query_id].values

    # Group by query and compute ranking metrics
    query_groups = defaultdict(list)
    for i, qid in enumerate(query_ids):
        query_groups[qid].append((predictions[i], true_gains[i]))

    map_scores = []
    ndcg_scores = []
    mrr_scores = []

    for qid, items in query_groups.items():
        # Sort by predicted score (descending)
        items_sorted = sorted(items, key=lambda x: x[0], reverse=True)
        relevances = [1 if gain > args.relevance_threshold else 0 for _, gain in items_sorted]
        gains_sorted = [gain for _, gain in items_sorted]

        map_scores.append(compute_map(relevances, k=10))
        ndcg_scores.append(compute_ndcg(gains_sorted, k=10))
        mrr_scores.append(compute_mrr(relevances))

    mean_map = np.mean(map_scores)
    mean_ndcg = np.mean(ndcg_scores)
    mean_mrr = np.mean(mrr_scores)

    # --- 6. Print results ---
    print("\n" + "=" * 55)
    print("  RANKING MODEL EVALUATION RESULTS")
    print("=" * 55)
    print(f"  Model:              {args.model_path}")
    print(f"  Dev examples:       {len(df_dev)}")
    print(f"  Dev queries:        {len(query_groups)}")
    print(f"  Relevance thresh:   {args.relevance_threshold}")
    print("-" * 55)
    print(f"  MSE Loss:           {mse_loss:.6f}")
    print(f"  Accuracy:           {accuracy:.4f}")
    print(f"  Precision:          {precision:.4f}")
    print(f"  Recall:             {recall:.4f}")
    print(f"  F1 Score:           {f1:.4f}")
    print("-" * 55)
    print(f"  MAP@10:             {mean_map:.4f}")
    print(f"  NDCG@10:            {mean_ndcg:.4f}")
    print(f"  MRR:                {mean_mrr:.4f}")
    print("=" * 55)

    # --- 7. Save to CSV ---
    output_path = os.path.join(os.path.dirname(args.model_path) or '.', args.output_csv)
    metrics = {
        'model_path': args.model_path,
        'dev_examples': len(df_dev),
        'dev_queries': len(query_groups),
        'mse_loss': mse_loss,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'map_at_10': mean_map,
        'ndcg_at_10': mean_ndcg,
        'mrr': mean_mrr,
    }

    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=metrics.keys())
        writer.writeheader()
        writer.writerow(metrics)

    print(f"\n[DONE] Results saved to: {output_path}")


if __name__ == "__main__":
    main()
