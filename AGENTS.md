# RetailTalk - Project Prototype Context

## Overview
RetailTalk is my thesis project — an NLP-powered e-commerce product search engine. It combines traditional keyword matching with a multi-stage NLP pipeline for intelligent search result ranking, using the ESCI (Exact/Substitute/Complement/Irrelevant) classification framework for transparent relevance scoring.

## Tech Stack
- **Backend:** FastAPI (Python 3.11), served with Uvicorn
- **Frontend:** Next.js 14, React 18, CSS modules
- **Database:** Supabase (managed PostgreSQL) with pgvector extension for vector similarity search
- **Auth:** JWT tokens (PyJWT, HS256) + bcrypt password hashing
- **Storage:** Supabase Storage for product images
- **ML/AI:** PyTorch, Hugging Face Transformers, Sentence-Transformers, scikit-learn

## ML Models (all loaded on backend startup)

**BERT Embedding Service** — `bert-base-multilingual-uncased`, produces 768-dim vectors via max-pooling. Used to embed both queries and products for pgvector similarity search.

**Intent Classifier** — Custom BERT + 2-layer dense classifier. Multi-label, 4 intents: `single_search`, `multi_search`, `filtered_search`, `free_form`. Trained on custom shopping query dataset.

**Slot Extractor (NER)** — BERT token-level classifier using BIO tagging. Extracts entities: `PRODUCT1`, `PRODUCT2`, `PRICE_MIN`, `PRICE_MAX`, `PRICE_MOD`, `RATING_MIN`, `RATING_MOD`, `COLOR`, `BRAND`, `SIZE`, `MATERIAL`, `CONN` (connectors like "and").

**Query Rewriter** — Takes raw query + intents + slots, outputs a cleaned `search_text` (product terms only) and structured `filters` dict (`price_min`, `price_max`, `brand`, `color`, etc.).

**CrossEncoder Ranker** — Fine-tuned `ms-marco-MiniLM-L-12-v2`. Scores `(query, product_title)` pairs for pairwise relevance, normalized to [0,1].

**ESCI Classifier** — Feed-forward neural network. Input: concatenated query embedding (768) + product embedding (768) = 1536 features. 2 dense layers (256 hidden), BatchNorm, ReLU, Dropout. Outputs 4 softmax probabilities for E/S/C/I labels.

## Search Pipeline (core flow)
When a user submits a query (e.g., "affordable blue Nike shoes under 2000"):

1. **Intent Classification** → detects `[filtered_search, single_search]`
2. **Slot Extraction** → `{PRODUCT1: "shoes", COLOR: "blue", BRAND: "Nike", PRICE_MAX: "2000", PRICE_MOD: "under"}`
3. **Query Rewriting** → `search_text: "blue Nike shoes"`, `filters: {price_max: 2000}`
4. **BERT Embedding** → 768-dim vector of rewritten query
5. **pgvector Similarity Search** → top-50 candidates (optionally filtered by price/brand/color)
6. **CrossEncoder Re-Ranking** → pairwise relevance scores
7. **ESCI Classification (batch)** → E/S/C/I labels + probabilities per product
8. **Score Blending** → `final_score = 0.4 × ranker_score + 0.25 × classifier_priority + 0.35 × similarity`
9. **Response** → sorted results with scores, labels, probabilities, detected intents, extracted slots, applied filters

## Database Schema (Supabase PostgreSQL + pgvector)
12 tables:

- **users** — id, email, password_hash, full_name, role (buyer/seller/admin/delivery/manager), is_banned, department_id, manager_id
- **user_balances** — user_id, balance (wallet)
- **user_contacts** — user_id, contact_number
- **products** — id, seller_id, title, description, stock, price, images (array), embedding (vector(768)) with IVFFlat index, is_active, status (pending/approved/unapproved), tracking_number
- **cart_items** — buyer_id, product_id, quantity (unique constraint on buyer+product)
- **wishlist_items** — id (UUID), buyer_id (references users), product_id (references products), created_at (timestamptz), unique constraint on (buyer_id, product_id), indexed on buyer_id and product_id
- **product_transactions** — buyer_id, seller_id, product_id, quantity, amount, seller_amount, admin_commission, delivery_fee, delivery_user_id, purchase_type (walkin/delivery), status
- **delivery_earnings** — delivery_user_id, transaction_id, amount
- **stored_value** — user_id, transaction_type (deposit/withdrawal), amount
- **departments** — id, name, description, manager_id
- **department_sellers** — department_id, seller_id
- **restock_requests** — restock workflow tracking

Transaction statuses: `pending`, `approved`, `ondeliver`, `delivered`, `undelivered`, `cancelled`, `pending_walkin`, `inwork`, `ready`, `picked_up`, `completed`

## Backend Routes (FastAPI)

- `POST /search/` — Main search pipeline (the core feature)
- `POST /search/transcribe` — Voice-to-text transcription (WebM audio via Google Speech Recognition)
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me` — Authentication
- `GET/POST/PUT/DELETE /products/` — Product CRUD + image upload + auto BERT embedding on creation
- `POST /transactions/`, `GET /transactions/`, `PUT /transactions/{id}` — Purchase/order management with commissions and delivery fees
- `GET/POST/DELETE/PUT /cart/items` — Shopping cart
- `GET /wishlist/` — Get buyer's wishlist with product details
- `POST /wishlist/add` — Add product to wishlist (request body: `product_id`)
- `DELETE /wishlist/remove/{product_id}` — Remove product from wishlist
- `GET /wishlist/check/{product_id}` — Check if product is in buyer's wishlist (returns `{in_wishlist: bool}`)
- `GET /wishlist/seller-report` — Seller wishlist analytics (total wishlists, per-product breakdown)
- `GET /admin/stats`, `GET /admin/products`, `POST /admin/products/{id}/approve`, etc. — Admin dashboard, user banning, commission management
- `GET /manager/dashboard`, `GET /manager/sellers`, `POST /manager/departments/{id}/approve-products` — Manager dashboard
- `GET /delivery/my-deliveries`, `PUT /delivery/{id}/status`, `GET /delivery/earnings` — Delivery user management
- `GET/POST/PUT /restock/` — Inventory/restock management
- `GET /insights/products/{id}`, `GET /insights/recommendations/{user_id}` — AI-generated descriptions and recommendations
- `GET/POST /contacts/` — User contact info

## Frontend Structure (Next.js 14 App Router)
Pages:

- `/` — Home page
- `/search` — Search page with voice search (Web Speech API + MediaRecorder fallback), ESCI label display
- `/products` — Product listing, `/products/[id]` — Product detail with wishlist toggle button
- `/login`, `/register` — Auth pages
- `/profile` — User profile/dashboard
- `/cart` — Shopping cart
- `/wishlist` — Buyer's wishlist page (displays saved products with remove buttons and empty state)
- `/orders` — Order history
- `/admin/dashboard` — Admin dashboard (stats, product approval, user management)
- `/manager/dashboard` — Department manager dashboard
- `/delivery` — Delivery user dashboard
- `/admin/delivery-register` — Delivery user registration
- `/sell/reports` — Seller reports with wishlist analytics tab (total wishlists, per-product breakdown)

Key features: voice-to-text search, role-based dashboards, real-time purchase modals, ESCI label display on search results, product wishlist with seller analytics.

## Frontend API Client Functions (src/lib/api.js)
Wishlist-related:
- `getWishlist()` — Fetch buyer's wishlist
- `addToWishlist(productId)` — Add product to wishlist
- `removeFromWishlist(productId)` — Remove product from wishlist
- `checkWishlist(productId)` — Check if product is wishlisted
- `getSellerWishlistReport()` — Fetch seller's wishlist analytics

## Training Scripts (separate directories at project root)
- `Intent Slot Training/train_intent_classifier.py` — Trains intent classifier on custom shopping query dataset
- `Intent Slot Training/train_slot_extractor.py` — Trains slot extractor (NER) with BIO tagging
- `classification_identification/train.py` — Trains ESCI classifier on query-product pairs
- `classification_identification/compute_bert_representations.py` — Pre-computes BERT embeddings for training data
- `ranking/train.py` — Fine-tunes CrossEncoder ranking model

## Auth Flow
1. Register with email/password/role → bcrypt hash stored
2. Login → returns JWT token (24h expiry, HS256, payload: sub, email, role, exp, iat)
3. Authenticated requests use `Authorization: Bearer <token>` header
4. Role-based access control in route handlers

## Deployment
- **Dockerfile:** Python 3.11-slim, CPU-only PyTorch, uvicorn on port 8000
- All ML models loaded into memory on startup
- **Database:** Supabase cloud (PostgreSQL + pgvector)
