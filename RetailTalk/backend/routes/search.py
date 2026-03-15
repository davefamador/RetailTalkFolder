"""
Search route — the CORE of the thesis.
Hybrid search engine combining:
  • Keyword matching (20% of display slots — 10 products, NO irrelevant filter)
  • ESCI model pipeline (80% of display slots — 40 products, WITH irrelevant filter)

Now enhanced with Query Rewriting:
  • Intent Classification → detects query intent (single_search, filtered_search, etc.)
  • Slot Extraction → extracts entities (PRODUCT, BRAND, COLOR, PRICE_MAX, etc.)
  • Query Rewriter → produces clean search_text + structured filters

Both lanes run ESCI classification so every card shows E/S/C/I probabilities.
"""

from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import traceback
import tempfile
import os
import numpy as np

from models.bert_service import bert_service
from models.classifier import classifier_service, LABEL_PRIORITY
from models.ranker import ranker_service
from models.query_rewriter import query_rewriter
from database import search_similar_products, search_similar_products_filtered, get_supabase
from config import (
    SEARCH_TOP_K_CANDIDATES,
    SEARCH_MAX_RESULTS,
    RANKER_WEIGHT,
    CLASSIFIER_WEIGHT,
    SIMILARITY_WEIGHT,
)

router = APIRouter(prefix="/search", tags=["Search"])


# --- Response Models ---

class SearchResultItem(BaseModel):
    id: str
    title: str
    description: str
    price: float
    image_url: str
    seller_id: str
    similarity: float = 0.0          # pgvector cosine similarity (0-1)
    ranker_score: float = 0.0        # CrossEncoder relevance score (0-1, normalized)
    relevance_label: str = "Exact"   # E/S/C/I classification
    relevance_confidence: float = 1.0  # classifier confidence
    relevance_score: float = 1.0     # final combined score for ranking
    exact_prob: float = 0.0          # ESCI softmax probability for Exact
    substitute_prob: float = 0.0     # ESCI softmax probability for Substitute
    complement_prob: float = 0.0     # ESCI softmax probability for Complement
    irrelevant_prob: float = 0.0     # ESCI softmax probability for Irrelevant
    search_source: str = "model"     # "keyword" or "model" — which lane produced this result


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]
    message: str = ""
    # Query Rewriting metadata
    rewritten_query: str = ""        # what BERT/keyword actually searched for
    detected_intents: list[str] = [] # e.g., ["single_search", "filtered_search"]
    extracted_slots: dict = {}       # e.g., {"BRAND": "Nike", "PRICE_MAX": "3000"}
    applied_filters: dict = {}       # e.g., {"brand": "Nike", "price_max": 3000}


# --- Helper: extract first image URL ---

def _first_image(images_field) -> str:
    """Extract the first image URL from a product's images field."""
    images = images_field or []
    if isinstance(images, str):
        return images
    if isinstance(images, list) and len(images) > 0:
        return images[0]
    return ""


# --- Helper: build keyword filter query ---

def _apply_keyword_filters(query_builder, filters: dict, search_text: str):
    """
    Apply filters and search text to a Supabase query builder.
    Returns the modified query builder.
    """
    # Text search on title/description using rewritten search text
    query_builder = query_builder.or_(
        f"title.ilike.%{search_text}%,description.ilike.%{search_text}%"
    )

    # Price filters
    if "price_max" in filters:
        query_builder = query_builder.lte("price", filters["price_max"])
    if "price_min" in filters:
        query_builder = query_builder.gte("price", filters["price_min"])

    # Brand filter (already in search_text for keyword matching,
    # but applying as extra filter catches description-only matches)

    return query_builder


# --- Route ---

@router.get("/", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1, max_length=500, description="Search query text"),
    max_results: int = Query(default=SEARCH_MAX_RESULTS, ge=1, le=100, description="Maximum results to return"),
    include_complements: bool = Query(default=True, description="Include Complement results"),
    include_substitutes: bool = Query(default=True, description="Include Substitute results"),
):
    """
    🔍 Hybrid Product Search — two lanes, now with Query Rewriting:

    1. Query Rewriting: Intent classification + slot extraction →
       rewritten search text + structured filters
    2. Lane 1 (Keyword — 20%): ILIKE text match with filters → ESCI classification
    3. Lane 2 (Model  — 80%): BERT embedding + pgvector (filtered) + CrossEncoder + ESCI
    """

    # --- Hybrid display allocation ---
    DISPLAY_LIMIT = 15
    KEYWORD_SLOTS = 5  # 1 slot
    MODEL_SLOTS   = DISPLAY_LIMIT - KEYWORD_SLOTS  # 8 slots

    try:
        # ================================================================
        #  STEP 0 — QUERY REWRITING
        #  Run intent classification + slot extraction + rewrite
        # ================================================================
        rewritten = query_rewriter.process(q)
        search_text = rewritten.search_text
        filters = rewritten.filters

        print(f"[Search] Query: '{q}'")
        if rewritten.is_rewritten:
            print(f"[Search] Rewritten: '{search_text}' | Filters: {filters}")

        # Check if ML models are loaded
        if not bert_service._loaded:
            # --- Fallback: Simple Text Search (no ML) ---
            print(f"[Search] ML models not loaded. Performing text search for: {search_text}")
            sb = get_supabase()

            qb = sb.table("products").select("*").eq("is_active", True).eq("status", "approved")
            qb = _apply_keyword_filters(qb, filters, search_text)
            response = qb.limit(max_results).execute()

            results = []
            for p in response.data:
                results.append(SearchResultItem(
                    id=p["id"],
                    title=p["title"],
                    description=p["description"] or "",
                    price=p["price"],
                    image_url=_first_image(p.get("images")),
                    seller_id=p["seller_id"],
                    similarity=1.0,
                    ranker_score=0.0,
                    relevance_label="Exact",
                    relevance_confidence=1.0,
                    relevance_score=1.0,
                    search_source="keyword",
                ))

            return SearchResponse(
                query=q,
                total_results=len(results),
                results=results,
                rewritten_query=search_text,
                detected_intents=rewritten.intents,
                extracted_slots=rewritten.slots,
                applied_filters=filters,
            )


        # ================================================================
        #  ML LOADED — HYBRID SEARCH
        # ================================================================

        # Step 1: Compute BERT embedding for the REWRITTEN search text
        query_embedding = bert_service.compute_embedding(search_text)

        # ---------------------------------------------------------------
        #  LANE 1 — KEYWORD MATCHING (20%, 10 slots)
        #  ILIKE search on title/description with rewritten text + filters.
        #  Still runs ESCI classifier for display probabilities.
        # ---------------------------------------------------------------

        sb = get_supabase()
        kw_qb = sb.table("products").select("*").eq("is_active", True).eq("status", "approved")
        kw_qb = _apply_keyword_filters(kw_qb, filters, search_text)
        kw_response = kw_qb.limit(KEYWORD_SLOTS).execute()

        keyword_results: list[SearchResultItem] = []
        keyword_ids: set[str] = set()   # track IDs for deduplication

        for p in kw_response.data:
            pid = str(p["id"])
            keyword_ids.add(pid)

            # Default ESCI values (used if product has no embedding)
            esci = {"label": "Exact", "confidence": 1.0,
                    "exact_prob": 0.0, "substitute_prob": 0.0,
                    "complement_prob": 0.0, "irrelevant_prob": 0.0}

            # If the product has an embedding, run the classifier
            if p.get("embedding"):
                try:
                    from database import pgvector_to_embedding
                    prod_emb = pgvector_to_embedding(p["embedding"])
                    cls_batch = classifier_service.classify_batch(
                        query_embedding, np.array([prod_emb])
                    )
                    if cls_batch:
                        esci = cls_batch[0]
                except Exception:
                    pass  # keep defaults if classification fails

            # Filter: if E score < 70%, do not display (same rule as model lane)
            if esci["exact_prob"] < 0.700:
                continue

            keyword_results.append(SearchResultItem(
                id=pid,
                title=p["title"],
                description=p["description"] or "",
                price=p["price"],
                image_url=_first_image(p.get("images")),
                seller_id=p["seller_id"],
                similarity=1.0,
                ranker_score=0.0,
                relevance_label=esci["label"],
                relevance_confidence=esci["confidence"],
                relevance_score=1.0,
                exact_prob=esci["exact_prob"],
                substitute_prob=esci["substitute_prob"],
                complement_prob=esci["complement_prob"],
                irrelevant_prob=esci["irrelevant_prob"],
                search_source="keyword",
            ))

        print(f"[Search] Keyword lane: {len(keyword_results)} results")

        # ---------------------------------------------------------------
        #  LANE 2 — ESCI MODEL (80%, 40 slots)
        #  BERT embedding + pgvector (with filters) + CrossEncoder + Classifier
        #  Filters out irrelevant_prob > 13%
        # ---------------------------------------------------------------

        # Step 2: Find candidate products via pgvector similarity
        # Use filtered search if we have structured filters from query rewriting
        if filters:
            raw_candidates = search_similar_products_filtered(
                query_embedding,
                top_k=SEARCH_TOP_K_CANDIDATES,
                price_min=filters.get("price_min"),
                price_max=filters.get("price_max"),
                brand=filters.get("brand"),
                color=filters.get("color"),
            )
        else:
            raw_candidates = search_similar_products(
                query_embedding,
                top_k=SEARCH_TOP_K_CANDIDATES,
            )

        # Safety Net: cosine similarity threshold
        MIN_SIMILARITY_THRESHOLD = 0.40
        candidates = [c for c in raw_candidates if c["similarity"] >= MIN_SIMILARITY_THRESHOLD]

        # Step 3: Re-rank candidates with CrossEncoder
        if candidates:
            product_titles = [c["title"] for c in candidates]
            raw_ranker_scores = ranker_service.rank(q, product_titles)
            normalized_ranker_scores = ranker_service.normalize_scores(raw_ranker_scores)
        else:
            normalized_ranker_scores = []

        # Step 4: Classify each candidate (E/S/C/I)
        if candidates:
            product_embeddings = np.array([c["embedding"] for c in candidates])
            classifications = classifier_service.classify_batch(query_embedding, product_embeddings)
        else:
            classifications = []

        # Determine effective weights (adjust if ranker not loaded)
        if ranker_service._loaded:
            w_ranker = RANKER_WEIGHT
            w_classifier = CLASSIFIER_WEIGHT
            w_similarity = SIMILARITY_WEIGHT
        else:
            w_ranker = 0.0
            total_remaining = CLASSIFIER_WEIGHT + SIMILARITY_WEIGHT
            w_classifier = CLASSIFIER_WEIGHT / total_remaining if total_remaining > 0 else 0.5
            w_similarity = SIMILARITY_WEIGHT / total_remaining if total_remaining > 0 else 0.5

        # Build scored model results grouped by ESCI label
        exact_results = []
        substitute_results = []
        complement_results = []

        for idx, (candidate, classification) in enumerate(zip(candidates, classifications)):
            # Skip products already in the keyword lane (dedup)
            if str(candidate["id"]) in keyword_ids:
                continue

            label = classification["label"]

            # Model lane: filter out Irrelevant label, irrelevant_prob > 13%, OR E score < 70%
            if (label == "Irrelevant"
                    or classification["irrelevant_prob"] > 0.13
                    or classification["exact_prob"] < 0.70):
                continue

            # Priority weight: E=1.0, S=0.67, C=0.33
            priority_weight = (3 - LABEL_PRIORITY[label]) / 3

            ranker_score = float(normalized_ranker_scores[idx])
            relevance_score = (
                (w_ranker * ranker_score)
                + (w_classifier * priority_weight)
                + (w_similarity * candidate["similarity"])
            )

            item = SearchResultItem(
                id=candidate["id"],
                title=candidate["title"],
                description=candidate["description"] or "",
                price=candidate["price"],
                image_url=_first_image(candidate.get("images")),
                seller_id=candidate["seller_id"],
                similarity=round(candidate["similarity"], 4),
                ranker_score=round(ranker_score, 4),
                relevance_label=label,
                relevance_confidence=classification["confidence"],
                relevance_score=round(relevance_score, 4),
                exact_prob=classification["exact_prob"],
                substitute_prob=classification["substitute_prob"],
                complement_prob=classification["complement_prob"],
                irrelevant_prob=classification["irrelevant_prob"],
                search_source="model",
            )

            if label == "Exact":
                exact_results.append(item)
            elif label == "Substitute":
                substitute_results.append(item)
            elif label == "Complement":
                complement_results.append(item)

        # Sort each category by blended relevance_score (highest first)
        exact_results.sort(key=lambda r: r.relevance_score, reverse=True)
        substitute_results.sort(key=lambda r: r.relevance_score, reverse=True)
        complement_results.sort(key=lambda r: r.relevance_score, reverse=True)

        # Model lane allocation: 40 slots → 60% E / 30% S / 10% C
        EXACT_RATIO = 0.60
        SUBSTITUTE_RATIO = 0.30
        COMPLEMENT_RATIO = 0.10

        exact_slots = int(MODEL_SLOTS * EXACT_RATIO)            # 24
        substitute_slots = int(MODEL_SLOTS * SUBSTITUTE_RATIO)   # 12
        complement_slots = int(MODEL_SLOTS * COMPLEMENT_RATIO)   # 4

        # Take what we can from Exact
        taken_exact = exact_results[:exact_slots]
        leftover = exact_slots - len(taken_exact)

        # Cascade leftover Exact slots → Substitute
        substitute_slots += leftover
        taken_substitute = substitute_results[:substitute_slots] if include_substitutes else []
        leftover = substitute_slots - len(taken_substitute)

        # Cascade leftover Substitute slots → Complement
        complement_slots += leftover
        taken_complement = complement_results[:complement_slots] if include_complements else []

        model_results = taken_exact + taken_substitute + taken_complement
        print(f"[Search] Model lane: {len(model_results)} results")

        # ---------------------------------------------------------------
        #  MERGE: Keyword results first, then model results (deduplicated)
        # ---------------------------------------------------------------
        seen_ids: set[str] = set()
        results: list[SearchResultItem] = []
        for item in keyword_results + model_results:
            if item.id not in seen_ids:
                seen_ids.add(item.id)
                results.append(item)

        return SearchResponse(
            query=q,
            total_results=len(results),
            results=results,
            message="No Products related to your Query" if len(results) == 0 else "",
            rewritten_query=search_text,
            detected_intents=rewritten.intents,
            extracted_slots=rewritten.slots,
            applied_filters=filters,
        )

    except HTTPException:
        raise  # Re-raise FastAPI HTTP exceptions as-is
    except Exception as e:
        print(f"[Search] ERROR during search for '{q}': {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# --- Voice Transcription Endpoint (for browsers without Web Speech API) ---

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accept an audio file (webm from MediaRecorder) and return transcribed text.
    Uses SpeechRecognition + pydub for cross-browser voice search support.
    """
    tmp_webm = None
    tmp_wav = None
    try:
        import speech_recognition as sr
        from pydub import AudioSegment

        # Save uploaded audio to temp file
        tmp_webm = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        content = await audio.read()
        tmp_webm.write(content)
        tmp_webm.close()

        # Convert webm → wav
        tmp_wav_path = tmp_webm.name.replace(".webm", ".wav")
        audio_segment = AudioSegment.from_file(tmp_webm.name, format="webm")
        audio_segment.export(tmp_wav_path, format="wav")
        tmp_wav = tmp_wav_path

        # Transcribe using Google Speech Recognition (free, no API key needed)
        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_wav) as source:
            audio_data = recognizer.record(source)

        transcript = recognizer.recognize_google(audio_data)
        return {"transcript": transcript}

    except ImportError:
        return {"error": "Speech recognition libraries not installed. Run: pip install SpeechRecognition pydub"}
    except sr.UnknownValueError:
        return {"error": "Could not understand audio. Please speak clearly and try again."}
    except sr.RequestError as e:
        return {"error": f"Speech recognition service error: {str(e)}"}
    except Exception as e:
        print(f"[Transcribe] Error: {e}")
        traceback.print_exc()
        return {"error": f"Transcription failed: {str(e)}"}
    finally:
        # Cleanup temp files
        if tmp_webm and os.path.exists(tmp_webm.name):
            os.unlink(tmp_webm.name)
        if tmp_wav and os.path.exists(tmp_wav):
            os.unlink(tmp_wav)
