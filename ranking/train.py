"""
Ranking Model Training — Cross-Language CrossEncoder
Includes:
- Frequent checkpointing (every N steps)
- Signal handler to save on interruption (Ctrl+C)
- Automatic resume from checkpoint if available
- Full training state preservation (step, epoch, optimizer, scheduler)
"""

import argparse
import json
import os
import shutil
import signal
import sys
import tempfile
import pandas as pd
import torch
from sentence_transformers.cross_encoder import CrossEncoder
from sentence_transformers.cross_encoder.evaluation import CERerankingEvaluator
from sentence_transformers import InputExample
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from transformers import get_linear_schedule_with_warmup


# Global reference for signal handler
_trainer_state = None


def save_on_interrupt(signum, frame):
    """Save model checkpoint when training is interrupted."""
    print("\n\n[!] Training interrupted! Saving checkpoint...")
    if _trainer_state is not None:
        save_full_checkpoint(_trainer_state)
        print(f"[✓] Checkpoint saved to: {_trainer_state['checkpoint_dir']}")
    else:
        print("[!] No model to save.")
    sys.exit(0)


def save_full_checkpoint(state):
    """Save model weights + training state (step, epoch, optimizer, scheduler).
    
    Uses a temp directory to avoid Windows file-locking errors (os error 1224)
    when overwriting model.safetensors that is memory-mapped by the same process.
    """
    checkpoint_dir = state['checkpoint_dir']
    os.makedirs(checkpoint_dir, exist_ok=True)

    # Save model weights to a TEMP directory first, then copy over
    # This avoids Windows file lock on model.safetensors
    tmp_dir = tempfile.mkdtemp(prefix="ranking_ckpt_")
    try:
        state['model'].save(tmp_dir)
        # Copy saved files from temp to checkpoint dir
        # Windows won't allow overwriting memory-mapped files,
        # but WILL allow deleting them — so delete first, then copy.
        for fname in os.listdir(tmp_dir):
            src = os.path.join(tmp_dir, fname)
            dst = os.path.join(checkpoint_dir, fname)
            if os.path.isfile(src):
                if os.path.exists(dst):
                    try:
                        os.remove(dst)
                    except OSError:
                        # If we still can't delete, rename it out of the way
                        bak = dst + ".bak"
                        if os.path.exists(bak):
                            os.remove(bak)
                        os.rename(dst, bak)
                shutil.copy2(src, dst)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    # Save training state
    training_state = {
        'global_step': state['global_step'],
        'epoch': state['epoch'],
        'best_score': state.get('best_score', -1),
    }

    # Save optimizer & scheduler states
    torch.save(state['optimizer'].state_dict(), os.path.join(checkpoint_dir, 'optimizer.pt'))
    torch.save(state['scheduler'].state_dict(), os.path.join(checkpoint_dir, 'scheduler.pt'))

    with open(os.path.join(checkpoint_dir, 'training_state.json'), 'w') as f:
        json.dump(training_state, f, indent=2)

    print()
    print("  " + "=" * 50)
    print(f"  ✓ CHECKPOINT SAVED — Step {state['global_step']} (Epoch {state['epoch'] + 1})")
    print(f"    Location: {checkpoint_dir}")
    print(f"    Best score so far: {state.get('best_score', -1):.4f}")
    print("  " + "=" * 50)
    print()


def load_training_state(checkpoint_dir):
    """Load training state from checkpoint directory. Returns None if not found."""
    state_path = os.path.join(checkpoint_dir, 'training_state.json')
    if not os.path.exists(state_path):
        return None

    with open(state_path, 'r') as f:
        training_state = json.load(f)

    optimizer_path = os.path.join(checkpoint_dir, 'optimizer.pt')
    scheduler_path = os.path.join(checkpoint_dir, 'scheduler.pt')

    training_state['has_optimizer'] = os.path.exists(optimizer_path)
    training_state['has_scheduler'] = os.path.exists(scheduler_path)

    return training_state


def main():
    parser = argparse.ArgumentParser(description="Train a cross-language ranking model.")
    parser.add_argument("dataset_path", type=str, help="Directory where the dataset is stored.")
    parser.add_argument("model_save_path", type=str, help="Directory to save the trained model.")
    parser.add_argument("--random_state", type=int, default=42, help="Random seed.")
    parser.add_argument("--n_dev_queries", type=int, default=200, help="Number of dev queries.")
    parser.add_argument("--train_batch_size", type=int, default=32, help="Batch size.")
    parser.add_argument("--evaluation_steps", type=int, default=100, help="Save checkpoint every N steps.")
    parser.add_argument("--warmup_steps", type=int, default=1000, help="Warmup steps.")
    parser.add_argument("--num_epochs", type=int, default=1, help="Number of training epochs.")
    parser.add_argument("--lr", type=float, default=7e-6, help="Learning rate.")
    parser.add_argument("--model_name", type=str, default="cross-encoder/ms-marco-MiniLM-L-12-v2",
                        help="Base model to fine-tune.")
    parser.add_argument("--max_train_examples", type=int, default=0,
                        help="Max training examples (0 = use all). Lower = faster training.")
    parser.add_argument("--resume", action="store_true",
                        help="Resume training from checkpoint (auto-detected from model_save_path).")
    args = parser.parse_args()

    global _trainer_state

    # Register signal handler for graceful interruption
    signal.signal(signal.SIGINT, save_on_interrupt)
    signal.signal(signal.SIGTERM, save_on_interrupt)

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
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    esci_label2gain = {
        'E': 1.0,
        'S': 0.1,
        'C': 0.01,
        'I': 0.0,
    }

    checkpoint_dir = f"{args.model_save_path}_checkpoints"

    # --- Check for existing checkpoint to resume ---
    resumed_state = None
    if args.resume:
        resumed_state = load_training_state(checkpoint_dir)
        if resumed_state:
            print(f"[RESUME] Found checkpoint at step {resumed_state['global_step']}, epoch {resumed_state['epoch']}")
            print(f"  Loading model from: {checkpoint_dir}")
            args.model_name = checkpoint_dir  # Load model from checkpoint
        else:
            print("[RESUME] No checkpoint found, starting fresh.")

    # --- 1. Load data (ALL locales) ---
    print("[Step 1] Loading dataset")
    df_examples = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_examples.parquet'))
    df_products = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_products.parquet'))

    df = pd.merge(
        df_examples,
        df_products,
        how='left',
        left_on=[col_product_locale, col_product_id],
        right_on=[col_product_locale, col_product_id]
    )

    # Filter to small version and train split (ALL locales included)
    df = df[df[col_small_version] == 1]
    df = df[df[col_split] == "train"]
    df[col_gain] = df[col_esci_label].apply(lambda x: esci_label2gain[x])

    # Drop rows with missing product titles
    df = df.dropna(subset=[col_product_title])

    print(f"  Total training examples: {len(df)}")
    for locale in df[col_product_locale].unique():
        count = len(df[df[col_product_locale] == locale])
        print(f"    {locale}: {count} examples")

    # Sample if max_train_examples is set
    if args.max_train_examples > 0 and len(df) > args.max_train_examples:
        print(f"  Sampling {args.max_train_examples} examples from {len(df)}...")
        df = df.sample(n=args.max_train_examples, random_state=args.random_state)
        print(f"  Sampled: {len(df)} examples")

    # --- 2. Train/Dev split by query_id ---
    print("[Step 2] Splitting train/dev...")
    list_query_id = df[col_query_id].unique()
    dev_size = min(args.n_dev_queries / len(list_query_id), 0.1)
    list_query_id_train, list_query_id_dev = train_test_split(
        list_query_id, test_size=dev_size, random_state=args.random_state
    )

    df = df[[col_query_id, col_query, col_product_title, col_gain]]
    df_train = df[df[col_query_id].isin(list_query_id_train)]
    df_dev = df[df[col_query_id].isin(list_query_id_dev)]

    print(f"  Train queries: {len(list_query_id_train)}, Dev queries: {len(list_query_id_dev)}")
    print(f"  Train examples: {len(df_train)}, Dev examples: {len(df_dev)}")

    # --- 3. Prepare data ---
    print("[Step 3] Preparing data loaders...")
    train_samples = []
    for (_, row) in df_train.iterrows():
        train_samples.append(
            InputExample(texts=[row[col_query], row[col_product_title]], label=float(row[col_gain]))
        )
    def collate_fn(batch):
        """Custom collate for InputExample objects."""
        texts_a = []
        texts_b = []
        labels = []
        for example in batch:
            texts_a.append(example.texts[0].strip())
            texts_b.append(example.texts[1].strip())
            labels.append(example.label)
        return texts_a, texts_b, torch.tensor(labels, dtype=torch.float)

    train_dataloader = DataLoader(train_samples, shuffle=True, batch_size=args.train_batch_size, drop_last=True, collate_fn=collate_fn)

    # Prepare dev evaluator
    dev_samples = {}
    query2id = {}
    for (_, row) in df_dev.iterrows():
        try:
            qid = query2id[row[col_query]]
        except KeyError:
            qid = len(query2id)
            query2id[row[col_query]] = qid
        if qid not in dev_samples:
            dev_samples[qid] = {'query': row[col_query], 'positive': set(), 'negative': set()}
        if row[col_gain] > 0:
            dev_samples[qid]['positive'].add(row[col_product_title])
        else:
            dev_samples[qid]['negative'].add(row[col_product_title])

    # Convert sets to lists for the evaluator
    for qid in dev_samples:
        dev_samples[qid]['positive'] = list(dev_samples[qid]['positive'])
        dev_samples[qid]['negative'] = list(dev_samples[qid]['negative'])

    evaluator = CERerankingEvaluator(dev_samples, name='train-eval')

    # --- 4. Initialize model ---
    print(f"[Step 4] Loading CrossEncoder: {args.model_name}")
    print(f"  Device: {device}")
    model = CrossEncoder(
        args.model_name,
        num_labels=1,
        max_length=512,
        activation_fn=torch.nn.Identity(),
        device=device,
    )

    # --- 5. Custom Training Loop with Checkpoint Resumption ---
    print(f"[Step 5] Training for {args.num_epochs} epoch(s)...")
    total_steps_per_epoch = len(train_dataloader)
    total_steps = total_steps_per_epoch * args.num_epochs
    print(f"  Batches per epoch: {total_steps_per_epoch}")
    print(f"  Total steps: {total_steps}")
    print(f"  Checkpoint every {args.evaluation_steps} steps")
    print(f"  Press Ctrl+C to stop — model will be saved automatically")
    print()

    # Set up optimizer
    param_optimizer = list(model.model.named_parameters())
    no_decay = ['bias', 'LayerNorm.bias', 'LayerNorm.weight']
    optimizer_grouped_parameters = [
        {'params': [p for n, p in param_optimizer if not any(nd in n for nd in no_decay)], 'weight_decay': 0.01},
        {'params': [p for n, p in param_optimizer if any(nd in n for nd in no_decay)], 'weight_decay': 0.0}
    ]
    optimizer = torch.optim.AdamW(optimizer_grouped_parameters, lr=args.lr)

    # Set up scheduler
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=total_steps
    )

    # Determine resume point
    start_epoch = 0
    start_step = 0
    best_score = -1

    if resumed_state:
        start_epoch = resumed_state['epoch']
        start_step = resumed_state['global_step']
        best_score = resumed_state.get('best_score', -1)

        # Restore optimizer & scheduler states
        optimizer_path = os.path.join(checkpoint_dir, 'optimizer.pt')
        scheduler_path = os.path.join(checkpoint_dir, 'scheduler.pt')
        if resumed_state['has_optimizer']:
            optimizer.load_state_dict(torch.load(optimizer_path, map_location=device, weights_only=True))
            print(f"  [RESUME] Optimizer state restored")
        if resumed_state['has_scheduler']:
            scheduler.load_state_dict(torch.load(scheduler_path, map_location=device, weights_only=True))
            print(f"  [RESUME] Scheduler state restored")
        print(f"  [RESUME] Resuming from step {start_step} (epoch {start_epoch})")
        print()

    # Set up trainer state for signal handler
    _trainer_state = {
        'model': model,
        'optimizer': optimizer,
        'scheduler': scheduler,
        'checkpoint_dir': checkpoint_dir,
        'global_step': start_step,
        'epoch': start_epoch,
        'best_score': best_score,
    }

    loss_fct = torch.nn.MSELoss()
    model.model.train()
    global_step = start_step

    for epoch in range(start_epoch, args.num_epochs):
        epoch_start_step = epoch * total_steps_per_epoch
        steps_to_skip = max(0, global_step - epoch_start_step) if epoch == start_epoch else 0

        pbar = tqdm(
            enumerate(train_dataloader),
            total=total_steps_per_epoch,
            desc=f"Epoch {epoch + 1}/{args.num_epochs}",
            initial=steps_to_skip,
        )

        for batch_idx, (texts_a, texts_b, labels) in pbar:
            # Skip already-completed steps when resuming
            if batch_idx < steps_to_skip:
                continue

            # Forward pass
            features = model.tokenizer(
                texts_a, texts_b,
                padding=True, truncation='longest_first',
                return_tensors="pt", max_length=model.max_length
            )
            features = {k: v.to(device) for k, v in features.items()}
            labels = labels.to(device)

            model_predictions = model.model(**features, return_dict=True)
            logits = model_predictions.logits
            if model.activation_fn is not None:
                logits = model.activation_fn(logits)
            logits = logits.view(-1)

            loss = loss_fct(logits, labels)

            # Backward pass
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad()

            global_step += 1
            _trainer_state['global_step'] = global_step
            _trainer_state['epoch'] = epoch

            pbar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'lr': f'{scheduler.get_last_lr()[0]:.2e}',
                'step': global_step,
            })

            # Periodic checkpoint + evaluation
            if global_step % args.evaluation_steps == 0:
                model.model.eval()
                print()
                print("  " + "-" * 50)
                print(f"  ⏳ EVALUATING at step {global_step}...")
                score = evaluator(model, output_path=checkpoint_dir)
                
                # In newer sentence-transformers, score might be a dict
                if isinstance(score, dict):
                    score = float(list(score.values())[0])

                print(f"  📊 Eval score: {score:.4f}")

                if score > best_score:
                    best_score = score
                    _trainer_state['best_score'] = best_score
                    print(f"  🏆 NEW BEST SCORE!")

                print(f"  💾 Saving checkpoint...")
                save_full_checkpoint(_trainer_state)
                model.model.train()

        _trainer_state['epoch'] = epoch + 1

    # --- 6. Save final model ---
    model.save(args.model_save_path)
    save_full_checkpoint(_trainer_state)

    print(f"\n[DONE] Ranking model saved to: {args.model_save_path}")
    print(f"  Checkpoints at: {checkpoint_dir}")
    print()
    print("  To use in RetailTalk, set in .env:")
    print(f"    RANKER_MODEL_PATH={args.model_save_path}")

if __name__ == "__main__":
    main()