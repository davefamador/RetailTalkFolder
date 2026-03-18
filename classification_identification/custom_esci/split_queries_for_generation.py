"""
split_queries_for_generation.py

Extracts unique queries from custom_esci_template.csv and saves them
as a single xlsx file for uploading to ChatGPT.

Usage:
    python split_queries_for_generation.py

Output:
    unique_queries_for_generation.xlsx
"""

import os
import pandas as pd

CSV_PATH = os.path.join(os.path.dirname(__file__), "custom_esci_template.csv")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "unique_queries_for_generation.xlsx")


def main():
    df = pd.read_csv(CSV_PATH)
    unique_queries = sorted(df["query"].str.strip().unique().tolist())

    out_df = pd.DataFrame({"keyword": unique_queries})
    out_df.to_excel(OUTPUT_PATH, index=False, engine="openpyxl")

    print(f"Total unique queries: {len(unique_queries)}")
    print(f"Saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
