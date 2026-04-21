"""
Dataset Frequency & Ratio Analysis
Covers:
  1. Custom ESCI  — label frequency + ratios (E vs S vs C vs I)
  2. Intent       — single/multi-label classification counts + ratios
  3. Slot BIO     — entity mention frequency + ratios

Usage:
  python dataset_frequency_analysis.py
"""

import os
import ast
import pandas as pd
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ESCI_CSV   = os.path.join(BASE_DIR, "classification_identification", "custom_esci", "custom_esci_with_user_query.csv")
INTENT_XLS = os.path.join(BASE_DIR, "shopping_queries_dataset", "IntentDataset_cleaned.xlsx")
SLOT_XLS   = os.path.join(BASE_DIR, "shopping_queries_dataset", "slotannotationdataset_cleaned.xlsx")

W = 64


def bar(count, total, width=20):
    filled = round(count / total * width) if total else 0
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def ratio_str(a, b):
    """Express a:b as simplified ratio string, e.g. 1.0:1.03"""
    if b == 0:
        return "N/A"
    return f"1 : {b/a:.2f}" if a <= b else f"{a/b:.2f} : 1"


# ─────────────────────────────────────────────────────────────
#  1. ESCI
# ─────────────────────────────────────────────────────────────

def analyze_esci():
    print("\n" + "=" * W)
    print("  SECTION 1 — CUSTOM ESCI LABEL FREQUENCY & RATIO")
    print("=" * W)

    df = pd.read_csv(ESCI_CSV, encoding="latin-1")
    total = len(df)
    counts = df["label"].value_counts()

    labels = ["E", "S", "C", "I"]
    names  = {"E": "Exact", "S": "Substitute", "C": "Complement", "I": "Irrelevant"}
    vals   = {lbl: int(counts.get(lbl, 0)) for lbl in labels}

    print(f"\n  Total labeled pairs : {total:,}")
    print(f"  Unique queries      : {df['query'].nunique():,}\n")

    print(f"  {'Label':<12} {'Name':<14} {'Count':>7}  {'%':>6}  {'Visual'}")
    print(f"  {'-'*60}")
    for lbl in labels:
        c = vals[lbl]
        print(f"  {lbl:<12} {names[lbl]:<14} {c:>7,}  {c/total*100:>5.1f}%  {bar(c, total)}")

    # Pairwise ratios
    print(f"\n  Pairwise Ratios (relative to Exact baseline):")
    e = vals["E"]
    for lbl in ["S", "C", "I"]:
        c = vals[lbl]
        diff = c - e
        sign = "+" if diff >= 0 else ""
        print(f"    E vs {lbl} ({names[lbl]:<12}) :  {e:,} vs {c:,}  |  ratio {ratio_str(e, c)}  |  diff {sign}{diff:,}")

    # Relevant vs Irrelevant
    relevant = vals["E"] + vals["S"] + vals["C"]
    irrelevant = vals["I"]
    print(f"\n  Relevant (E+S+C) vs Irrelevant:")
    print(f"    Relevant   : {relevant:,}  ({relevant/total*100:.1f}%)")
    print(f"    Irrelevant : {irrelevant:,}  ({irrelevant/total*100:.1f}%)")
    print(f"    Ratio      : {ratio_str(relevant, irrelevant)}")


# ─────────────────────────────────────────────────────────────
#  2. Intent
# ─────────────────────────────────────────────────────────────

def analyze_intent():
    print("\n" + "=" * W)
    print("  SECTION 2 — INTENT LABEL FREQUENCY & RATIO")
    print("=" * W)

    df = pd.read_excel(INTENT_XLS, engine="openpyxl")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    intents = [c for c in ["single_search", "multi_search", "filtered_search", "free_form"] if c in df.columns]
    total = len(df)

    print(f"\n  Total queries : {total:,}")
    print(f"  Labels        : {', '.join(intents)}\n")

    # Per-label frequency
    print(f"  Per-label frequency (multi-label — a query can carry multiple intents):")
    print(f"  {'Intent':<20} {'Count':>7}  {'%':>6}  {'Visual'}")
    print(f"  {'-'*60}")
    counts = {}
    for intent in intents:
        c = int(df[intent].sum())
        counts[intent] = c
        print(f"  {intent:<20} {c:>7,}  {c/total*100:>5.1f}%  {bar(c, total)}")

    # Pairwise ratios against single_search
    base_lbl = "single_search"
    base_val = counts[base_lbl]
    print(f"\n  Ratios relative to '{base_lbl}':")
    for intent in intents:
        if intent == base_lbl:
            continue
        c = counts[intent]
        print(f"    {base_lbl} vs {intent:<20} :  {base_val:,} vs {c:,}  |  ratio {ratio_str(base_val, c)}")

    # Label combination counts
    combo_counter = Counter()
    for _, row in df.iterrows():
        combo = tuple(i for i in intents if row.get(i, 0) == 1)
        combo_counter[combo] += 1

    print(f"\n  Intent combination distribution (top 10):")
    print(f"  {'Combination':<44} {'Count':>7}  {'%':>6}")
    print(f"  {'-'*60}")
    for combo, cnt in combo_counter.most_common(10):
        label = " + ".join(combo) if combo else "(no label)"
        print(f"  {label:<44} {cnt:>7,}  {cnt/total*100:>5.1f}%")

    # Single-label vs multi-label queries
    label_counts_per_row = df[intents].sum(axis=1)
    single_lbl = int((label_counts_per_row == 1).sum())
    multi_lbl  = int((label_counts_per_row > 1).sum())
    none_lbl   = int((label_counts_per_row == 0).sum())
    print(f"\n  Single-label queries : {single_lbl:,}  ({single_lbl/total*100:.1f}%)")
    print(f"  Multi-label queries  : {multi_lbl:,}  ({multi_lbl/total*100:.1f}%)")
    if none_lbl:
        print(f"  No-label queries     : {none_lbl:,}  ({none_lbl/total*100:.1f}%)")
    print(f"  Single vs Multi ratio: {ratio_str(single_lbl, multi_lbl)}")
    print(f"  Avg intents per query: {label_counts_per_row.mean():.3f}")


# ─────────────────────────────────────────────────────────────
#  3. Slot BIO
# ─────────────────────────────────────────────────────────────

def analyze_slots():
    print("\n" + "=" * W)
    print("  SECTION 3 — SLOT BIO ENTITY FREQUENCY & RATIO")
    print("=" * W)

    df = pd.read_excel(SLOT_XLS, engine="openpyxl")
    labels_col = df.columns[1]

    entity_counter = Counter()   # B- tags = one entity mention each
    token_counter  = Counter()   # every token
    total_tokens   = 0
    total_seqs     = 0

    for _, row in df.iterrows():
        try:
            tags = ast.literal_eval(str(row[labels_col]).strip())
        except Exception:
            continue
        total_seqs += 1
        total_tokens += len(tags)
        for tag in tags:
            token_counter[tag] += 1
            if tag.startswith("B-"):
                entity_counter[tag[2:]] += 1

    total_entities = sum(entity_counter.values())
    o_count = token_counter.get("O", 0)

    print(f"\n  Total sequences     : {total_seqs:,}")
    print(f"  Total tokens        : {total_tokens:,}")
    print(f"  O (outside) tokens  : {o_count:,}  ({o_count/total_tokens*100:.1f}%)")
    print(f"  Total entity tokens : {total_tokens - o_count:,}  ({(total_tokens - o_count)/total_tokens*100:.1f}%)")
    print(f"  Total entity mentions (B- tags): {total_entities:,}\n")

    # Entity mention frequency
    sorted_entities = entity_counter.most_common()
    top_entity_name, top_entity_count = sorted_entities[0]

    print(f"  Entity Mention Frequency:")
    print(f"  {'Entity':<16} {'Mentions':>9}  {'%':>6}  {'vs PRODUCT1':>14}  {'Visual'}")
    print(f"  {'-'*72}")
    for etype, cnt in sorted_entities:
        ratio = f"{top_entity_count/cnt:.2f}x" if etype != top_entity_name else "baseline"
        print(f"  {etype:<16} {cnt:>9,}  {cnt/total_entities*100:>5.1f}%  {ratio:>14}  {bar(cnt, top_entity_count)}")

    # Product vs Filter vs Connector groupings
    product_slots  = ["PRODUCT1", "PRODUCT2"]
    filter_slots   = ["PRICE_MIN", "PRICE_MAX", "PRICE_MOD", "RATING_MIN", "RATING_MOD", "COLOR", "BRAND", "SIZE", "MATERIAL"]
    connector_slots = ["CONN"]

    grp_product   = sum(entity_counter.get(s, 0) for s in product_slots)
    grp_filter    = sum(entity_counter.get(s, 0) for s in filter_slots)
    grp_connector = sum(entity_counter.get(s, 0) for s in connector_slots)

    print(f"\n  Grouped entity distribution:")
    print(f"    Product  (PRODUCT1, PRODUCT2)      : {grp_product:,}  ({grp_product/total_entities*100:.1f}%)")
    print(f"    Filter   (price/rating/color/...)  : {grp_filter:,}  ({grp_filter/total_entities*100:.1f}%)")
    print(f"    Connector (CONN)                   : {grp_connector:,}  ({grp_connector/total_entities*100:.1f}%)")
    print(f"\n    Product vs Filter ratio : {ratio_str(grp_product, grp_filter)}")


# ─────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    analyze_esci()
    analyze_intent()
    analyze_slots()
    print("\n" + "=" * W + "\n  Analysis complete.\n" + "=" * W + "\n")
