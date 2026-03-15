"""
Query Rewriter — transforms raw user queries into structured search inputs
using intent classification and slot extraction.

Takes:  raw query + intents + extracted slots
Returns: rewritten search text + structured filters + metadata
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RewrittenQuery:
    """Output of the query rewriter."""
    search_text: str           # Cleaned query for BERT embedding + keyword matching
    filters: dict              # Structured filters for Supabase WHERE clauses
    original_query: str        # The raw user input
    intents: list = field(default_factory=list)   # Detected intents
    slots: dict = field(default_factory=dict)     # All extracted slots
    is_rewritten: bool = False  # Whether any rewriting was applied


# Slot types that represent product names (included in search text)
PRODUCT_SLOTS = {"PRODUCT1", "PRODUCT2"}

# Slot types that become Supabase filters (excluded from search text)
FILTER_SLOTS = {"PRICE_MIN", "PRICE_MAX", "PRICE_MOD", "BRAND", "COLOR",
                "SIZE", "RATING_MIN", "RATING_MOD"}

# Modifier words to strip from search text (common non-product words)
MODIFIER_WORDS = {
    "under", "below", "less", "than", "above", "over", "more",
    "at", "least", "most", "around", "between", "and",
    "cheaper", "cheapest", "expensive",
    "budget", "affordable", "cheap", "pricey",
    "minimum", "maximum", "max", "min",
    "rating", "rated", "stars", "star",
    "i", "want", "need", "looking", "for", "find", "show", "me",
    "the", "a", "an", "of", "with", "in", "na", "ng", "ang", "yung",
    "paano", "saan", "ano", "may", "gusto", "ko", "hanap",
    "magkano", "pesos", "peso", "php",
}


def _parse_price(value: str) -> Optional[float]:
    """Try to parse a numeric value from a price slot."""
    clean = re.sub(r"[^\d.]", "", value)
    try:
        return float(clean)
    except ValueError:
        return None


def rewrite(query: str, intents: list[str], slots: dict) -> RewrittenQuery:
    """
    Rewrite a user query based on detected intents and extracted slots.

    Logic:
    - For free_form queries (and no other intents): pass through as-is
    - For filtered_search: extract filter slots into structured filters,
      build search text from product slots only
    - For single_search / multi_search: build search text from product slots,
      include brand/color in search text too
    """

    # Default: use original query as-is
    result = RewrittenQuery(
        search_text=query.strip(),
        filters={},
        original_query=query.strip(),
        intents=intents,
        slots=slots,
    )

    # If no intents or slots were extracted, return original query
    if not intents and not slots:
        return result

    # Free-form intent with no product slots: pass through as-is
    # (e.g., "pano magluto ng adobo" — not a product search)
    if "free_form" in intents and len(intents) == 1 and not slots:
        return result

    # --- Build structured filters from slots ---
    filters = {}

    price_max = slots.get("PRICE_MAX")
    if price_max:
        parsed = _parse_price(price_max)
        if parsed is not None:
            filters["price_max"] = parsed

    price_min = slots.get("PRICE_MIN")
    if price_min:
        parsed = _parse_price(price_min)
        if parsed is not None:
            filters["price_min"] = parsed

    brand = slots.get("BRAND")
    if brand:
        filters["brand"] = brand.strip()

    color = slots.get("COLOR")
    if color:
        filters["color"] = color.strip()

    size = slots.get("SIZE")
    if size:
        filters["size"] = size.strip()

    rating_min = slots.get("RATING_MIN")
    if rating_min:
        parsed = _parse_price(rating_min)
        if parsed is not None:
            filters["rating_min"] = parsed

    # --- Build search text ---
    search_parts = []

    # Include product names
    for slot_type in ["PRODUCT1", "PRODUCT2"]:
        if slot_type in slots:
            search_parts.append(slots[slot_type].strip())

    # Include brand in search text (helps BERT + keyword matching)
    if brand:
        search_parts.insert(0, brand.strip())

    # Include color in search text (helps keyword matching)
    if color:
        search_parts.insert(0, color.strip())

    # If we have product-related slots, use them as the search text
    if search_parts:
        search_text = " ".join(search_parts)
    else:
        # No product slots found — clean the original query
        # Remove modifier words and price values
        words = query.strip().split()
        cleaned = [
            w for w in words
            if w.lower() not in MODIFIER_WORDS
            and not re.match(r"^\d+$", w)
        ]
        search_text = " ".join(cleaned) if cleaned else query.strip()

    result.search_text = search_text
    result.filters = filters
    result.is_rewritten = bool(filters) or (search_text != query.strip())

    return result


class QueryRewriterService:
    """
    Orchestrates intent classification + slot extraction + query rewriting.
    This is the main entry point called from the search route.
    """

    def __init__(self):
        self._intent_service = None
        self._slot_service = None

    def init(self, intent_service, slot_service):
        """Initialize with references to the intent and slot services."""
        self._intent_service = intent_service
        self._slot_service = slot_service

    def process(self, query: str) -> RewrittenQuery:
        """
        Full query rewriting pipeline:
        1. Intent classification
        2. Slot extraction
        3. Query rewriting

        Returns RewrittenQuery with search_text, filters, intents, and slots.
        """
        # Step 1: Classify intents
        intent_result = {"intents": [], "probabilities": {}}
        if self._intent_service and self._intent_service._loaded:
            intent_result = self._intent_service.predict(query)

        # Step 2: Extract slots
        slot_result = {"slots": {}, "tagged_tokens": []}
        if self._slot_service and self._slot_service._loaded:
            slot_result = self._slot_service.extract(query)

        # Step 3: Rewrite
        rewritten = rewrite(
            query=query,
            intents=intent_result["intents"],
            slots=slot_result["slots"],
        )

        # Log for debugging
        if rewritten.is_rewritten:
            print(f"[QueryRewriter] '{query}' -> '{rewritten.search_text}'")
            print(f"[QueryRewriter]   Intents: {rewritten.intents}")
            print(f"[QueryRewriter]   Slots:   {rewritten.slots}")
            print(f"[QueryRewriter]   Filters: {rewritten.filters}")

        return rewritten


# Global singleton
query_rewriter = QueryRewriterService()
