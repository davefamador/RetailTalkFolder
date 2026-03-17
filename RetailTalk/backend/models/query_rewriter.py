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


def _detect_price_direction(query: str) -> Optional[str]:
    """
    Detect whether the user's price intent is a minimum or maximum
    based on modifier words in the raw query.

    Returns "min", "max", or None if ambiguous.
    """
    q = query.lower()
    # Patterns that indicate a MINIMUM price ("more than X", "above X", etc.)
    min_patterns = [
        r"\bmore\s+than\b", r"\babove\b", r"\bover\b", r"\bat\s+least\b",
        r"\bhigher\s+than\b", r"\bstarting\b", r"\bfrom\b",
        r"\bexpensive\b", r"\bpricey\b",
        # Filipino
        r"\bhigit\s+sa\b", r"\bmula\s+sa\b",
    ]
    # Patterns that indicate a MAXIMUM price ("less than X", "under X", etc.)
    max_patterns = [
        r"\bless\s+than\b", r"\bunder\b", r"\bbelow\b", r"\bat\s+most\b",
        r"\bcheaper\s+than\b", r"\bbudget\b", r"\bcheap\b", r"\baffordable\b",
        # Filipino
        r"\bmura\b", r"\bmababa\b",
    ]
    for pat in min_patterns:
        if re.search(pat, q):
            return "min"
    for pat in max_patterns:
        if re.search(pat, q):
            return "max"
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

    # --- Correct price slot direction ---
    # The NER model may tag the price value as PRICE_MAX when the user
    # actually means "more than X" (a minimum), or vice versa.
    # Use modifier words in the raw query to fix this.
    direction = _detect_price_direction(query)

    has_min = "PRICE_MIN" in slots
    has_max = "PRICE_MAX" in slots

    if direction == "min" and has_max and not has_min:
        # NER said PRICE_MAX but user said "more than" → swap to PRICE_MIN
        slots["PRICE_MIN"] = slots.pop("PRICE_MAX")
    elif direction == "max" and has_min and not has_max:
        # NER said PRICE_MIN but user said "under" → swap to PRICE_MAX
        slots["PRICE_MAX"] = slots.pop("PRICE_MIN")

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
