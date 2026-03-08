"""
Step 1: Bootstrap Intent Labels
Auto-labels all unique queries from the Shopping Queries Dataset
with multi-label intents: single_search, multi_search, filtered_search, free_form
"""
import pandas as pd
import re
import time

print("=" * 60)
print("  STEP 1 — Bootstrap Intent Labels")
print("=" * 60)

# Load dataset
print("\n[1/3] Loading Shopping Queries Dataset...")
df = pd.read_parquet('shopping_queries_dataset/shopping_queries_dataset_examples.parquet')
queries = df['query'].unique()
print(f"       Found {len(queries):,} unique queries")

# --- Classification rules ---

MULTI_CONNECTORS = [' and ', ' with a ', ' plus ', ' & ', ' with matching ',
                    ' together with ', ' along with ', ' paired with ']

PRICE_KEYWORDS = ['under', 'below', 'above', 'between', 'cheap', 'affordable',
                  'budget', 'expensive', 'price', 'less than', 'more than',
                  'within', 'up to', 'cost', 'worth', 'value', 'priced',
                  'inexpensive', 'premium', 'luxury', 'economical',
                  'low cost', 'high end', 'pricey', 'on sale', 'discount',
                  'deal', 'bargain', 'clearance']

RATING_KEYWORDS = ['star', 'stars', 'rated', 'rating', 'review', 'reviews',
                   'top rated', 'highly rated', 'best rated', 'good reviews',
                   'well reviewed', 'popular', 'bestseller', 'best seller',
                   'top selling', 'highest rated', 'recommended']

FREE_FORM_PATTERNS = [
    r'\bi want\b', r'\bi need\b', r'\blooking for\b', r'\bcan you find\b',
    r'\bshow me\b', r'\bsomething for\b', r'\bhelp me find\b',
    r'\brecommend\b', r'\bsuggest\b', r'\bwhat.*good\b',
    r'\bfind me\b', r'\bget me\b', r'\bi\'m looking\b',
    r'\bdo you have\b', r'\bany.*available\b', r'\bwhere can i\b',
    r'\bgive me\b', r'\bpick.*for\b', r'\bchoose.*for\b',
    r'\bwhat should i\b', r'\bwhat would\b', r'\bwhich.*best\b',
    r'\bcan i get\b', r'\bis there\b',
]

# Pre-compile regex patterns for speed
FREE_FORM_COMPILED = [re.compile(p, re.IGNORECASE) for p in FREE_FORM_PATTERNS]

# Price-with-number pattern: detect "under 500", "$20", "99 dollar", etc.
PRICE_NUMBER_PATTERN = re.compile(
    r'(\$\s*\d+|\d+\s*(dollar|peso|php|usd|eur|gbp)s?|'
    r'(under|below|above|less than|more than|up to|within|between)\s+\d+|'
    r'\d+\s*(to|[-–])\s*\d+)',
    re.IGNORECASE
)


def classify_query(query):
    q = query.lower().strip()
    labels = set()

    # --- Multi-product search ---
    has_connector = any(conn in f' {q} ' for conn in MULTI_CONNECTORS)
    if has_connector:
        # Verify there are words on both sides of the connector (not just "salt and pepper shaker")
        for conn in MULTI_CONNECTORS:
            if conn in f' {q} ':
                parts = q.split(conn.strip(), 1)
                if len(parts) == 2 and len(parts[0].strip()) > 0 and len(parts[1].strip()) > 0:
                    # Check that right side isn't just a continuation of the same product name
                    # e.g. "salt and pepper" is one product, not two
                    right = parts[1].strip().split()[0] if parts[1].strip() else ''
                    left_last = parts[0].strip().split()[-1] if parts[0].strip() else ''
                    # Simple heuristic: if both sides have at least 1 word, mark as multi
                    labels.add('multi_search')
                break

    # --- Filtered search (price) ---
    has_price_keyword = any(kw in q for kw in PRICE_KEYWORDS)
    has_price_number = bool(PRICE_NUMBER_PATTERN.search(q))
    if has_price_keyword and has_price_number:
        labels.add('filtered_search')
    elif has_price_keyword and any(kw in q for kw in ['cheap', 'affordable', 'budget',
                                                        'expensive', 'premium', 'luxury',
                                                        'inexpensive', 'economical',
                                                        'low cost', 'high end',
                                                        'on sale', 'discount',
                                                        'deal', 'bargain', 'clearance']):
        labels.add('filtered_search')

    # --- Filtered search (rating) ---
    has_rating = any(kw in q for kw in RATING_KEYWORDS)
    if has_rating:
        labels.add('filtered_search')

    # --- Free-form natural language ---
    is_free_form = any(p.search(q) for p in FREE_FORM_COMPILED)
    if is_free_form:
        labels.add('free_form')

    # --- Default: single search ---
    if 'multi_search' not in labels:
        labels.add('single_search')

    return labels


# --- Process all queries ---
print("\n[2/3] Classifying queries...")
start = time.time()

results = []
for i, q in enumerate(queries):
    labels = classify_query(q)
    results.append({
        'query': q,
        'single_search': 1 if 'single_search' in labels else 0,
        'multi_search': 1 if 'multi_search' in labels else 0,
        'filtered_search': 1 if 'filtered   _search' in labels else 0,
        'free_form': 1 if 'free_form' in labels else 0,
    })
    if (i + 1) % 20000 == 0:
        print(f"       Processed {i + 1:,} / {len(queries):,} queries...")

elapsed = time.time() - start
print(f"       Done in {elapsed:.1f}s")

intent_df = pd.DataFrame(results)

# --- Report ---
print("\n" + "=" * 60)
print("  RESULTS")
print("=" * 60)
print(f"\n  Total queries: {len(intent_df):,}")
print()
for col in ['single_search', 'multi_search', 'filtered_search', 'free_form']:
    count = intent_df[col].sum()
    pct = count / len(intent_df) * 100
    print(f"  {col:20s}: {count:>7,}  ({pct:5.1f}%)")

# Show label combinations
print("\n  --- Label Combinations ---")
intent_df['combo'] = (
    intent_df[['single_search', 'multi_search', 'filtered_search', 'free_form']]
    .apply(lambda row: ' + '.join(
        [c for c in ['single_search', 'multi_search', 'filtered_search', 'free_form']
         if row[c] == 1]
    ), axis=1)
)
combo_counts = intent_df['combo'].value_counts()
for combo, count in combo_counts.items():
    pct = count / len(intent_df) * 100
    print(f"    {combo:50s}: {count:>7,}  ({pct:5.1f}%)")

intent_df = intent_df.drop(columns=['combo'])

# Show samples per category
print("\n  --- Sample Queries ---")
for col in ['multi_search', 'filtered_search', 'free_form']:
    subset = intent_df[intent_df[col] == 1].head(5)
    if len(subset) > 0:
        print(f"\n  [{col}]:")
        for _, row in subset.iterrows():
            print(f"    • {row['query']}")

# --- Save ---
print("\n[3/3] Saving...")
intent_df.to_csv('intent_training_data.csv', index=False)
print(f"       Saved to intent_training_data.csv ({len(intent_df):,} rows)")
print("\n✓ Step 1 complete!")