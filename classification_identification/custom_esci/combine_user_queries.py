"""
combine_user_queries.py

Reads the ChatGPT output file(s) containing (keyword, user_query) pairs,
maps them back to the full 52K ESCI dataset, and saves the augmented CSV.

Supports multiple partial output files in case ChatGPT timed out mid-processing.

Usage:
    python combine_user_queries.py

Input (any of these in the custom_esci/ folder):
    userqueries.xlsx
    userqueries.csv
    userqueries_1.xlsx, userqueries_2.xlsx, ...

Output:
    custom_esci_with_user_query.csv
"""

import os
import glob
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "custom_esci_template.csv")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "custom_esci_with_user_query.csv")


def find_output_files():
    """Find all ChatGPT output files (xlsx or csv)."""
    patterns = [
        os.path.join(SCRIPT_DIR, "userqueries*.xlsx"),
        os.path.join(SCRIPT_DIR, "userqueries*.csv"),
    ]
    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern))
    return sorted(set(files))


def load_output_file(path):
    """Load a single output file (xlsx or csv)."""
    if path.endswith(".xlsx") or path.endswith(".xls"):
        return pd.read_excel(path, engine="openpyxl")
    else:
        return pd.read_csv(path)


def main():
    # Load the original dataset
    print(f"Loading original dataset: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    df["query"] = df["query"].str.strip()
    unique_queries = set(df["query"].unique())
    print(f"  Total rows: {len(df)}")
    print(f"  Unique queries: {len(unique_queries)}")

    # Find and load ChatGPT output files
    output_files = find_output_files()
    if not output_files:
        print(f"\nERROR: No output files found.")
        print(f"Save ChatGPT's output as one of:")
        print(f"  {os.path.join(SCRIPT_DIR, 'userqueries.xlsx')}")
        print(f"  {os.path.join(SCRIPT_DIR, 'userqueries.csv')}")
        return

    print(f"\nFound {len(output_files)} output file(s):")
    mapping = {}
    for f in output_files:
        print(f"  Loading: {os.path.basename(f)}")
        out_df = load_output_file(f)

        # Normalize column names (ChatGPT may use different casing)
        out_df.columns = [c.strip().lower().replace(" ", "_") for c in out_df.columns]

        # Find the keyword and user_query columns
        keyword_col = None
        query_col = None
        for col in out_df.columns:
            if col in ("keyword", "keywords", "query"):
                keyword_col = col
            if col in ("user_query", "user_queries", "conversational_query", "natural_query"):
                query_col = col

        if keyword_col is None or query_col is None:
            print(f"    WARNING: Could not find keyword/user_query columns. Found: {out_df.columns.tolist()}")
            print(f"    Skipping this file.")
            continue

        for _, row in out_df.iterrows():
            keyword = str(row[keyword_col]).strip()
            user_query = str(row[query_col]).strip()
            if keyword and user_query and user_query != "nan":
                if keyword not in mapping:
                    mapping[keyword] = user_query

        print(f"    Loaded {len(out_df)} rows")

    print(f"\nTotal unique keyword mappings: {len(mapping)}")

    # Map user_queries to the dataset
    print(f"\nMapping user_queries to dataset...")
    df["user_query"] = df["query"].map(mapping)

    # Report coverage
    mapped = df["user_query"].notna().sum()
    missing = df["user_query"].isna().sum()
    unique_mapped = len(set(mapping.keys()) & unique_queries)
    unique_missing = unique_queries - set(mapping.keys())

    print(f"  Rows with user_query: {mapped}/{len(df)} ({mapped / len(df) * 100:.1f}%)")
    print(f"  Rows missing user_query: {missing}/{len(df)}")
    print(f"  Unique queries mapped: {unique_mapped}/{len(unique_queries)}")

    if unique_missing:
        print(f"\n  WARNING: {len(unique_missing)} unique queries have no user_query mapping.")
        show = sorted(unique_missing)[:20]
        for q in show:
            print(f"    - {q}")
        if len(unique_missing) > 20:
            print(f"    ... and {len(unique_missing) - 20} more")

    # Fill missing with empty string
    df["user_query"] = df["user_query"].fillna("")

    # Save
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved augmented dataset to: {OUTPUT_PATH}")
    print(f"  Columns: {df.columns.tolist()}")
    print(f"  Shape: {df.shape}")

    # Show samples
    print(f"\nSample rows:")
    has_query = df[df["user_query"] != ""]
    if len(has_query) > 0:
        sample = has_query.sample(min(10, len(has_query)), random_state=42)
        for _, row in sample.iterrows():
            print(f"  [{row['label']}] keyword: {row['query']}")
            print(f"       user_query: {row['user_query']}")
            print(f"       product: {row['product_title']}")
            print()


if __name__ == "__main__":
    main()
