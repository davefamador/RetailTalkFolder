"""
Application configuration — loads settings from environment variables.
Create a .env file in the backend/ directory with your actual values.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")  # anon/public key
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role key (for admin ops)

# Database (direct connection for pgvector queries)
DATABASE_URL = os.getenv("DATABASE_URL", "")

# JWT Auth
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ML Model

BERT_MODEL_NAME = os.getenv("BERT_MODEL_NAME", "bert-base-multilingual-uncased")
CLASSIFIER_MODEL_PATH = os.getenv("CLASSIFIER_MODEL_PATH", "trained_model/pytorch_model.bin")
RANKER_MODEL_PATH = os.getenv("RANKER_MODEL_PATH", "trained_model/ranker")

# Intent and Slot models are in the training folders (separate from backend)

INTENT_MODEL_PATH = os.getenv("INTENT_MODEL_PATH", "../../Intent Slot Training/models/intent_classifier")
SLOT_MODEL_PATH = os.getenv("SLOT_MODEL_PATH", "../../models/slot_extractor")
BERT_MAX_LENGTH = 256
BERT_EMBEDDING_DIM = 768
INTENT_MAX_LENGTH = int(os.getenv("INTENT_MAX_LENGTH", "128"))
SLOT_MAX_LENGTH = int(os.getenv("SLOT_MAX_LENGTH", "128"))  # was 64

# Score blending weights (must sum to 1.0)
RANKER_WEIGHT = float(os.getenv("RANKER_WEIGHT", "0.4"))
CLASSIFIER_WEIGHT = float(os.getenv("CLASSIFIER_WEIGHT", "0.25"))
SIMILARITY_WEIGHT = float(os.getenv("SIMILARITY_WEIGHT", "0.35"))

# Search

SEARCH_TOP_K_CANDIDATES = 50  # pgvector returns top 50 candidates
SEARCH_MAX_RESULTS = 20  # max results returned to user

# App
APP_NAME = "RetailTalk"
DEBUG = os.getenv("DEBUG", "false").lower() == "true"