# RetailTalk — AI-Powered Marketplace

BERT-powered product search SaaS application for a thesis project.

## Project Structure

```
RetailTalk/
├── backend/                    # FastAPI (Python) backend
│   ├── main.py                 # API entry point
│   ├── config.py               # Environment settings
│   ├── database.py             # Supabase + pgvector helpers
│   ├── models/
│   │   ├── bert_service.py     # BERT embedding computation
│   │   └── classifier.py      # QueryProductClassifier (E/S/C/I)
│   ├── routes/
│   │   ├── auth.py             # Login / Register
│   │   ├── products.py         # CRUD + auto BERT embedding
│   │   ├── search.py           # ML-powered search (thesis core!)
│   │   ├── wishlist.py         # Wishlist (add/remove/check/seller-report)
│   │   └── transactions.py     # Buy / Balance / History
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Next.js (React) frontend
│   └── src/
│       ├── app/                # Pages
│       │   ├── page.js         # Home — AI search
│       │   ├── login/          # Login
│       │   ├── register/       # Register
│       │   ├── sell/           # Seller dashboard (includes wishlist analytics)
│       │   ├── products/       # Browse products (with wishlist toggle)
│       │   ├── wishlist/       # Buyer wishlist page
│       │   ├── history/        # Transaction history
│       │   └── wallet/         # Balance management
│       └── lib/api.js          # API client
└── database/
    └── schema.sql              # Supabase SQL with pgvector
```

---

## Setup Guide

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create a free project
2. Go to **SQL Editor** → paste the contents of `database/schema.sql` → click **Run**
3. Go to **Settings > API** → copy your:
   - Project URL
   - `anon` public key
   - `service_role` secret key
4. Go to **Settings > Database** → copy the connection string (URI format)

### Step 2: Setup Backend

```powershell
cd RetailTalk\backend

# Create .env from the example
copy .env.example .env
# Edit .env with your Supabase keys!

# Install dependencies
pip install -r requirements.txt

# Copy your trained model (if you have one)
mkdir trained_model
copy ..\..\classification_identification\models\task_2_esci_classifier_model\pytorch_model.bin trained_model\

# Run the backend
uvicorn main:app --reload --port 8000
```

The API docs will be at: http://localhost:8000/docs

### Step 3: Setup Frontend

```powershell
cd RetailTalk\frontend

# Install dependencies
npm install

# Create .env.local
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local

# Run the frontend
npm run dev
```

The app will be at: http://localhost:3000

---

## How the ML Search Works

1. **Seller creates product** → BERT computes 768-dim embedding → stored in Supabase via pgvector
2. **Buyer searches** → BERT computes query embedding → pgvector finds top 50 similar products → QueryProductClassifier labels each as Exact/Substitute/Complement/Irrelevant → results ranked and returned
3. **Buyer wishlists** → Save products for later via `/wishlist/add` → view saved items on `/wishlist` page → sellers see wishlist analytics on their reports dashboard
