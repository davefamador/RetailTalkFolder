import argparse
import torch
from torch.utils.data import TensorDataset
import torch.nn.functional as F
import torch
from transformers import BertModel, BertTokenizer
from torch.utils.data import DataLoader, SequentialSampler
from tqdm import tqdm
import numpy as np
import os
import pandas as pd

def generate_dataset(X, tokenizer, pad_to_max_length=True, add_special_tokens=True, max_length=256, return_attention_mask=True, return_tensors='pt'):
    tokens_query = tokenizer.batch_encode_plus(
        X, 
        padding='max_length' if pad_to_max_length else False,
        truncation=True,
        add_special_tokens=add_special_tokens,
        max_length=max_length,
        return_attention_mask=return_attention_mask, # 0: padded tokens, 1: not padded tokens; taking into account the sequence length
        return_tensors=return_tensors,
    )
    dataset = TensorDataset(
        tokens_query['input_ids'], 
        tokens_query['attention_mask'], 
        tokens_query['token_type_ids'],
    )   
    # 0: query_inputs_ids, 1 : query_attention_mask, 2 : query_token_type_ids, 3
    return dataset

def pool_summary(last_hidden_states, pool_summary_op="max"):
    num_features = last_hidden_states.size()[1]
    last_hidden_states_p = last_hidden_states.permute(0, 2, 1) # [batch_size, length, num_features] -> [batch_size, num_features, length]
    func_pool_summmary = F.max_pool1d if pool_summary_op == "max" else F.avg_pool1d
    return func_pool_summmary(last_hidden_states_p, kernel_size=num_features).squeeze(-1) # [batch_size, num_features]

def inference(model, dataloader, list_ids, checkpoint_file=None, checkpoint_every=50, device="cuda:0"):
    # Load checkpoint if it exists (resume from previous run)
    d = {}
    start_batch = 0
    if checkpoint_file and os.path.exists(checkpoint_file):
        d = np.load(checkpoint_file, allow_pickle=True).item()
        start_batch = len(d) // dataloader.batch_size
        print(f">>> Resuming from checkpoint: {len(d)} items already processed, skipping ~{start_batch} batches")

    i = 0
    model.to(device)
    total_batches = len(dataloader)
    for batch_idx, dataloader_batch in enumerate(tqdm(dataloader, initial=start_batch, total=total_batches)):
        # Skip batches that were already processed
        batch_size = dataloader_batch[0].shape[0]
        list_ids_ = list_ids[i:i+batch_size]
        i = i + batch_size

        # Check if this batch was already processed
        if all(id_ in d for id_ in list_ids_):
            continue

        # 0: inputs_ids, 1: attention_mask, 2: token_type_ids, 3: ids
        inputs = {
            'input_ids': dataloader_batch[0].to(device),
            'attention_mask': dataloader_batch[1].to(device),
            'token_type_ids': dataloader_batch[2].to(device),
        }
        with torch.no_grad():
            output_ = pool_summary(model(**inputs)[0]).detach().cpu().numpy()
            for (j, id_) in enumerate(list_ids_):
                d[id_] = output_[j]

        # Save checkpoint periodically
        if checkpoint_file and (batch_idx + 1) % checkpoint_every == 0:
            np.save(checkpoint_file, d)
            print(f">>> Checkpoint saved: {len(d)}/{len(list_ids)} items ({len(d)*100//len(list_ids)}%)")

    return d

def compute_bert_representations(df, output_file, col_id, col_text, tokenizer, model, max_length=256, batch_size=128, device="cuda:0"):    
    # Check if final output already exists — skip entirely
    if os.path.exists(output_file + ".npy"):
        print(f">>> Output already exists: {output_file}.npy — skipping!")
        return

    checkpoint_file = output_file + "_checkpoint.npy"

    dataset = generate_dataset(
        df[col_text].to_list(),
        tokenizer, 
        max_length=max_length,
    )
    sampler = SequentialSampler(dataset)
    dataloader = DataLoader(dataset, sampler=sampler, batch_size=batch_size)
    result = inference(
        model,
        dataloader,
        df[col_id].to_list(),
        checkpoint_file=checkpoint_file,
        checkpoint_every=50,
        device=device,
    )
    # Save final result
    np.save(output_file, result)
    print(f">>> Final output saved: {output_file}.npy")

    # Clean up checkpoint file
    if os.path.exists(checkpoint_file):
        os.remove(checkpoint_file)
        print(f">>> Checkpoint file removed: {checkpoint_file}")


def main():
    
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_path", type=str, help="Directory where the dataset is stored.")
    parser.add_argument("split", type=str, choices=['train', 'test'], help="Split of the dataset.")
    parser.add_argument("--output_queries_path_file", type=str, default=None, help="Output file with the mapping of the queries to BERT representations.")
    parser.add_argument("--output_product_catalogue_path_file", type=str, default=None, help="Output file with the mapping of the queries to BERT representations.")
    parser.add_argument("--model_name", type=str, default="bert-base-multilingual-uncased", help="BERT multilingual model name.")
    parser.add_argument("--bert_max_length", type=int, default=256, help="Tokens consumed by BERT (512 tokens max).")
    parser.add_argument("--batch_size", type=int, default=128, help="Batch size.")
    
    args = parser.parse_args()

    """ 1. Load models"""
    model = BertModel.from_pretrained(args.model_name)
    tokenizer = BertTokenizer.from_pretrained(args.model_name)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    """ 2. Load data """
    col_query = "query"
    col_query_id = "query_id"
    col_product_id = "product_id" 
    col_product_title = "product_title"
    col_product_description = "product_description"
    col_product_locale = "product_locale"
    col_large_version = "large_version"
    col_split = "split"
    col_product_text = "product_text"  # combined title + description

    df_examples = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_examples.parquet'))
    df_products = pd.read_parquet(os.path.join(args.dataset_path, 'shopping_queries_dataset_products.parquet'))
    df_examples_products = pd.merge(
        df_examples,
        df_products,
        how='left',
        left_on=[col_product_locale, col_product_id],
        right_on=[col_product_locale, col_product_id]
    )
    df_examples_products = df_examples_products[df_examples_products[col_large_version] == 1]
    df_examples_products = df_examples_products[df_examples_products[col_split] == args.split]

    """ 3. Encode products (title + description for richer context) """
    df_products = df_examples_products[[col_product_id, col_product_title, col_product_description]].copy()
    df_products = df_products.drop_duplicates(subset=[col_product_id])
    df_products[col_product_title] = df_products[col_product_title].fillna('')
    df_products[col_product_description] = df_products[col_product_description].fillna('')
    df_products[col_product_text] = df_products[col_product_title] + " " + df_products[col_product_description]
    print(f"Encoding products with title + description (avg text length: {df_products[col_product_text].str.len().mean():.0f} chars)")
    compute_bert_representations(
        df_products,
        args.output_product_catalogue_path_file, 
        col_product_id, 
        col_product_text, 
        tokenizer, 
        model, 
        max_length=args.bert_max_length, 
        batch_size=args.batch_size,
        device=device,
    )
    
    """ 4. Encode queries """
    df_examples = df_examples_products[[col_query_id, col_query]]
    df_examples = df_examples.drop_duplicates(subset=[col_query_id, col_query])
    df_examples[col_query] = df_examples[col_query].fillna('')
    compute_bert_representations(
        df_examples, 
        args.output_queries_path_file, 
        col_query_id, 
        col_query, 
        tokenizer, 
        model, 
        max_length=args.bert_max_length, 
        batch_size=args.batch_size,
        device=device,
    )


if __name__ == "__main__": 
    main()  