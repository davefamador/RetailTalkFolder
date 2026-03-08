"""
Quick-train build_input_data_model.py

Uses the PARTIAL product checkpoint (dict_products_train.npy_checkpoint.npy)
plus computes query BERT embeddings on the fly.
Only includes training examples where BOTH the query and product have embeddings.
This produces a smaller but usable training set for rapid iteration.
"""

import argparse
import numpy as np
import os
import pandas as pd
import torch
import torch.nn.functional as F
from transformers import BertModel, BertTokenizer
from tqdm import tqdm


def pool_summary(last_hidden_states, pool_op="max"):
    num_features = last_hidden_states.size()[1]
    hidden_p = last_hidden_states.permute(0, 2, 1)
    pool_fn = F.max_pool1d if pool_op == "max" else F.avg_pool1d
    return pool_fn(hidden_p, kernel_size=num_features).squeeze(-1)


def compute_query_embeddings(queries, model_name="bert-base-multilingual-uncased", max_length=256, batch_size=128):
    """Compute BERT embeddings for a list of unique query texts."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[QueryEmbed] Loading BERT: {model_name} on {device}")
    model = BertModel.from_pretrained(model_name).to(device)
    tokenizer = BertTokenizer.from_pretrained(model_name)
    model.eval()

    dict_queries = {}
    unique_queries = list(set(queries))
    print(f"[QueryEmbed] Computing embeddings for {len(unique_queries)} unique queries...")

    with torch.no_grad():
        for i in tqdm(range(0, len(unique_queries), batch_size)):
            batch = unique_queries[i:i + batch_size]
            tokens = tokenizer.batch_encode_plus(
                batch,
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
            output = model(**inputs)
            embeddings = pool_summary(output[0])
            embeddings = embeddings.detach().cpu().numpy()

            for j, q in enumerate(batch):
                dict_queries[q] = embeddings[j]

    # Free GPU memory
    del model
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return dict_queries


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_path", type=str, help="Directory where the dataset is stored.")
    parser.add_argument("product_checkpoint", type=str, help="Path to dict_products_train.npy_checkpoint.npy.")
    parser.add_argument("output_dir", type=str, help="Output directory for arrays.")
    parser.add_argument("--labels_type", type=str, default="esci_labels",
                        choices=["esci_labels", "substitute_identification"])
    parser.add_argument("--bert_size", type=int, default=768)
    parser.add_argument("--bert_model_name", type=str, default="bert-base-multilingual-uncased")
    parser.add_argument("--bert_max_length", type=int, default=256)
    parser.add_argument("--bert_batch_size", type=int, default=128)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # --- Label mappings ---
    dict_labels_type = {
        'esci_labels': {'E': 0, 'S': 1, 'C': 2, 'I': 3},
        'substitute_identification': {'no_substitute': 0, 'substitute': 1},
    }

    # --- 1. Load partial product embeddings ---
    print(f"[Step 1] Loading product checkpoint: {args.product_checkpoint}")
    dict_products = np.load(args.product_checkpoint, allow_pickle=True)[()]
    available_products = set(dict_products.keys())
    print(f"  → {len(available_products)} product embeddings available")

    # --- 2. Load dataset and filter to available products ---
    print("[Step 2] Loading dataset and filtering...")
    df = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_examples.parquet'))
    df = df[df['large_version'] == 1]
    df = df[df['split'] == 'train']

    original_count = len(df)
    df = df[df['product_id'].isin(available_products)]
    filtered_count = len(df)
    print(f"  → {filtered_count}/{original_count} examples have product embeddings ({filtered_count/original_count*100:.1f}%)")

    if args.labels_type == "substitute_identification":
        tmp_dict = {'E': 'no_substitute', 'S': 'substitute', 'C': 'no_substitute', 'I': 'no_substitute'}
        df['esci_label'] = df['esci_label'].apply(lambda x: tmp_dict[x])

    # --- 3. Compute query embeddings ---
    print("[Step 3] Computing query BERT embeddings...")
    unique_queries = df['query'].dropna().unique().tolist()
    dict_queries_by_text = compute_query_embeddings(
        unique_queries,
        model_name=args.bert_model_name,
        max_length=args.bert_max_length,
        batch_size=args.bert_batch_size,
    )

    # Map query_id → embedding via the text
    query_id_to_text = df[['query_id', 'query']].drop_duplicates().set_index('query_id')['query'].to_dict()
    dict_queries_by_id = {}
    for qid, text in query_id_to_text.items():
        if text in dict_queries_by_text:
            dict_queries_by_id[qid] = dict_queries_by_text[text]

    # Filter to examples where we have both query + product embeddings
    available_queries = set(dict_queries_by_id.keys())
    df = df[df['query_id'].isin(available_queries)]
    print(f"  → {len(df)} examples with both query and product embeddings")

    # --- 4. Build aligned arrays ---
    print("[Step 4] Building aligned arrays...")
    num_examples = len(df)
    array_queries = np.zeros((num_examples, args.bert_size))
    array_products = np.zeros((num_examples, args.bert_size))

    for i in tqdm(range(num_examples)):
        row = df.iloc[i]
        array_queries[i] = dict_queries_by_id[row['query_id']]
        array_products[i] = dict_products[row['product_id']]

    # --- 5. Build labels ---
    labels2class_id = dict_labels_type[args.labels_type]
    df['class_id'] = df['esci_label'].apply(lambda label: labels2class_id[label])
    array_labels = df['class_id'].to_numpy()

    # --- 6. Save ---
    np.save(os.path.join(args.output_dir, "array_queries_train.npy"), array_queries)
    np.save(os.path.join(args.output_dir, "array_products_train.npy"), array_products)
    np.save(os.path.join(args.output_dir, "array_labels_train.npy"), array_labels)

    print(f"\n[DONE] Saved {num_examples} examples to {args.output_dir}")
    print(f"  → array_queries_train.npy  : {array_queries.shape}")
    print(f"  → array_products_train.npy : {array_products.shape}")
    print(f"  → array_labels_train.npy   : {array_labels.shape}")

    # Print label distribution
    unique, counts = np.unique(array_labels, return_counts=True)
    label_names = {v: k for k, v in labels2class_id.items()}
    print("\n  Label distribution:")
    for u, c in zip(unique, counts):
        print(f"    {label_names[int(u)]}: {c} ({c/num_examples*100:.1f}%)")


if __name__ == "__main__":
    main()
