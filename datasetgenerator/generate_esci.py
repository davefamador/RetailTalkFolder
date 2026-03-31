"""
ESCI Dataset Generator using Google Gemini (free tier).

Generates query-product pairs with ESCI labels (Exact, Substitute, Complement, Irrelevant)
and natural user queries. Outputs to CSV compatible with the custom_esci format.

Usage:
    python generate_esci.py --num-queries 50 --output esci_generated.csv

    API key is loaded from datasetgenerator/.env file automatically.
"""

import argparse
import csv
import json
import os
import re
import time
import random
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load .env from the same directory as this script
load_dotenv(Path(__file__).parent / ".env")


PROMPT_TEMPLATE = """You are generating training data for an e-commerce product search relevance classifier (ESCI).

For each product query below, generate exactly {products_per_query} product entries with these ESCI labels:
- **E (Exact)**: The product directly matches the query. (generate {e_count})
- **S (Substitute)**: A reasonable alternative/substitute product. (generate {s_count})
- **C (Complement)**: A complementary/accessory product often bought with it. (generate {c_count})
- **I (Irrelevant)**: A completely unrelated product. (generate {i_count})

Also generate a natural user query — a casual way someone might search for this product. Mix English and Filipino/Taglish naturally (about 40% Filipino/Taglish, 60% English). Examples of natural queries:
- "Ano magandang running shoes for daily use?"
- "Need recommendations for face serum"
- "Pwede ba makahanap ng white sneakers na mura lang?"
- "Looking for a good laptop bag"
- "May affordable coffee beans ba kayo?"

Product titles should be realistic e-commerce product names with brand, specs, and details (like you'd see on Lazada/Shopee/Amazon).

Queries to generate data for:
{queries}

Return ONLY a valid JSON array of objects, each with these fields:
- "query": the base product search term
- "product_title": realistic product title
- "label": one of "E", "S", "C", "I"
- "user_query": natural language query

Example output format:
[
  {{"query": "running shoes", "product_title": "Nike Air Zoom Pegasus Running Shoes", "label": "E", "user_query": "What's a good running shoes for daily use?"}},
  {{"query": "running shoes", "product_title": "Adidas Ultraboost Lightweight Sneakers", "label": "S", "user_query": "What's a good running shoes for daily use?"}}
]

IMPORTANT: Return ONLY the JSON array. No markdown, no explanation, no code blocks."""


# Product categories to sample from when user doesn't provide queries
DEFAULT_CATEGORIES = [
    # Electronics
    "bluetooth speaker", "wireless mouse", "mechanical keyboard", "webcam", "usb hub",
    "power bank", "hdmi cable", "screen protector", "phone case", "smartwatch",
    "gaming headset", "monitor stand", "laptop stand", "tablet", "memory card",
    "flash drive", "portable ssd", "router", "ethernet cable", "surge protector",
    # Fashion
    "polo shirt", "cargo pants", "leather belt", "baseball cap", "sunglasses",
    "crossbody bag", "ankle boots", "maxi dress", "denim jacket", "swimsuit",
    "hoodie", "jogger pants", "sandals", "wallet", "backpack",
    # Home & Kitchen
    "rice cooker", "air fryer", "blender", "knife set", "cutting board",
    "water bottle", "lunch box", "thermos", "dish rack", "trash can",
    "bed sheets", "pillow", "curtains", "desk lamp", "extension cord",
    # Beauty & Personal Care
    "sunscreen", "lip balm", "moisturizer", "hair dryer", "electric toothbrush",
    "perfume", "nail polish", "makeup brush set", "facial cleanser", "body lotion",
    # Food & Grocery
    "instant noodles", "soy sauce", "cooking oil", "canned corned beef", "powdered milk",
    "peanut butter", "chocolate bar", "green tea", "protein powder", "oatmeal",
    # Sports & Outdoors
    "yoga mat", "resistance bands", "jump rope", "water jug", "gym gloves",
    "cycling shorts", "sports bra", "football", "tennis racket", "swimming goggles",
    # Baby & Kids
    "baby bottle", "diapers", "baby wipes", "stroller", "car seat",
    # Office
    "ballpen", "notebook", "sticky notes", "stapler", "whiteboard marker",
    # Pet Supplies
    "dog food", "cat litter", "pet collar", "fish tank filter", "bird cage",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Generate ESCI dataset using Gemini")
    parser.add_argument("--api-key", type=str, default=None,
                        help="Gemini API key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--num-queries", type=int, default=50,
                        help="Number of product queries to generate data for (default: 50)")
    parser.add_argument("--products-per-query", type=int, default=5,
                        help="Products per query: E + S + C + I entries (default: 5)")
    parser.add_argument("--e-count", type=int, default=1, help="Exact matches per query (default: 1)")
    parser.add_argument("--s-count", type=int, default=1, help="Substitutes per query (default: 1)")
    parser.add_argument("--c-count", type=int, default=1, help="Complements per query (default: 1)")
    parser.add_argument("--i-count", type=int, default=1, help="Irrelevant per query (default: 1)")
    parser.add_argument("--batch-size", type=int, default=5,
                        help="Queries per API call (default: 5, keep low for free tier)")
    parser.add_argument("--output", type=str, default="esci_generated.csv",
                        help="Output CSV file path (default: esci_generated.csv)")
    parser.add_argument("--append", action="store_true",
                        help="Append to existing CSV instead of overwriting")
    parser.add_argument("--queries-file", type=str, default=None,
                        help="Text file with one query per line (optional, otherwise uses built-in list)")
    parser.add_argument("--model", type=str, default="gemini-2.0-flash",
                        help="Gemini model to use (default: gemini-2.0-flash)")
    parser.add_argument("--delay", type=float, default=4.0,
                        help="Delay in seconds between API calls for rate limiting (default: 4.0)")
    return parser.parse_args()


def get_queries(args):
    """Get the list of product queries to generate data for."""
    if args.queries_file:
        with open(args.queries_file, "r", encoding="utf-8") as f:
            queries = [line.strip() for line in f if line.strip()]
        print(f"Loaded {len(queries)} queries from {args.queries_file}")
    else:
        queries = random.sample(DEFAULT_CATEGORIES, min(args.num_queries, len(DEFAULT_CATEGORIES)))
        if args.num_queries > len(DEFAULT_CATEGORIES):
            print(f"Warning: only {len(DEFAULT_CATEGORIES)} built-in queries available, "
                  f"using all of them instead of {args.num_queries}")
        print(f"Using {len(queries)} queries from built-in categories")
    return queries[:args.num_queries]


def extract_json(text):
    """Extract JSON array from Gemini response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("["):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def parse_retry_delay(error_str):
    """Extract the retry delay in seconds from a Gemini 429 error message."""
    match = re.search(r"retry in ([\d.]+)s", str(error_str))
    if match:
        return float(match.group(1))
    match = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", str(error_str))
    if match:
        return float(match.group(1))
    return None


def load_api_keys(cli_key=None):
    """Collect all Gemini API keys from env vars (GEMINI_API_KEY, GEMINI_API_KEY1, ...)."""
    keys = []
    if cli_key:
        keys.append(cli_key)
    base = os.environ.get("GEMINI_API_KEY")
    if base and base not in keys:
        keys.append(base)
    for i in range(1, 20):
        val = os.environ.get(f"GEMINI_API_KEY{i}")
        if val and val not in keys:
            keys.append(val)
    return keys


def create_client(api_key):
    """Create a genai Client with internal retries disabled (we handle retries ourselves)."""
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta", "timeout": 120_000})


def generate_batch(client, model_name, queries_batch, args):
    """Call Gemini to generate ESCI data for a batch of queries."""
    products_per_query = args.e_count + args.s_count + args.c_count + args.i_count
    queries_str = "\n".join(f"- {q}" for q in queries_batch)

    prompt = PROMPT_TEMPLATE.format(
        products_per_query=products_per_query,
        e_count=args.e_count,
        s_count=args.s_count,
        c_count=args.c_count,
        i_count=args.i_count,
        queries=queries_str,
    )

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={"http_options": {"timeout": 120_000}},
    )
    data = extract_json(response.text)

    if data is None:
        print(f"  Warning: Failed to parse JSON from response. Raw text:\n{response.text[:500]}")
        return []

    valid = []
    for entry in data:
        if all(k in entry for k in ("query", "product_title", "label", "user_query")):
            if entry["label"] in ("E", "S", "C", "I"):
                valid.append(entry)
            else:
                print(f"  Skipping invalid label: {entry.get('label')}")
        else:
            print(f"  Skipping malformed entry: {entry}")

    return valid


def main():
    args = parse_args()

    api_keys = load_api_keys(args.api_key)
    if not api_keys:
        print("Error: No Gemini API keys found.")
        print("Add keys to datasetgenerator/.env (GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2, ...)")
        print("Get a free key at: https://aistudio.google.com/apikey")
        return

    # Pre-create a client per key
    clients = [create_client(key) for key in api_keys]
    print(f"Loaded {len(api_keys)} API key(s) — will rotate across them per batch")

    queries = get_queries(args)
    total_batches = (len(queries) + args.batch_size - 1) // args.batch_size

    output_path = args.output
    file_mode = "a" if args.append else "w"
    write_header = not args.append or not os.path.exists(output_path)

    all_rows = []
    print(f"\nGenerating ESCI data: {len(queries)} queries, {total_batches} batches")
    print(f"Model: {args.model} | Output: {output_path}\n")

    for i in range(0, len(queries), args.batch_size):
        batch = queries[i : i + args.batch_size]
        batch_num = i // args.batch_size + 1

        # Rotate key round-robin
        key_index = (batch_num - 1) % len(clients)
        print(f"Batch {batch_num}/{total_batches} [key {key_index + 1}/{len(clients)}]: {batch}")

        retries = 0
        while retries < 3:
            current_key = (key_index + retries) % len(clients)
            try:
                rows = generate_batch(clients[current_key], args.model, batch, args)
                all_rows.extend(rows)
                print(f"  -> Got {len(rows)} entries")
                break
            except Exception as e:
                retries += 1
                # Get the root cause (tenacity wraps the real error)
                root = e.__cause__ or e
                error_str = str(root)

                # Parse the suggested retry delay from the error
                suggested_delay = parse_retry_delay(error_str)
                wait = suggested_delay + 2 if suggested_delay else args.delay * (2 ** retries)

                # Shorten error output
                short_err = error_str.split("\n")[0][:120]
                print(f"  Error (key {current_key + 1}): {short_err}")

                if retries < 3:
                    next_key = (key_index + retries) % len(clients)
                    print(f"  Retrying with key {next_key + 1}/{len(clients)} "
                          f"in {wait:.0f}s... (attempt {retries + 1}/3)")
                    time.sleep(wait)
                else:
                    print(f"  Skipping batch after 3 failures.")

        # Rate limit delay between batches
        if i + args.batch_size < len(queries):
            time.sleep(args.delay)

    # Write CSV
    with open(output_path, file_mode, newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["query", "product_title", "label", "user_query"])
        if write_header:
            writer.writeheader()
        for row in all_rows:
            writer.writerow({
                "query": row["query"],
                "product_title": row["product_title"],
                "label": row["label"],
                "user_query": row["user_query"],
            })

    print(f"\nDone! Wrote {len(all_rows)} rows to {output_path}")
    print(f"Label distribution: "
          f"E={sum(1 for r in all_rows if r['label']=='E')}, "
          f"S={sum(1 for r in all_rows if r['label']=='S')}, "
          f"C={sum(1 for r in all_rows if r['label']=='C')}, "
          f"I={sum(1 for r in all_rows if r['label']=='I')}")


if __name__ == "__main__":
    main()
