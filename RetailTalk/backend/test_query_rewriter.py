"""
Test script for the Query Rewriter module.
Tests the rewrite() function with mock intent/slot data (no ML models needed).

Usage:
    python test_query_rewriter.py
"""

import sys
import os

# Add the backend directory to path so we can import from models/
sys.path.insert(0, os.path.dirname(__file__))

from models.query_rewriter import rewrite, split_sentences, _merge_rewritten_queries, RewrittenQuery


def test_case(name, query, intents, slots, expected_search, expected_filters):
    """Run a single test case."""
    result = rewrite(query, intents, slots)
    
    passed = True
    errors = []
    
    if expected_search and result.search_text != expected_search:
        passed = False
        errors.append(f"  search_text: got '{result.search_text}', expected '{expected_search}'")
    
    for key, value in expected_filters.items():
        if key not in result.filters:
            passed = False
            errors.append(f"  filter '{key}' missing from result")
        elif result.filters[key] != value:
            passed = False
            errors.append(f"  filter '{key}': got {result.filters[key]}, expected {value}")
    
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}")
    if not passed:
        for err in errors:
            print(err)
        print(f"  Full result: search_text='{result.search_text}', filters={result.filters}")
    
    return passed


def main():
    print("=" * 60)
    print("  QUERY REWRITER TESTS")
    print("=" * 60)
    
    total = 0
    passed = 0
    
    # Test 1: No intents, no slots → pass through
    total += 1
    if test_case(
        "No intents/slots -> pass through",
        query="sardines canned goods",
        intents=[],
        slots={},
        expected_search="sardines canned goods",
        expected_filters={},
    ):
        passed += 1
    
    # Test 2: Single search with product slots
    total += 1
    if test_case(
        "Single search with product",
        query="Nike running shoes",
        intents=["single_search"],
        slots={"BRAND": "Nike", "PRODUCT1": "running shoes"},
        expected_search="Nike running shoes",
        expected_filters={"brand": "Nike"},
    ):
        passed += 1
    
    # Test 3: Filtered search with price
    total += 1
    if test_case(
        "Filtered search with price max",
        query="dress under 3000",
        intents=["filtered_search"],
        slots={"PRODUCT1": "dress", "PRICE_MAX": "3000"},
        expected_search="dress",
        expected_filters={"price_max": 3000.0},
    ):
        passed += 1
    
    # Test 4: Full query with color + brand + price
    total += 1
    if test_case(
        "Full filtered query",
        query="blue Nike shoes under 3000",
        intents=["single_search", "filtered_search"],
        slots={"COLOR": "blue", "BRAND": "Nike", "PRODUCT1": "shoes", "PRICE_MAX": "3000"},
        expected_search="blue Nike shoes",
        expected_filters={"brand": "Nike", "color": "blue", "price_max": 3000.0},
    ):
        passed += 1
    
    # Test 5: Free-form query (no rewriting)
    total += 1
    if test_case(
        "Free-form query -> pass through",
        query="pano magluto ng adobo",
        intents=["free_form"],
        slots={},
        expected_search="pano magluto ng adobo",
        expected_filters={},
    ):
        passed += 1
    
    # Test 6: Price range filter
    total += 1
    if test_case(
        "Price range (min + max)",
        query="laptop between 20000 and 50000",
        intents=["filtered_search"],
        slots={"PRODUCT1": "laptop", "PRICE_MIN": "20000", "PRICE_MAX": "50000"},
        expected_search="laptop",
        expected_filters={"price_min": 20000.0, "price_max": 50000.0},
    ):
        passed += 1
    
    # Test 7: Multi-search with two products
    total += 1
    if test_case(
        "Multi-search with PRODUCT1 + PRODUCT2",
        query="toothbrush and toothpaste",
        intents=["multi_search"],
        slots={"PRODUCT1": "toothbrush", "PRODUCT2": "toothpaste"},
        expected_search="toothbrush toothpaste",
        expected_filters={},
    ):
        passed += 1
    
    # Test 8: Color + product only
    total += 1
    if test_case(
        "Color + product",
        query="red t-shirt",
        intents=["single_search"],
        slots={"COLOR": "red", "PRODUCT1": "t-shirt"},
        expected_search="red t-shirt",
        expected_filters={"color": "red"},
    ):
        passed += 1
    
    # Test 9: Size slot
    total += 1
    if test_case(
        "Size filter",
        query="large maxi dress",
        intents=["single_search", "filtered_search"],
        slots={"SIZE": "large", "PRODUCT1": "maxi dress"},
        expected_search="maxi dress",
        expected_filters={"size": "large"},
    ):
        passed += 1
    
    print(f"\n{'=' * 60}")
    print(f"  Results: {passed}/{total} passed")
    print(f"{'=' * 60}")
    
    return 0 if passed == total else 1


def test_split_sentences():
    """Test the split_sentences() function."""
    print(f"\n{'=' * 60}")
    print("  SENTENCE SPLITTING TESTS")
    print(f"{'=' * 60}")

    total = 0
    passed = 0

    cases = [
        ("Single sentence, no punctuation",
         "red Nike shoes under 3000",
         ["red Nike shoes under 3000"]),
        ("Two sentences with period",
         "I want shoes. Show me bags.",
         ["I want shoes", "Show me bags"]),
        ("Two sentences with question mark",
         "I want shoes? Do you have bags",
         ["I want shoes", "Do you have bags"]),
        ("Exclamation mark",
         "Find red shoes! Also bags",
         ["Find red shoes", "Also bags"]),
        ("Decimal number NOT split",
         "shoes rated 3.5 stars",
         ["shoes rated 3.5 stars"]),
        ("Trailing period only",
         "I want shoes.",
         ["I want shoes"]),
        ("Three sentences",
         "I want shoes. Show me bags. Also find hats.",
         ["I want shoes", "Show me bags", "Also find hats"]),
        ("Filipino text, no split",
         "gusto ko ng sapatos at bag",
         ["gusto ko ng sapatos at bag"]),
    ]

    for name, query, expected in cases:
        total += 1
        result = split_sentences(query)
        if result == expected:
            passed += 1
            print(f"[PASS] {name}")
        else:
            print(f"[FAIL] {name}")
            print(f"  got:      {result}")
            print(f"  expected: {expected}")

    print(f"\n  Results: {passed}/{total} passed")
    return passed, total


def test_merge_rewritten_queries():
    """Test the _merge_rewritten_queries() function."""
    print(f"\n{'=' * 60}")
    print("  MERGE REWRITTEN QUERIES TESTS")
    print(f"{'=' * 60}")

    total = 0
    passed = 0

    # Test 1: Two products from two sentences
    total += 1
    rq1 = RewrittenQuery(search_text="shoes", filters={}, original_query="shoes",
                         intents=["single_search"], slots={"PRODUCT1": "shoes"}, is_rewritten=True)
    rq2 = RewrittenQuery(search_text="bags", filters={"price_max": 500.0}, original_query="bags under 500",
                         intents=["filtered_search"], slots={"PRODUCT1": "bags", "PRICE_MAX": "500"}, is_rewritten=True)
    merged = _merge_rewritten_queries([rq1, rq2], "I want shoes. Show me bags under 500.")
    if (merged.slots.get("PRODUCT1") == "shoes"
            and merged.slots.get("PRODUCT2") == "bags"
            and merged.filters.get("price_max") == 500.0
            and "single_search" in merged.intents
            and "filtered_search" in merged.intents
            and "shoes" in merged.search_text
            and "bags" in merged.search_text):
        passed += 1
        print("[PASS] Two products + filter merge")
    else:
        print("[FAIL] Two products + filter merge")
        print(f"  slots: {merged.slots}, filters: {merged.filters}, intents: {merged.intents}")

    # Test 2: Conflicting price_max -> take minimum (most restrictive)
    total += 1
    rq1 = RewrittenQuery(search_text="shoes", filters={"price_max": 3000.0}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    rq2 = RewrittenQuery(search_text="bags", filters={"price_max": 500.0}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    merged = _merge_rewritten_queries([rq1, rq2], "query")
    if merged.filters.get("price_max") == 500.0:
        passed += 1
        print("[PASS] Conflicting price_max -> takes minimum")
    else:
        print(f"[FAIL] Conflicting price_max -> got {merged.filters.get('price_max')}, expected 500.0")

    # Test 3: Conflicting price_min -> take maximum (most restrictive)
    total += 1
    rq1 = RewrittenQuery(search_text="shoes", filters={"price_min": 100.0}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    rq2 = RewrittenQuery(search_text="bags", filters={"price_min": 500.0}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    merged = _merge_rewritten_queries([rq1, rq2], "query")
    if merged.filters.get("price_min") == 500.0:
        passed += 1
        print("[PASS] Conflicting price_min -> takes maximum")
    else:
        print(f"[FAIL] Conflicting price_min -> got {merged.filters.get('price_min')}, expected 500.0")

    # Test 4: Single sub-query returns unchanged
    total += 1
    rq1 = RewrittenQuery(search_text="shoes", filters={"brand": "Nike"}, original_query="Nike shoes",
                         intents=["single_search"], slots={"PRODUCT1": "shoes", "BRAND": "Nike"}, is_rewritten=True)
    merged = _merge_rewritten_queries([rq1], "Nike shoes")
    if merged is rq1:
        passed += 1
        print("[PASS] Single sub-query returned unchanged")
    else:
        print("[FAIL] Single sub-query should return same object")

    # Test 5: Deduplicated search text
    total += 1
    rq1 = RewrittenQuery(search_text="red shoes", filters={}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    rq2 = RewrittenQuery(search_text="red bags", filters={}, original_query="",
                         intents=[], slots={}, is_rewritten=True)
    merged = _merge_rewritten_queries([rq1, rq2], "query")
    if merged.search_text == "red shoes bags":
        passed += 1
        print("[PASS] Deduplicated search text")
    else:
        print(f"[FAIL] Deduplicated search text -> got '{merged.search_text}', expected 'red shoes bags'")

    print(f"\n  Results: {passed}/{total} passed")
    return passed, total


if __name__ == "__main__":
    exit_code = main()

    split_passed, split_total = test_split_sentences()
    merge_passed, merge_total = test_merge_rewritten_queries()

    all_passed = split_passed + merge_passed
    all_total = split_total + merge_total
    print(f"\n{'=' * 60}")
    print(f"  NEW TESTS TOTAL: {all_passed}/{all_total} passed")
    print(f"{'=' * 60}")

    if all_passed < all_total:
        exit_code = 1
    sys.exit(exit_code)
