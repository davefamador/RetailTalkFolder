"""
Quick-train train.py

Same training logic as the original, but copied here so the
quick_train folder is fully self-contained.
"""

import argparse
import numpy as np
import torch
from query_product import QueryProductClassifier, generate_dataset, train
from sklearn.model_selection import train_test_split


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("train_queries_path_file", type=str)
    parser.add_argument("train_products_path_file", type=str)
    parser.add_argument("train_labels_path_file", type=str)
    parser.add_argument("model_save_path", type=str)
    parser.add_argument("task", type=str, choices=['esci_labels', 'substitute_identification'])
    parser.add_argument("--random_state", type=int, default=42)
    parser.add_argument("--batch_size", type=int, default=256)
    parser.add_argument("--weight_decay", type=float, default=0.01)
    parser.add_argument("--num_train_epochs", type=int, default=4)
    parser.add_argument("--lr", type=float, default=5e-5)
    parser.add_argument("--eps", type=float, default=1e-8)
    parser.add_argument("--num_warmup_steps", type=int, default=0)
    parser.add_argument("--max_grad_norm", type=int, default=1)
    parser.add_argument("--validation_steps", type=int, default=250)
    parser.add_argument("--num_dev_examples", type=int, default=2000)
    args = parser.parse_args()

    task2num_labels = {
        "esci_labels": 4,
        "substitute_identification": 2,
    }
    num_labels = task2num_labels[args.task]
    train_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load data
    query_array = np.load(args.train_queries_path_file)
    asin_array = np.load(args.train_products_path_file)
    labels_array = np.load(args.train_labels_path_file)
    n_examples = labels_array.shape[0]

    print(f"[QuickTrain] {n_examples} total examples, {num_labels} labels, device={train_device}")

    # Adjust dev size if dataset is small
    dev_count = min(args.num_dev_examples, int(n_examples * 0.15))
    dev_size = dev_count / n_examples

    ids_train, ids_dev = train_test_split(
        range(0, n_examples),
        test_size=dev_size,
        random_state=args.random_state,
    )

    query_array_train = query_array[ids_train]
    asin_array_train = asin_array[ids_train]
    labels_array_train = labels_array[ids_train]
    query_array_dev = query_array[ids_dev]
    asin_array_dev = asin_array[ids_dev]
    labels_array_dev = labels_array[ids_dev]

    train_dataset = generate_dataset(query_array_train, asin_array_train, labels_array_train)
    dev_dataset = generate_dataset(query_array_dev, asin_array_dev, labels_array_dev)

    print(f"[QuickTrain] Train: {len(ids_train)}, Dev: {len(ids_dev)}")

    # Train
    model = QueryProductClassifier(num_labels=num_labels)
    train(
        model,
        train_dataset,
        dev_dataset,
        args.model_save_path,
        device=train_device,
        batch_size=args.batch_size,
        weight_decay=args.weight_decay,
        num_train_epochs=args.num_train_epochs,
        lr=args.lr,
        eps=args.eps,
        num_warmup_steps=args.num_warmup_steps,
        max_grad_norm=args.max_grad_norm,
        validation_steps=args.validation_steps,
        random_seed=args.random_state,
    )

    print(f"\n[QuickTrain] DONE! Model saved to: {args.model_save_path}")


if __name__ == "__main__":
    main()
