"""
Search route — the CORE of the thesis.

Architecture (from README.md):
                      User Query: "I want an affordable dress"
                                |
                ================|================
                |               |               |
        [Intent Class.]   [Slot/Entity     [BERT Embedding]
                |          Extraction]          |
                v               |              v
          intent:purchase       v         768-dim vector
                        {                      |
                         category: "dress"     |
                         price: "affordable"   |
                        }                      |
                ================|===============|
                               |               |
                        [Query Rewriting]      |
                        "dress" + filters      |
                               |               |
                ===============|================
                |              |               |
        [Supabase Filter] [pgvector      [CrossEncoder
         price <= budget   Similarity]    Ranker]
                |              |               |
                ===============|================
                               |
                       [ESCI Classifier]
                        E / S / C / I
                               |
                       [Score Blending]
                       0.5*R + 0.3*C + 0.2*S
                               |
                       Final Ranked Results

Pipeline Stages:
1. BERT Embedding: Query → 768-dimensional vector
2. pgvector Similarity: Top-50 candidates via cosine similarity
3. CrossEncoder Re-Ranking: Pairwise relevance scoring
4. ESCI Classifier: E/S/C/I classification with softmax probabilities
5. Score Blending: 0.5×Ranker + 0.3×Classifier + 0.2×Similarity
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


# =============================================================================
#  Response Models
# =============================================================================

class SearchResultItem(BaseModel):
    id: str
    title: str
    description: str
    price: float
    image_url: str
    seller_id: str
    # Scoring components
    similarity: float = 0.0          # pgvector cosine similarity (0-1)
    ranker_score: float = 0.0        # CrossEncoder relevance score (0-1, normalized)
    relevance_score: float = 0.0     # Final blended score: 0.5*R + 0.3*C + 0.2*S
    # ESCI classification
    relevance_label: str = "Exact"   # E/S/C/I classification
    relevance_confidence: float = 1.0
    exact_prob: float = 0.0
    substitute_prob: float = 0.0
    complement_prob: float = 0.0
    irrelevant_prob: float = 0.0


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]
    message: str = ""
    # Query Rewriting metadata (from Intent + Slot extraction)
    rewritten_query: str = ""
    detected_intents: list[str] = []
    extracted_slots: dict = {}
    applied_filters: dict = {}


# =============================================================================
#  Helper Functions
# =============================================================================

def _first_image(images_field) -> str:
    """Extract the first image URL from a product's images field."""
    images = images_field or []
    if isinstance(images, str):
        return images
    if isinstance(images, list) and len(images) > 0:
        return images[0]
    return ""


def _compute_blended_score(
    ranker_score: float,
    classifier_priority: float,
    similarity: float,
    w_ranker: float = RANKER_WEIGHT,
    w_classifier: float = CLASSIFIER_WEIGHT,
    w_similarity: float = SIMILARITY_WEIGHT,
) -> float:
    """
    Score Blending formula from README:
    relevance_score = 0.4×R + 0.25×C + 0.35×S

    Where:
    - R = Ranker score (CrossEncoder, normalized 0-1)
    - C = Classifier priority (E=1.0, S=0.67, C=0.33, I=0.0)
    - S = Similarity (pgvector cosine similarity, 0-1)
    """
    return (
        w_ranker * ranker_score +
        w_classifier * classifier_priority +
        w_similarity * similarity
    )


def _label_to_priority_weight(label: str) -> float:
    """
    Convert ESCI label to priority weight for score blending.
    E=1.0, S=0.67, C=0.33, I=0.0
    """
    priority = LABEL_PRIORITY.get(label, 3)  # Default to Irrelevant (3)
    return (3 - priority) / 3


# =============================================================================
#  Main Search Route
# =============================================================================

@router.get("/", response_model=SearchResponse)
async def search_products(
    q: str = Query(..., min_length=1, max_length=500, description="Search query text"),
    max_results: int = Query(default=SEARCH_MAX_RESULTS, ge=1, le=100),
    include_complements: bool = Query(default=True, description="Include Complement results"),
    include_substitutes: bool = Query(default=True, description="Include Substitute results"),
):
    """
    Product Search following the README architecture:

    Stage 1: Intent Classification + Slot Extraction + BERT Embedding (parallel)
    Stage 2: Query Rewriting (combines intent + slots → clean search text + filters)
    Stage 3: Supabase Filter + pgvector Similarity + CrossEncoder Ranker (parallel)
    Stage 4: ESCI Classifier (E/S/C/I with softmax probabilities)
    Stage 5: Score Blending (0.5×R + 0.3×C + 0.2×S)
    Stage 6: Final Ranked Results
    """

    try:
        # =================================================================
        #  STAGE 1 & 2: Intent + Slot + Query Rewriting
        #  The query_rewriter internally runs:
        #    - Intent Classification (single_search, multi_search, filtered_search, free_form)
        #    - Slot Extraction (PRODUCT, BRAND, COLOR, PRICE_MAX, etc.)
        #    - Query Rewriting (produces clean search_text + structured filters)
        # =================================================================
        rewritten = query_rewriter.process(q)
        search_text = rewritten.search_text
        filters = rewritten.filters

        print(f"[Search] Original query: '{q}'")
        print(f"[Search] Intents: {rewritten.intents}")
        print(f"[Search] Slots: {rewritten.slots}")
        if rewritten.is_rewritten:
            print(f"[Search] Rewritten to: '{search_text}' | Filters: {filters}")

        # =================================================================
        #  Check if ML models are loaded
        # =================================================================
        if not bert_service._loaded:
            # Fallback: Simple text search without ML
            print(f"[Search] ML models not loaded. Performing text-only search.")
            return await _fallback_text_search(q, search_text, filters, max_results, rewritten)

        # =================================================================
        #  STAGE 1 (continued): BERT Embedding
        #  Encode the rewritten search text into a 768-dimensional vector
        # =================================================================
        query_embedding = bert_service.compute_embedding(search_text)

        # =================================================================
        #  STAGE 3: pgvector Similarity + Supabase Filters
        #  Find top-K candidate products using cosine similarity
        #  Apply structured filters from query rewriting
        # =================================================================
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

        # Apply minimum similarity threshold
        MIN_SIMILARITY_THRESHOLD = 0.40
        candidates = [c for c in raw_candidates if c["similarity"] >= MIN_SIMILARITY_THRESHOLD]

        print(f"[Search] pgvector candidates: {len(candidates)} (threshold: {MIN_SIMILARITY_THRESHOLD})")

        if not candidates:
            return SearchResponse(
                query=q,
                total_results=0,
                results=[],
                message="No products found matching your query.",
                rewritten_query=search_text,
                detected_intents=rewritten.intents,
                extracted_slots=rewritten.slots,
                applied_filters=filters,
            )

        # =================================================================
        #  STAGE 3 (continued): CrossEncoder Re-Ranking
        #  Score each (query, product_title) pair for pairwise relevance
        # =================================================================
        product_titles = [c["title"] for c in candidates]

        if ranker_service._loaded:
            raw_ranker_scores = ranker_service.rank(q, product_titles)
            ranker_scores = ranker_service.normalize_scores(raw_ranker_scores)
        else:
            # Fallback: use similarity as ranker score
            ranker_scores = [c["similarity"] for c in candidates]

        # =================================================================
        #  STAGE 4: ESCI Classifier
        #  Classify each (query, product) pair into E/S/C/I
        #  Filter out products with irrelevant_prob > 10% or exact_prob < 80%
        # =================================================================
        product_embeddings = np.array([c["embedding"] for c in candidates])

        if classifier_service._loaded:
            classifications = classifier_service.classify_batch(query_embedding, product_embeddings)
        else:
            # Fallback: assume all are "Exact" with high confidence
            classifications = [
                {"label": "Exact", "confidence": 1.0, "class_id": 0,
                 "exact_prob": 1.0, "substitute_prob": 0.0,
                 "complement_prob": 0.0, "irrelevant_prob": 0.0}
                for _ in candidates
            ]

        # =================================================================
        #  STAGE 5: Score Blending
        #  relevance_score = 0.4×R + 0.25×C + 0.35×S
        #  Where: R=ranker, C=classifier_priority, S=similarity
        # =================================================================

        # Determine effective weights (adjust if ranker not loaded)
        if ranker_service._loaded:
            w_ranker = RANKER_WEIGHT       # 0.5
            w_classifier = CLASSIFIER_WEIGHT  # 0.3
            w_similarity = SIMILARITY_WEIGHT  # 0.2
        else:
            # Redistribute ranker weight to classifier and similarity
            w_ranker = 0.0
            total = CLASSIFIER_WEIGHT + SIMILARITY_WEIGHT
            w_classifier = CLASSIFIER_WEIGHT / total if total > 0 else 0.6
            w_similarity = SIMILARITY_WEIGHT / total if total > 0 else 0.4

        # Build scored results, applying ESCI filters
        scored_results: list[SearchResultItem] = []

        for idx, (candidate, classification) in enumerate(zip(candidates, classifications)):
            label = classification["label"]
            exact_prob = classification.get("exact_prob", 0.0)
            irrelevant_prob = classification.get("irrelevant_prob", 0.0)

            # ESCI Filtering:
            # - Filter out products with irrelevant_prob > 10%
            # - Filter out products with exact_prob < 80%
            if irrelevant_prob > 0.10:
                continue
            if exact_prob < 0.80:
                continue

            # Skip Irrelevant label entirely
            if label == "Irrelevant":
                continue

            # Skip Substitutes/Complements if user requested
            if label == "Substitute" and not include_substitutes:
                continue
            if label == "Complement" and not include_complements:
                continue

            # Calculate priority weight for classifier component
            classifier_priority = _label_to_priority_weight(label)

            # Calculate blended relevance score
            ranker_score = float(ranker_scores[idx])
            similarity = float(candidate["similarity"])

            relevance_score = _compute_blended_score(
                ranker_score=ranker_score,
                classifier_priority=classifier_priority,
                similarity=similarity,
                w_ranker=w_ranker,
                w_classifier=w_classifier,
                w_similarity=w_similarity,
            )

            scored_results.append(SearchResultItem(
                id=str(candidate["id"]),
                title=candidate["title"],
                description=candidate.get("description") or "",
                price=float(candidate["price"]),
                image_url=_first_image(candidate.get("images")),
                seller_id=str(candidate["seller_id"]),
                # Scoring components
                similarity=round(similarity, 4),
                ranker_score=round(ranker_score, 4),
                relevance_score=round(relevance_score, 4),
                # ESCI classification
                relevance_label=label,
                relevance_confidence=round(classification["confidence"], 4),
                exact_prob=round(exact_prob, 4),
                substitute_prob=round(classification.get("substitute_prob", 0.0), 4),
                complement_prob=round(classification.get("complement_prob", 0.0), 4),
                irrelevant_prob=round(irrelevant_prob, 4),
            ))

        # =================================================================
        #  STAGE 6: Final Ranked Results
        #  Sort by relevance_score (highest first), limit to max_results
        # =================================================================
        scored_results.sort(key=lambda r: r.relevance_score, reverse=True)
        final_results = scored_results[:max_results]

        print(f"[Search] Final results: {len(final_results)} (after ESCI filtering)")

        return SearchResponse(
            query=q,
            total_results=len(final_results),
            results=final_results,
            message="" if final_results else "No products found matching your query.",
            rewritten_query=search_text,
            detected_intents=rewritten.intents,
            extracted_slots=rewritten.slots,
            applied_filters=filters,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Search] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# =============================================================================
#  Fallback: Text-only search when ML models are not loaded
# =============================================================================

async def _fallback_text_search(
    original_query: str,
    search_text: str,
    filters: dict,
    max_results: int,
    rewritten,
) -> SearchResponse:
    """Simple ILIKE text search fallback when ML models are not available."""
    sb = get_supabase()

    qb = sb.table("products").select("*").eq("is_active", True).eq("status", "approved")

    # Apply text search
    qb = qb.or_(f"title.ilike.%{search_text}%,description.ilike.%{search_text}%")

    # Apply price filters
    if "price_max" in filters:
        qb = qb.lte("price", filters["price_max"])
    if "price_min" in filters:
        qb = qb.gte("price", filters["price_min"])

    response = qb.limit(max_results).execute()

    results = []
    for p in response.data:
        results.append(SearchResultItem(
            id=str(p["id"]),
            title=p["title"],
            description=p.get("description") or "",
            price=float(p["price"]),
            image_url=_first_image(p.get("images")),
            seller_id=str(p["seller_id"]),
            similarity=1.0,
            ranker_score=0.0,
            relevance_score=1.0,
            relevance_label="Exact",
            relevance_confidence=1.0,
            exact_prob=1.0,
            substitute_prob=0.0,
            complement_prob=0.0,
            irrelevant_prob=0.0,
        ))

    return SearchResponse(
        query=original_query,
        total_results=len(results),
        results=results,
        message="" if results else "No products found.",
        rewritten_query=search_text,
        detected_intents=rewritten.intents,
        extracted_slots=rewritten.slots,
        applied_filters=filters,
    )


# =============================================================================
#  Voice Transcription Endpoint
# =============================================================================

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

        # Transcribe using Google Speech Recognition
        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_wav) as source:
            audio_data = recognizer.record(source)

        transcript = recognizer.recognize_google(audio_data)
        return {"transcript": transcript}

    except ImportError:
        return {"error": "Speech recognition libraries not installed. Run: pip install SpeechRecognition pydub"}
    except Exception as e:
        print(f"[Transcribe] Error: {e}")
        return {"error": f"Transcription failed: {str(e)}"}
    finally:
        if tmp_webm and os.path.exists(tmp_webm.name):
            os.unlink(tmp_webm.name)
        if tmp_wav and os.path.exists(tmp_wav):
            os.unlink(tmp_wav)