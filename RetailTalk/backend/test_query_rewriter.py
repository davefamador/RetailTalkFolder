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

from models.query_rewriter import rewrite


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


if __name__ == "__main__":
    sys.exit(main())
