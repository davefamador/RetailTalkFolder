"""
Data Cleaning - slotannotationdataset.xlsx

Cleans the slot annotation dataset:
  1. Removes rows where tokens exist but no slot labels (or vice versa)
  2. Removes rows where token/label lists have different lengths
  3. Strips whitespace from cell values before parsing
  4. Removes duplicate rows
  5. Saves cleaned output to slotannotationdataset_cleaned.xlsx

Usage:
  python clean_slot_annotation.py
"""

import pandas as pd
import ast
import os

DATASET_DIR = r"c:\Moi\Thesis\Code\RetailTalkFolder\shopping_queries_dataset"
INPUT_FILE = os.path.join(DATASET_DIR, "slotannotationdataset.xlsx")
OUTPUT_FILE = os.path.join(DATASET_DIR, "slotannotationdataset_cleaned.xlsx")

# -- 1. Load ---------------------------------------------------------------
print("=" * 60)
print("  SLOT ANNOTATION DATA CLEANING")
print("=" * 60)

df = pd.read_excel(INPUT_FILE, engine='openpyxl')
original_count = len(df)
print(f"\nOriginal shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(df.head())

# -- 2. Drop rows where Tokens OR Slot Label is missing --------------------
tokens_col = df.columns[0]  # 'Tokens'
labels_col = df.columns[1]  # 'Slot Label'

has_tokens_no_labels = ((~df[tokens_col].isna()) & (df[labels_col].isna())).sum()
has_labels_no_tokens = ((df[tokens_col].isna()) & (~df[labels_col].isna())).sum()
both_missing = (df[tokens_col].isna() & df[labels_col].isna()).sum()

print(f"\n-- Missing Data Check --")
print(f"  Rows with tokens but NO labels: {has_tokens_no_labels}")
print(f"  Rows with labels but NO tokens: {has_labels_no_tokens}")
print(f"  Rows with both missing:         {both_missing}")

# Show the problematic rows before dropping
if has_tokens_no_labels > 0:
    problem_rows = df[(~df[tokens_col].isna()) & (df[labels_col].isna())]
    print(f"\n  Rows with tokens but no labels:")
    for idx, row in problem_rows.iterrows():
        print(f"    Row {idx}: {repr(row[tokens_col])[:80]}")

if has_labels_no_tokens > 0:
    problem_rows = df[(df[tokens_col].isna()) & (~df[labels_col].isna())]
    print(f"\n  Rows with labels but no tokens:")
    for idx, row in problem_rows.iterrows():
        print(f"    Row {idx}: {repr(row[labels_col])[:80]}")

df = df.dropna(subset=[tokens_col, labels_col])
dropped_missing = original_count - len(df)
print(f"  -> Dropped {dropped_missing} rows with missing data")

# -- 3. Strip whitespace and validate parsing ------------------------------
df[tokens_col] = df[tokens_col].astype(str).str.strip()
df[labels_col] = df[labels_col].astype(str).str.strip()

parse_errors = []
length_mismatches = []
valid_mask = []

for idx, row in df.iterrows():
    try:
        tokens = ast.literal_eval(row[tokens_col])
        labels = ast.literal_eval(row[labels_col])
        
        if not isinstance(tokens, list) or not isinstance(labels, list):
            parse_errors.append(idx)
            valid_mask.append(False)
        elif len(tokens) != len(labels):
            length_mismatches.append(idx)
            valid_mask.append(False)
        elif len(tokens) == 0:
            parse_errors.append(idx)
            valid_mask.append(False)
        else:
            valid_mask.append(True)
    except Exception:
        parse_errors.append(idx)
        valid_mask.append(False)

print(f"\n-- Validation Check --")
print(f"  Parse errors:       {len(parse_errors)}")
print(f"  Length mismatches:   {len(length_mismatches)}")

if parse_errors:
    print(f"  Sample parse errors (first 3):")
    for idx in parse_errors[:3]:
        print(f"    Row {idx}: tokens={repr(df.loc[idx, tokens_col])[:60]}")

if length_mismatches:
    print(f"  Sample mismatches (first 3):")
    for idx in length_mismatches[:3]:
        t = ast.literal_eval(df.loc[idx, tokens_col])
        l = ast.literal_eval(df.loc[idx, labels_col])
        print(f"    Row {idx}: {len(t)} tokens vs {len(l)} labels")

df = df[valid_mask]
print(f"  -> Dropped {len(parse_errors) + len(length_mismatches)} invalid rows")

# -- 4. Remove duplicates -------------------------------------------------
before_dedup = len(df)
df = df.drop_duplicates(subset=[tokens_col, labels_col])
dropped_dupes = before_dedup - len(df)
print(f"\n-- Duplicate Check --")
print(f"  Duplicates found:   {dropped_dupes}")
print(f"  -> Dropped {dropped_dupes} duplicate rows")

# -- 5. Save ---------------------------------------------------------------
df = df[[tokens_col, labels_col]]
df.to_excel(OUTPUT_FILE, index=False, engine='openpyxl')

print(f"\n-- Summary --")
print(f"  Original rows:  {original_count}")
print(f"  Cleaned rows:   {len(df)}")
print(f"  Total dropped:  {original_count - len(df)}")
print(f"  Saved to: {OUTPUT_FILE}")

# -- 6. Verify -------------------------------------------------------------
df_verify = pd.read_excel(OUTPUT_FILE, engine='openpyxl')
print(f"\n  Verified shape: {df_verify.shape}")
print(f"  Remaining duplicates: {df_verify.duplicated().sum()}")
