"""
Combines all CSVs from finalescidataset/, computes BERT embeddings,
and outputs the three .npy arrays that train.py expects:
  - queries.npy
  - products.npy
  - labels.npy
"""
import argparse
import os
import glob
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from transformers import BertModel, BertTokenizer
from torch.utils.data import DataLoader, SequentialSampler, TensorDataset
from tqdm import tqdm

LABEL_MAP = {"E": 0, "S": 1, "C": 2, "I": 3}
CSV_COLUMNS = ["query", "product_title", "esci_label", "humanized_query"]


def load_and_combine_csvs(csv_dir):
    paths = sorted(glob.glob(os.path.join(csv_dir, "*.csv")))
    if not paths:
        raise FileNotFoundError(f"No CSV files found in {csv_dir}")
    print(f"Found {len(paths)} CSV file(s):")
    dfs = []
    for p in paths:
        df = pd.read_csv(p, header=None, names=CSV_COLUMNS)
        print(f"  {os.path.basename(p)}: {len(df):,} rows")
        dfs.append(df)
    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.dropna(subset=["query", "product_title", "esci_label"])
    combined = combined[combined["esci_label"].isin(LABEL_MAP)]
    combined = combined.reset_index(drop=True)
    print(f"Combined total: {len(combined):,} rows")
    print(f"Label distribution:\n{combined['esci_label'].value_counts().to_string()}")
    return combined


def tokenize(texts, tokenizer, max_length, batch_size, device):
    all_embeddings = []
    for start in tqdm(range(0, len(texts), batch_size), desc="Encoding"):
        batch = texts[start : start + batch_size]
        enc = tokenizer(
            batch,
            padding="max_length",
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        with torch.no_grad():
            hidden = tokenizer_model(
                input_ids=enc["input_ids"].to(device),
                attention_mask=enc["attention_mask"].to(device),
                token_type_ids=enc["token_type_ids"].to(device),
            )[0]  # (B, seq_len, 768)
        # max-pool over sequence dimension
        hidden_p = hidden.permute(0, 2, 1)  # (B, 768, seq_len)
        pooled = F.max_pool1d(hidden_p, kernel_size=hidden_p.size(-1)).squeeze(-1)
        all_embeddings.append(pooled.cpu().numpy())
    return np.vstack(all_embeddings)


tokenizer_model = None  # set in main to avoid passing it through


def embed(texts, tokenizer, bert_model, max_length, batch_size, device):
    global tokenizer_model
    tokenizer_model = bert_model
    bert_model.to(device)
    bert_model.eval()
    return tokenize(texts, tokenizer, max_length, batch_size, device)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_dir", type=str, help="Directory containing the CSV files (e.g. custom_esci/finalescidataset/)")
    parser.add_argument("output_dir", type=str, help="Directory to save queries.npy, products.npy, labels.npy")
    parser.add_argument("--model_name", type=str, default="bert-base-multilingual-uncased")
    parser.add_argument("--max_length", type=int, default=64, help="Max token length (64 is enough for short queries/titles)")
    parser.add_argument("--batch_size", type=int, default=256)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    out_queries = os.path.join(args.output_dir, "queries.npy")
    out_products = os.path.join(args.output_dir, "products.npy")
    out_labels = os.path.join(args.output_dir, "labels.npy")

    # Skip if all outputs exist
    if all(os.path.exists(p) for p in [out_queries, out_products, out_labels]):
        print("All output files already exist, nothing to do.")
        return

    df = load_and_combine_csvs(args.csv_dir)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    tokenizer = BertTokenizer.from_pretrained(args.model_name)
    bert_model = BertModel.from_pretrained(args.model_name)

    if not os.path.exists(out_queries):
        print("\nEncoding queries...")
        query_embs = embed(df["query"].tolist(), tokenizer, bert_model, args.max_length, args.batch_size, device)
        np.save(out_queries, query_embs)
        print(f"Saved: {out_queries}  shape={query_embs.shape}")
    else:
        print(f"Skipping queries (exists): {out_queries}")

    if not os.path.exists(out_products):
        print("\nEncoding product titles...")
        product_embs = embed(df["product_title"].tolist(), tokenizer, bert_model, args.max_length, args.batch_size, device)
        np.save(out_products, product_embs)
        print(f"Saved: {out_products}  shape={product_embs.shape}")
    else:
        print(f"Skipping products (exists): {out_products}")

    if not os.path.exists(out_labels):
        labels = df["esci_label"].map(LABEL_MAP).to_numpy(dtype=np.int64)
        np.save(out_labels, labels)
        print(f"Saved: {out_labels}  shape={labels.shape}")
    else:
        print(f"Skipping labels (exists): {out_labels}")


if __name__ == "__main__":
    main()
