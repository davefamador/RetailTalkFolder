# RetailTalk: An NLP-Powered E-Commerce Product Search Engine

> **For Educational Purposes Only.**

RetailTalk is a hybrid product search engine that combines traditional keyword matching with a multi-stage NLP pipeline to deliver highly relevant e-commerce search results. Each product is classified using the **ESCI framework** (Exact, Substitute, Complement, Irrelevant), giving users transparent relevance scoring alongside their search results.

---

## Architecture Overview

When a user submits a search query, RetailTalk processes it through two parallel lanes and merges the results:

```
                          ┌──────────────────┐
                          │   User Query     │
                          └────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
          ┌─────────────────┐           ┌──────────────────────┐
          │  LANE 1: Keyword │           │  LANE 2: ESCI Model  │
          │    (20% slots)   │           │    (80% slots)        │
          └────────┬────────┘           └──────────┬───────────┘
                   │                               │
      ┌────────────▼────────────┐     ┌────────────▼────────────┐
      │ ILIKE text search       │     │ 1. BERT Embedding       │
      │ on title & description  │     │    (query → 768-d vec)  │
      └────────────┬────────────┘     └────────────┬────────────┘
                   │                               │
      ┌────────────▼────────────┐     ┌────────────▼────────────┐
      │ ESCI Classifier         │     │ 2. pgvector Similarity  │
      │ (label + probabilities) │     │    (cosine, top-50)     │
      └────────────┬────────────┘     └────────────┬────────────┘
                   │                               │
                   │                  ┌────────────▼────────────┐
                   │                  │ 3. CrossEncoder Ranker  │
                   │                  │    (pairwise re-rank)   │
                   │                  └────────────┬────────────┘
                   │                               │
                   │                  ┌────────────▼────────────┐
                   │                  │ 4. ESCI Classifier      │
                   │                  │    (E / S / C / I)      │
                   │                  └────────────┬────────────┘
                   │                               │
                   │                  ┌────────────▼────────────┐
                   │                  │ 5. Score Blending       │
                   │                  │    50% Ranker           │
                   │                  │    30% Classifier       │
                   │                  │    20% Similarity       │
                   │                  └────────────┬────────────┘
                   │                               │
                   └───────────┬───────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Merge & Deduplicate  │
                    │  → Final Results     │
                    └──────────────────────┘
```

### Pipeline Stages (Model Lane)

| Stage | Component | Description |
|-------|-----------|-------------|
| **1** | **BERT Embedding** | The user's query is tokenized and encoded by `bert-base-multilingual-uncased` into a 768-dimensional vector. |
| **2** | **pgvector Similarity** | The query embedding is compared against pre-computed product embeddings stored in PostgreSQL (via `pgvector`). The top-50 most similar products are returned using cosine similarity. |
| **3** | **CrossEncoder Re-Ranking** | A fine-tuned CrossEncoder model (based on `ms-marco-MiniLM-L-12-v2`) scores each `(query, product_title)` pair for pairwise relevance. This re-ranks the candidate list beyond raw vector similarity. |
| **4** | **ESCI Classifier** | A feed-forward neural network classifies each `(query, product)` pair into one of four ESCI labels with softmax probabilities. Products with `irrelevant_prob > 13%` or `exact_prob < 70%` are filtered out. |
| **5** | **Score Blending** | A weighted combination of Ranker score (50%), Classifier priority (30%), and cosine Similarity (20%) produces the final relevance score for ranking. |

### ESCI Labels

| Label | Meaning |
|-------|---------|
| **Exact** | The product directly satisfies the search query. |
| **Substitute** | The product is an alternative that could fulfill the same need. |
| **Complement** | The product is related and could be purchased alongside the query target. |
| **Irrelevant** | The product is not related to the search query (filtered out). |

---

## Tech Stack

### Backend
- **Python 3.10+** — Core language
- **FastAPI** — REST API framework
- **PyTorch** — ML model inference (Classifier + Ranker)
- **Hugging Face Transformers** — BERT embeddings and CrossEncoder
- **Supabase (PostgreSQL + pgvector)** — Database with vector similarity search
- **psycopg** — Direct PostgreSQL driver for pgvector queries
- **JWT (PyJWT)** — Token-based authentication

### Frontend
- **Next.js 14** — React-based web framework
- **React 18** — UI components

### ML Models
- **BERT Multilingual** (`bert-base-multilingual-uncased`) — Text embedding (768-d)
- **CrossEncoder** (fine-tuned `MiniLM-L-12-v2`) — Pairwise relevance ranking
- **QueryProductClassifier** — Custom MLP for ESCI 4-class classification

### Database
- **Supabase** — Hosted PostgreSQL with Auth, Storage, and Realtime
- **pgvector** — PostgreSQL extension for vector similarity search (IVFFlat index)

---

## Project Structure

```
RetailTalkFolder/
├── RetailTalk/
│   ├── backend/                  # FastAPI backend
│   │   ├── main.py               # App entry point (uvicorn)
│   │   ├── config.py             # Environment configuration
│   │   ├── database.py           # Supabase & pgvector helpers
│   │   ├── models/
│   │   │   ├── bert_service.py   # BERT embedding service
│   │   │   ├── classifier.py     # ESCI classifier (E/S/C/I)
│   │   │   └── ranker.py         # CrossEncoder re-ranker
│   │   └── routes/
│   │       ├── search.py         # Core hybrid search route
│   │       ├── products.py       # Product CRUD
│   │       ├── auth.py           # Authentication
│   │       ├── admin.py          # Admin dashboard
│   │       ├── transactions.py   # Purchase transactions
│   │       └── insights.py       # AI insights
│   ├── frontend/                 # Next.js frontend
│   │   └── src/app/
│   │       ├── search/           # Search page
│   │       ├── products/         # Product listing & detail
│   │       ├── admin/            # Admin dashboard
│   │       ├── sell/             # Seller portal
│   │       ├── wallet/           # User wallet
│   │       └── transactions/     # Transaction history
│   └── database/
│       └── schema.sql            # PostgreSQL schema
├── ranking/                      # CrossEncoder training scripts
├── classification_identification/ # ESCI classifier training scripts
└── shopping_queries_dataset/     # Training data (not tracked)
```

---

## Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Supabase project** (with pgvector extension enabled)

### 1. Clone the Repository

```bash
git clone https://github.com/davefamador/RetailTalkFolder.git
cd RetailTalkFolder
```

### 2. Backend Setup

```bash
cd RetailTalk/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in `RetailTalk/backend/`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

BERT_MODEL_NAME=bert-base-multilingual-uncased
CLASSIFIER_MODEL_PATH=trained_model/pytorch_model.bin
RANKER_MODEL_PATH=trained_model/ranker
```

### 4. Initialize the Database

Run the SQL schema against your Supabase project:

```bash
# Execute schema.sql via the Supabase SQL Editor or psql
psql $DATABASE_URL -f ../database/schema.sql
```

### 5. Frontend Setup

```bash
cd ../frontend

npm install
```

### 6. Run the Application

**Backend** (from `RetailTalk/backend/`):
```bash
uvicorn main:app --reload --port 8000
```

**Frontend** (from `RetailTalk/frontend/`):
```bash
npm run dev
```

The app will be available at `http://localhost:3000` with the API at `http://localhost:8000`.

---

## License

This project is licensed under the Apache-2.0 License.
