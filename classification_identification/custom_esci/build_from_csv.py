"""
build_from_csv.py

Reads a custom ESCI CSV (query, product_title, label) and produces
the three .npy arrays expected by the existing training pipeline:
  - array_queries_custom.npy   (N, 768)
  - array_products_custom.npy  (N, 768)
  - array_labels_custom.npy    (N,)

Uses the same BERT model and max-pooling approach as the production
BertEmbeddingService for consistency.
"""

import argparse
import os
import time
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from collections import Counter
from transformers import BertModel, BertTokenizer


LABEL_MAP = {"E": 0, "S": 1, "C": 2, "I": 3}


def pool_summary(last_hidden_states, pool_op="max"):
    """Max-pool BERT hidden states — same as bert_service.py and compute_bert_representations.py."""
    num_features = last_hidden_states.size()[1]
    hidden_p = last_hidden_states.permute(0, 2, 1)
    pool_fn = F.max_pool1d if pool_op == "max" else F.avg_pool1d
    return pool_fn(hidden_p, kernel_size=num_features).squeeze(-1)


def compute_embeddings(texts, tokenizer, model, device, max_length=256, batch_size=32):
    """Compute BERT embeddings for a list of texts. Returns dict {text: np.array(768,)}."""
    unique_texts = list(set(texts))
    embeddings = {}

    print(f"  Computing embeddings for {len(unique_texts)} unique texts (batch_size={batch_size})...")
    start = time.time()

    for i in range(0, len(unique_texts), batch_size):
        batch_texts = unique_texts[i:i + batch_size]
        tokens = tokenizer(
            batch_texts,
            padding="max_length",
            truncation=True,
            max_length=max_length,
            return_attention_mask=True,
            return_tensors="pt",
        )
        inputs = {
            "input_ids": tokens["input_ids"].to(device),
            "attention_mask": tokens["attention_mask"].to(device),
            "token_type_ids": tokens["token_type_ids"].to(device),
        }
        with torch.no_grad():
            output = model(**inputs)
            pooled = pool_summary(output[0])
            batch_embeddings = pooled.detach().cpu().numpy()

        for j, text in enumerate(batch_texts):
            embeddings[text] = batch_embeddings[j]

        done = min(i + batch_size, len(unique_texts))
        elapsed = time.time() - start
        s_per_it = elapsed / done if done > 0 else 0
        eta = s_per_it * (len(unique_texts) - done) / 60
        print(f"  [{done}/{len(unique_texts)}] {s_per_it:.2f}s/text, ETA: {eta:.1f}min")

    return embeddings


def main():
    parser = argparse.ArgumentParser(description="Build training arrays from a custom ESCI CSV.")
    parser.add_argument("--csv", type=str,
                        default=os.path.join(os.path.dirname(__file__), "..", "..", "shopping_queries_dataset", "shoppingqueriesdataset_cleaned.xlsx"),
                        help="Path to CSV or XLSX file with columns: query, product_title, label")
    parser.add_argument("--output_dir", type=str, default=".",
                        help="Directory to save the .npy output files")
    parser.add_argument("--model_name", type=str, default="bert-base-multilingual-uncased",
                        help="BERT model name (must match production)")
    parser.add_argument("--max_length", type=int, default=256,
                        help="Max token length for BERT (must match production)")
    parser.add_argument("--batch_size", type=int, default=32,
                        help="Batch size for BERT inference")
    args = parser.parse_args()

    # 1. Load dataset (CSV, XLSX, or Parquet)
    print(f"[1/4] Loading dataset: {args.csv}")
    if args.csv.endswith(".parquet"):
        df = pd.read_parquet(args.csv)
    elif args.csv.endswith(".xlsx") or args.csv.endswith(".xls"):
        df = pd.read_excel(args.csv, engine="openpyxl")
    else:
        df = pd.read_csv(args.csv)

    # Validate columns
    required_cols = {"query", "product_title", "label"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    # Strip whitespace
    df["query"] = df["query"].str.strip()
    df["product_title"] = df["product_title"].str.strip()
    df["label"] = df["label"].str.strip().str.upper()

    # Validate labels
    invalid_labels = set(df["label"].unique()) - set(LABEL_MAP.keys())
    if invalid_labels:
        raise ValueError(f"Invalid labels found: {invalid_labels}. Must be one of: E, S, C, I")

    print(f"  Total pairs: {len(df)}")
    print(f"  Unique queries: {df['query'].nunique()}")
    print(f"  Unique products: {df['product_title'].nunique()}")
    print(f"  Label distribution:")
    label_counts = Counter(df["label"].tolist())
    for label_code, label_name in [("E", "Exact"), ("S", "Substitute"), ("C", "Complement"), ("I", "Irrelevant")]:
        count = label_counts.get(label_code, 0)
        pct = count / len(df) * 100
        print(f"    {label_code} ({label_name}): {count} ({pct:.1f}%)")

    # 2. Load BERT
    print(f"\n[2/4] Loading BERT model: {args.model_name}")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = BertModel.from_pretrained(args.model_name)
    tokenizer = BertTokenizer.from_pretrained(args.model_name)
    model.to(device)
    model.eval()
    print(f"  Device: {device}")

    # 3. Compute embeddings
    print(f"\n[3/4] Computing BERT embeddings...")

    print("  Queries:")
    query_embeddings = compute_embeddings(
        df["query"].tolist(), tokenizer, model, device,
        max_length=args.max_length, batch_size=args.batch_size
    )

    print("  Products:")
    product_embeddings = compute_embeddings(
        df["product_title"].tolist(), tokenizer, model, device,
        max_length=args.max_length, batch_size=args.batch_size
    )

    # 4. Build aligned arrays
    print(f"\n[4/4] Building training arrays...")
    n = len(df)
    array_queries = np.zeros((n, 768), dtype=np.float32)
    array_products = np.zeros((n, 768), dtype=np.float32)
    array_labels = np.zeros(n, dtype=np.int64)

    for i, row in df.iterrows():
        array_queries[i] = query_embeddings[row["query"]]
        array_products[i] = product_embeddings[row["product_title"]]
        array_labels[i] = LABEL_MAP[row["label"]]

    # Save
    os.makedirs(args.output_dir, exist_ok=True)
    queries_path = os.path.join(args.output_dir, "array_queries_custom.npy")
    products_path = os.path.join(args.output_dir, "array_products_custom.npy")
    labels_path = os.path.join(args.output_dir, "array_labels_custom.npy")

    np.save(queries_path, array_queries)
    np.save(products_path, array_products)
    np.save(labels_path, array_labels)

    print(f"\n  Saved:")
    print(f"    {queries_path}  — shape {array_queries.shape}")
    print(f"    {products_path} — shape {array_products.shape}")
    print(f"    {labels_path}   — shape {array_labels.shape}")
    print(f"\nDone! You can now train with:")
    print(f"  python ../train.py {queries_path} {products_path} {labels_path} ../models/custom_esci_model esci_labels --batch_size 32 --num_train_epochs 30 --lr 1e-3 --num_warmup_steps -1 --validation_steps 25 --num_dev_examples 50 --use_class_weights")


if __name__ == "__main__":
    main()
