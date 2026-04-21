import numpy as np
import random
import torch
import torch.nn as nn
from transformers import get_linear_schedule_with_warmup
from torch.utils.data import DataLoader, RandomSampler, SequentialSampler
from torch.nn.utils import clip_grad_norm_
from sklearn.metrics import (
    accuracy_score, f1_score, confusion_matrix,
    classification_report, precision_score, recall_score
)
import matplotlib.pyplot as plt
import seaborn as sns
import os
import pathlib
import time

ESCI_LABEL_NAMES = ['Exact', 'Substitute', 'Complement', 'Irrelevant']


def evaluate_esci_model(model, dataset, path_model, device='cpu', batch_size=256, task='esci_labels'):
    """
    Run full evaluation on a dataset split and save a confusion matrix plot.

    For esci_labels (4-class): plots 4x4 confusion matrix with E/S/C/I labels.
    For substitute_identification (binary): plots 2x2 confusion matrix.

    Saves:
      <path_model>/confusion_matrix.png
      <path_model>/classification_report.txt
    """
    model.eval()
    dataloader = DataLoader(dataset, sampler=SequentialSampler(dataset), batch_size=batch_size)

    all_true = []
    all_pred = []

    with torch.no_grad():
        for batch in dataloader:
            labels = batch[2].to(device)
            logits = model(batch[0].to(device), batch[1].to(device))

            if model.num_labels > 2:
                preds = np.argmax(logits.detach().cpu().numpy(), axis=1)
            else:
                output = torch.sigmoid(logits)
                preds = np.digitize(output.detach().cpu().numpy(), [0.5])

            all_true.extend(labels.detach().cpu().numpy().tolist())
            all_pred.extend(preds.tolist())

    all_true = np.array(all_true, dtype=int)
    all_pred = np.array(all_pred, dtype=int)

    if task == 'esci_labels':
        label_ids = [0, 1, 2, 3]
        label_names = ESCI_LABEL_NAMES
    else:
        label_ids = [0, 1]
        label_names = ['Non-Substitute', 'Substitute']

    cm = confusion_matrix(all_true, all_pred, labels=label_ids)

    # Normalised version (row-wise recall) alongside raw counts
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True).clip(min=1)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Raw counts
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=label_names, yticklabels=label_names, ax=axes[0])
    axes[0].set_title('Confusion Matrix (counts)')
    axes[0].set_xlabel('Predicted')
    axes[0].set_ylabel('True')

    # Row-normalised (recall per class)
    sns.heatmap(cm_norm, annot=True, fmt='.2f', cmap='Blues',
                xticklabels=label_names, yticklabels=label_names, ax=axes[1])
    axes[1].set_title('Confusion Matrix (row-normalised)')
    axes[1].set_xlabel('Predicted')
    axes[1].set_ylabel('True')

    task_title = 'ESCI Classifier' if task == 'esci_labels' else 'Substitute Identification'
    fig.suptitle(f'{task_title} — Confusion Matrix', fontsize=13)
    plt.tight_layout()

    pathlib.Path(path_model).mkdir(parents=True, exist_ok=True)
    cm_path = os.path.join(path_model, 'confusion_matrix.png')
    plt.savefig(cm_path, dpi=150, bbox_inches='tight')
    plt.close()

    # Print and save text report
    report = classification_report(all_true, all_pred, labels=label_ids,
                                   target_names=label_names, zero_division=0)
    acc = accuracy_score(all_true, all_pred)
    macro_f1 = f1_score(all_true, all_pred, average='macro', zero_division=0)
    micro_f1 = f1_score(all_true, all_pred, average='micro', zero_division=0)
    weighted_f1 = f1_score(all_true, all_pred, average='weighted', zero_division=0)

    print("\n" + "=" * 70)
    print(f"  FINAL EVALUATION — {task_title.upper()}")
    print("=" * 70)
    print(f"  Accuracy    : {acc:.4f}")
    print(f"  Macro F1    : {macro_f1:.4f}")
    print(f"  Micro F1    : {micro_f1:.4f}")
    print(f"  Weighted F1 : {weighted_f1:.4f}")
    print(f"\n{report}")
    print(f"  Confusion matrix saved to: {cm_path}")

    report_path = os.path.join(path_model, 'classification_report.txt')
    with open(report_path, 'w') as f:
        f.write(f"Accuracy: {acc:.4f}\nMacro F1: {macro_f1:.4f}\n"
                f"Micro F1: {micro_f1:.4f}\nWeighted F1: {weighted_f1:.4f}\n\n")
        f.write(report)
    print(f"  Classification report saved to: {report_path}")

    return {
        'accuracy': round(float(acc), 4),
        'macro_f1': round(float(macro_f1), 4),
        'micro_f1': round(float(micro_f1), 4),
        'weighted_f1': round(float(weighted_f1), 4),
    }


def set_seed(random_seed=42):
    random.seed(random_seed)
    np.random.seed(random_seed)
    torch.manual_seed(random_seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(random_seed)
        torch.cuda.manual_seed_all(random_seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

class QueryProductClassifier(nn.Module):

    def __init__(self, size_petrained=768, dense_hidden_dim=256, num_dense_layers=2, num_labels=1, dropout_rate=0.1):
        super(QueryProductClassifier, self).__init__()
        self.num_labels = 1 if num_labels <= 2 else num_labels
        self.size_petrained = size_petrained * 2
        fc_layers = []
        prev_dim = self.size_petrained
        self.dropout_embedding = nn.Dropout(dropout_rate)
        for _ in range(num_dense_layers):
            fc_layers.append(nn.Linear(prev_dim, dense_hidden_dim, bias=True))
            fc_layers.append(nn.BatchNorm1d(dense_hidden_dim))
            fc_layers.append(nn.ReLU())
            fc_layers.append(nn.Dropout(dropout_rate))
            prev_dim = dense_hidden_dim
        fc_layers.append(nn.Linear(prev_dim, self.num_labels))
        self.fc = nn.Sequential(*fc_layers)

    def forward(self, query_embedding, Product_embedding):
        # query_embedding: [batch_size, num_features]
        # product_embedding: [batch_size, num_features]
        embedding = torch.cat((query_embedding, Product_embedding), 1) # [batch_size, num_features * 2]
        embedding = self.dropout_embedding(embedding) # [batch_size, num_features * 2]
        logits = self.fc(embedding).squeeze(-1) # [batch_size, num_labels]
        return logits

def train(model, train_inputs, validation_inputs, path_model, device='cpu', batch_size=128, weight_decay=0.01, num_train_epochs=4, 
    lr=5e-5, eps=1e-8, num_warmup_steps=0, max_grad_norm=1, validation_steps=250, random_seed=42, class_weights=None):
    
    set_seed(random_seed=random_seed)

    """ Step 0: prapare data loaders and model """
    train_sampler = RandomSampler(train_inputs)
    train_dataloader = DataLoader(train_inputs, sampler=train_sampler, batch_size=batch_size)
    validation_sampler = SequentialSampler(validation_inputs)
    validation_dataloader = DataLoader(validation_inputs, sampler=validation_sampler, batch_size=batch_size)
    model.to(device)
    
    """ Step 1: preparere optimizer """
    num_training_batches = len(train_dataloader)
    total_training_steps = num_training_batches * num_train_epochs
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, eps=eps, weight_decay=weight_decay)  

    # Auto-compute warmup steps if set to -1 (auto mode: 10% of total steps)
    if num_warmup_steps < 0:
        num_warmup_steps = int(0.1 * total_training_steps)
        print(f"Auto warmup steps: {num_warmup_steps} (10% of {total_training_steps} total steps)")

    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=num_warmup_steps, num_training_steps=total_training_steps)

    """ Step 2: preparere variables """
    validation_metric = np.empty(len(validation_dataloader))
    validation_loss = np.empty_like(validation_metric)
    
    best_metric_value = 0.0
    best_model = None
    input_metric = {
        'y_true' : None, 
        'y_pred' : None,
    }

    if model.num_labels > 2:
        if class_weights is not None:
            class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
            criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
            print(f"Using class-weighted CrossEntropyLoss with weights: {class_weights}")
        else:
            criterion = nn.CrossEntropyLoss()
        metric = accuracy_score
    else:
        criterion = nn.BCELoss()
        metric = f1_score
        input_metric['average'] = 'macro'
    
    """ Step 3: experiments """
    global_step = 0
    step_start_time = time.time()
    start_epoch = 0

    # Resume from latest epoch checkpoint if any exist
    existing_ckpts = sorted(
        [f for f in os.listdir(path_model) if f.startswith("checkpoint_epoch_") and f.endswith(".pt")]
        if os.path.exists(path_model) else []
    )
    if existing_ckpts:
        latest_ckpt = os.path.join(path_model, existing_ckpts[-1])
        ckpt = torch.load(latest_ckpt, map_location=device)
        model.load_state_dict(ckpt["model_state"])
        optimizer.load_state_dict(ckpt["optimizer_state"])
        scheduler.load_state_dict(ckpt["scheduler_state"])
        start_epoch = ckpt["epoch"] + 1
        global_step = ckpt["global_step"]
        best_metric_value = ckpt["best_metric_value"]
        print(f"Resumed from checkpoint: {latest_ckpt} (epoch {start_epoch}, step {global_step}, best metric {best_metric_value:.4f}")

    for idx_epoch in range(start_epoch, num_train_epochs):
        
        """ Step 3.1: Training """
        for (idx_train_batch, train_batch) in enumerate(train_dataloader):
            model.train()
            # 0: query_embedding, 1: product_embedding, 2: labels 
            labels = train_batch[2].to(device)
            optimizer.zero_grad()
            logits = model(train_batch[0].to(device), train_batch[1].to(device))

            if model.num_labels > 2:
                loss = criterion(logits.view(-1, model.num_labels), labels.view(-1))
                logits = logits.detach().cpu().numpy()
                hypothesis = np.argmax(logits, axis=1)
            else:
                output = torch.sigmoid(logits)
                output, labels = output.type(torch.FloatTensor), labels.type(torch.FloatTensor)
                loss = criterion(output, labels)
                output = output.detach().cpu().numpy()
                hypothesis = np.digitize(output, [0.5])
            
            loss.backward()
            clip_grad_norm_(model.parameters(), max_grad_norm) # clipping gradient for avoiding exploding gradients
            optimizer.step()
            scheduler.step()
            global_step += 1
            expected_predictions = labels.detach().cpu().numpy()

            input_metric['y_true'] = expected_predictions
            input_metric['y_pred'] = hypothesis

            training_metric = metric(**input_metric)

            if idx_train_batch % validation_steps == 0:
                model.eval()
                elapsed = time.time() - step_start_time
                s_per_it = elapsed / global_step if global_step > 0 else 0
                eta_seconds = s_per_it * (total_training_steps - global_step)
                eta_min = eta_seconds / 60
                print(f"Training - Epoch {idx_epoch+1}/{num_train_epochs}, Step: {global_step}/{total_training_steps}, Batch: {idx_train_batch+1}/{num_training_batches}, Loss: {loss:.3f}, Metric: {training_metric:.3f}, {s_per_it:.2f}s/it, ETA: {eta_min:.1f}min")
                """ Step 3.2: evaluating """
                for (idx_validation_batch, validation_batch) in enumerate(validation_dataloader):
                    # 0: query_embedding, 1: product_embedding, 2: labels
                    labels = validation_batch[2].to(device)
                    with torch.no_grad():
                        logits = model(validation_batch[0].to(device), validation_batch[1].to(device))
                    if model.num_labels > 2:
                        loss = criterion(logits.view(-1, model.num_labels), labels.view(-1))
                        logits = logits.detach().cpu().numpy()
                        hypothesis = np.argmax(logits, axis=1)
                    else:
                        output = torch.sigmoid(logits)
                        output, labels = output.type(torch.FloatTensor), labels.type(torch.FloatTensor)
                        loss = criterion(output, labels)
                        output = output.detach().cpu().numpy()
                        hypothesis = np.digitize(output, [0.5])
                    expected_predictions = labels.detach().cpu().numpy()
                    input_metric['y_true'] = expected_predictions
                    input_metric['y_pred'] = hypothesis
                    validation_metric[idx_validation_batch] = metric(**input_metric)
                    validation_loss[idx_validation_batch] = loss
                current_validation_metric = np.mean(validation_metric)

                print(f"Validation - Epoch {idx_epoch+1}/{num_train_epochs}, Step: {global_step}/{total_training_steps}, Loss: {np.mean(validation_loss):.3f}, Metric: {np.mean(validation_metric):.3f}")
                
                if current_validation_metric > best_metric_value:
                    best_metric_value = current_validation_metric
                    best_model = model
                    """ Step 4: store model """
                    pathlib.Path(path_model).mkdir(parents=True, exist_ok=True)
                    torch.save(best_model.state_dict(), os.path.join(path_model, "pytorch_model.bin"))

        # Save per-epoch checkpoint (resume + deployable)
        pathlib.Path(path_model).mkdir(parents=True, exist_ok=True)
        new_ckpt_path = os.path.join(path_model, f"checkpoint_epoch_{idx_epoch+1}.pt")
        torch.save({
            "epoch": idx_epoch,
            "global_step": global_step,
            "best_metric_value": best_metric_value,
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "scheduler_state": scheduler.state_dict(),
        }, new_ckpt_path)

        # Remove previous epoch checkpoint to save disk space
        if idx_epoch > start_epoch:
            prev_ckpt = os.path.join(path_model, f"checkpoint_epoch_{idx_epoch}.pt")
            if os.path.exists(prev_ckpt):
                os.remove(prev_ckpt)

        print(f"Epoch {idx_epoch+1} checkpoint saved: {new_ckpt_path}")