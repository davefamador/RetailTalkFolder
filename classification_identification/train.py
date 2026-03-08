import argparse
import numpy as np
import torch
from collections import Counter
from query_product import QueryProductClassifier, generate_dataset, train
from sklearn.model_selection import train_test_split

def compute_class_weights(labels_array, num_classes):
    """Compute inverse-frequency class weights for balanced training."""
    counts = Counter(labels_array.tolist())
    total = len(labels_array)
    weights = []
    for i in range(num_classes):
        count = counts.get(i, 1)  # avoid division by zero
        weights.append(total / (num_classes * count))
    # Normalize so the smallest weight is 1.0
    min_w = min(weights)
    weights = [w / min_w for w in weights]
    return weights

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("train_queries_path_file", type=str, help="Input array file with the BERT representations of the queries.")
    parser.add_argument("train_products_path_file", type=str, help="Input array file with the BERT representations of the products.")
    parser.add_argument("train_labels_path_file", type=str, help="Input array file with the labels.")
    parser.add_argument("model_save_path", type=str, help="Directory to store the model.")
    parser.add_argument("task", type=str, choices=['esci_labels', 'substitute_identification'], help="Task: esci_labels | substitute_identification.")
    parser.add_argument("--random_state", type=int, default=42, help="Random seed.")
    parser.add_argument("--batch_size", type=int, default=256, help="Training batch size.")
    parser.add_argument("--weight_decay", type=float, default=0.01, help="The weight decay to apply.")
    parser.add_argument("--num_train_epochs", type=int, default=4, help="Number of training epochs.")
    parser.add_argument("--lr", type=float, default=5e-5 , help="The learning rate to apply.")
    parser.add_argument("--eps", type=float, default=1e-8, help="The epsilon to apply.")
    parser.add_argument("--num_warmup_steps", type=int, default=0, help="The number of warm up steps. Use -1 for auto (10%% of total).")
    parser.add_argument("--max_grad_norm", type=int, default=1, help="The weight decay to apply")
    parser.add_argument("--validation_steps", type=int, default=250, help="Number of validation steps.")
    parser.add_argument("--num_dev_examples", type=int, default=5505, help="Number of development examples.")
    parser.add_argument("--dense_hidden_dim", type=int, default=256, help="Hidden dimension of dense layers.")
    parser.add_argument("--num_dense_layers", type=int, default=2, help="Number of dense hidden layers.")
    parser.add_argument("--use_class_weights", action="store_true", default=False, help="Use inverse-frequency class weights for loss.")
    args = parser.parse_args()

    """ 0. Init variables """
    task2num_labels = {
        "esci_labels" : 4,
        "substitute_identification" : 2,
    }
    num_labels = task2num_labels[args.task]
    train_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    """ 1. Load data """
    query_array = np.load(args.train_queries_path_file)
    asin_array = np.load(args.train_products_path_file)
    labels_array = np.load(args.train_labels_path_file)
    n_examples = labels_array.shape[0]
    dev_size = args.num_dev_examples / n_examples
    ids_train, ids_dev = train_test_split(
        range(0, n_examples), 
        test_size=dev_size, 
        random_state=args.random_state,
    )
    query_array_train, asin_array_train, labels_array_train = query_array[ids_train], asin_array[ids_train], labels_array[ids_train]
    query_array_dev, asin_array_dev, labels_array_dev = query_array[ids_dev], asin_array[ids_dev], labels_array[ids_dev]
    train_dataset = generate_dataset(
        query_array_train,
        asin_array_train,
        labels_array_train,
    )
    dev_dataset = generate_dataset(
        query_array_dev,
        asin_array_dev,
        labels_array_dev,
    )

    """ 1.5 Compute class weights """
    class_weights = None
    if args.use_class_weights and num_labels > 2:
        class_weights = compute_class_weights(labels_array_train, num_labels)
        print(f"Class distribution: {Counter(labels_array_train.astype(int).tolist())}")
        print(f"Computed class weights: {class_weights}")

    """ 2. Prepare model """
    model = QueryProductClassifier(
        num_labels=num_labels,
        dense_hidden_dim=args.dense_hidden_dim,
        num_dense_layers=args.num_dense_layers,
    )
    print(f"Model architecture:\n{model}")
    print(f"Total parameters: {sum(p.numel() for p in model.parameters()):,}")

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
        class_weights=class_weights,
    )


if __name__ == "__main__": 
    main()  