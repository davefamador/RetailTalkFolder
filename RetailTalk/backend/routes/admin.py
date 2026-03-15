"""
Admin routes — dashboard, user management, reports, product management.
Only accessible by admin users (role='admin').
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from routes.auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/admin", tags=["Admin"])


# --- Helpers ---

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency that ensures the current user is an admin."""
    sb = get_supabase()
    result = sb.table("users").select("role").eq("id", current_user["sub"]).execute()
    if not result.data or result.data[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# --- Request/Response Models ---

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_banned: bool
    balance: float
    created_at: str


class BanRequest(BaseModel):
    is_banned: bool


class SetBalanceRequest(BaseModel):
    balance: float


class DashboardResponse(BaseModel):
    total_users: int
    total_products: int
    total_orders: int
    total_revenue: float
    total_sales_volume: float
    total_svf_deposits: float = 0
    total_svf_withdrawals: float = 0
    net_svf_balance: float = 0


class TransactionDetail(BaseModel):
    id: str
    buyer_name: str
    seller_name: str
    product_title: str
    quantity: int
    amount: float
    seller_amount: float
    admin_commission: float
    status: str
    created_at: str


class DailyIncome(BaseModel):
    date: str
    income: float
    transactions: int


class TopSeller(BaseModel):
    seller_id: str
    seller_name: str
    total_sales: float
    transaction_count: int


class TopProduct(BaseModel):
    product_id: str
    product_title: str
    times_sold: int
    total_revenue: float


class ReportsResponse(BaseModel):
    total_revenue: float
    total_sales_volume: float
    total_orders: int
    avg_transaction_value: float
    daily_income: list[DailyIncome]
    top_sellers: list[TopSeller]
    top_products: list[TopProduct]
    monthly_income: list[DailyIncome]


class AdminProductResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: str
    price: float
    stock: int
    images: list[str]
    is_active: bool
    created_at: str


class AdminUpdateProductRequest(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None


# --- Routes ---

@router.get("/dashboard", response_model=DashboardResponse)
async def admin_dashboard(admin: dict = Depends(require_admin)):
    """Get admin dashboard stats."""
    sb = get_supabase()

    users = sb.table("users").select("id", count="exact").execute()
    products = sb.table("products").select("id", count="exact").eq("is_active", True).execute()
    txns = sb.table("product_transactions").select("amount, admin_commission").eq("status", "completed").execute()

    total_revenue = sum(float(t.get("admin_commission", 0)) for t in txns.data) if txns.data else 0
    total_volume = sum(float(t.get("amount", 0)) for t in txns.data) if txns.data else 0

    # SVF summary
    svf_data = sb.table("stored_value").select("transaction_type, amount").execute()
    total_deposits = 0
    total_withdrawals = 0
    if svf_data.data:
        for sv in svf_data.data:
            if sv["transaction_type"] == "deposit":
                total_deposits += float(sv["amount"])
            elif sv["transaction_type"] == "withdrawal":
                total_withdrawals += float(sv["amount"])

    return DashboardResponse(
        total_users=users.count or 0,
        total_products=products.count or 0,
        total_orders=len(txns.data) if txns.data else 0,
        total_revenue=round(total_revenue, 2),
        total_sales_volume=round(total_volume, 2),
        total_svf_deposits=round(total_deposits, 2),
        total_svf_withdrawals=round(total_withdrawals, 2),
        net_svf_balance=round(total_deposits - total_withdrawals, 2),
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: str = Query("", description="Search by name or email"),
    admin: dict = Depends(require_admin),
):
    """List all users with balances. Supports search by name/email."""
    sb = get_supabase()

    if search:
        users = sb.table("users").select("*, user_balances(balance)").or_(
            f"full_name.ilike.%{search}%,email.ilike.%{search}%"
        ).order("created_at", desc=True).execute()
    else:
        users = sb.table("users").select("*, user_balances(balance)").order("created_at", desc=True).execute()

    result = []
    for u in users.data:
        bal = 0.0
        if u.get("user_balances"):
            if isinstance(u["user_balances"], list) and len(u["user_balances"]) > 0:
                bal = float(u["user_balances"][0].get("balance", 0))
            elif isinstance(u["user_balances"], dict):
                bal = float(u["user_balances"].get("balance", 0))

        result.append(AdminUserResponse(
            id=u["id"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            is_banned=u.get("is_banned", False),
            balance=bal,
            created_at=u["created_at"],
        ))
    return result


@router.put("/users/{user_id}/ban")
async def ban_user(user_id: str, req: BanRequest, admin: dict = Depends(require_admin)):
    """Ban or unban a user. Admins cannot be banned."""
    sb = get_supabase()

    target = sb.table("users").select("role").eq("id", user_id).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")
    if target.data[0].get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban an admin account")

    sb.table("users").update({"is_banned": req.is_banned}).eq("id", user_id).execute()
    return {"message": f"User {'banned' if req.is_banned else 'unbanned'} successfully"}


@router.put("/users/{user_id}/balance")
async def set_user_balance(user_id: str, req: SetBalanceRequest, admin: dict = Depends(require_admin)):
    """Set a user's balance to a specific value."""
    sb = get_supabase()

    user = sb.table("users").select("id").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    result = sb.table("user_balances").update({"balance": req.balance}).eq("user_id", user_id).execute()
    if not result.data:
        sb.table("user_balances").insert({"user_id": user_id, "balance": req.balance}).execute()

    return {"message": f"Balance set to {req.balance:.2f}", "balance": req.balance}


@router.get("/transactions", response_model=list[TransactionDetail])
async def list_transactions(
    search: str = Query("", description="Search by buyer or seller name"),
    admin: dict = Depends(require_admin),
):
    """List all product transactions with search support."""
    sb = get_supabase()

    txns = sb.table("product_transactions").select(
        "*, products(title)"
    ).eq("status", "completed").order("created_at", desc=True).limit(200).execute()

    if not txns.data:
        return []

    # Get all user IDs we need names for
    user_ids = set()
    for t in txns.data:
        user_ids.add(t["buyer_id"])
        user_ids.add(t["seller_id"])

    users_result = sb.table("users").select("id, full_name").in_("id", list(user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in users_result.data} if users_result.data else {}

    results = []
    for t in txns.data:
        buyer_name = user_names.get(t["buyer_id"], "Unknown")
        seller_name = user_names.get(t["seller_id"], "Unknown")
        product_title = ""
        if t.get("products"):
            product_title = t["products"].get("title", "") if isinstance(t["products"], dict) else ""

        if search:
            search_lower = search.lower()
            if (search_lower not in buyer_name.lower() and
                search_lower not in seller_name.lower() and
                search_lower not in product_title.lower()):
                continue

        results.append(TransactionDetail(
            id=t["id"],
            buyer_name=buyer_name,
            seller_name=seller_name,
            product_title=product_title,
            quantity=int(t.get("quantity", 1)),
            amount=float(t["amount"]),
            seller_amount=float(t.get("seller_amount", 0)),
            admin_commission=float(t.get("admin_commission", 0)),
            status=t["status"],
            created_at=t["created_at"],
        ))

    return results


@router.get("/reports", response_model=ReportsResponse)
async def admin_reports(admin: dict = Depends(require_admin)):
    """Detailed admin reports with data for graphs."""
    sb = get_supabase()

    txns = sb.table("product_transactions").select(
        "*, products(title)"
    ).eq("status", "completed").order("created_at", desc=True).execute()

    if not txns.data:
        return ReportsResponse(
            total_revenue=0, total_sales_volume=0, total_orders=0,
            avg_transaction_value=0, daily_income=[], top_sellers=[],
            top_products=[], monthly_income=[],
        )

    seller_ids = set(t["seller_id"] for t in txns.data)
    users_result = sb.table("users").select("id, full_name").in_("id", list(seller_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in users_result.data} if users_result.data else {}

    total_income = 0
    total_volume = 0
    daily_data = {}
    monthly_data = {}
    seller_data = {}
    product_data = {}

    for t in txns.data:
        amount = float(t["amount"])
        commission = float(t.get("admin_commission", 0))
        total_income += commission
        total_volume += amount

        try:
            dt = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            day_key = dt.strftime("%Y-%m-%d")
            month_key = dt.strftime("%Y-%m")
        except Exception:
            day_key = t["created_at"][:10]
            month_key = t["created_at"][:7]

        if day_key not in daily_data:
            daily_data[day_key] = {"income": 0, "count": 0}
        daily_data[day_key]["income"] += commission
        daily_data[day_key]["count"] += 1

        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": 0, "count": 0}
        monthly_data[month_key]["income"] += commission
        monthly_data[month_key]["count"] += 1

        sid = t["seller_id"]
        if sid not in seller_data:
            seller_data[sid] = {"name": user_names.get(sid, "Unknown"), "total": 0, "count": 0}
        seller_data[sid]["total"] += amount
        seller_data[sid]["count"] += 1

        pid = t["product_id"]
        ptitle = ""
        if t.get("products"):
            ptitle = t["products"].get("title", "") if isinstance(t["products"], dict) else ""
        if pid not in product_data:
            product_data[pid] = {"title": ptitle, "count": 0, "revenue": 0}
        product_data[pid]["count"] += 1
        product_data[pid]["revenue"] += amount

    daily_income = sorted([
        DailyIncome(date=k, income=round(v["income"], 2), transactions=v["count"])
        for k, v in daily_data.items()
    ], key=lambda x: x.date, reverse=True)[:30]

    monthly_income = sorted([
        DailyIncome(date=k, income=round(v["income"], 2), transactions=v["count"])
        for k, v in monthly_data.items()
    ], key=lambda x: x.date, reverse=True)[:12]

    top_sellers = sorted([
        TopSeller(seller_id=k, seller_name=v["name"], total_sales=round(v["total"], 2), transaction_count=v["count"])
        for k, v in seller_data.items()
    ], key=lambda x: x.total_sales, reverse=True)[:10]

    top_products = sorted([
        TopProduct(product_id=k, product_title=v["title"], times_sold=v["count"], total_revenue=round(v["revenue"], 2))
        for k, v in product_data.items()
    ], key=lambda x: x.times_sold, reverse=True)[:10]

    avg_val = total_volume / len(txns.data) if txns.data else 0

    return ReportsResponse(
        total_revenue=round(total_income, 2),
        total_sales_volume=round(total_volume, 2),
        total_orders=len(txns.data),
        avg_transaction_value=round(avg_val, 2),
        daily_income=daily_income,
        top_sellers=top_sellers,
        top_products=top_products,
        monthly_income=monthly_income,
    )


# --- Product Management ---

@router.get("/products", response_model=list[AdminProductResponse])
async def list_admin_products(
    search: str = Query("", description="Search by product title"),
    admin: dict = Depends(require_admin),
):
    """List all products for admin management."""
    sb = get_supabase()

    if search:
        products = sb.table("products").select("*, users!products_seller_id_fkey(full_name)").ilike(
            "title", f"%{search}%"
        ).order("created_at", desc=True).limit(200).execute()
    else:
        products = sb.table("products").select("*, users!products_seller_id_fkey(full_name)").order(
            "created_at", desc=True
        ).limit(200).execute()

    return [
        AdminProductResponse(
            id=p["id"],
            seller_id=p["seller_id"],
            seller_name=p.get("users", {}).get("full_name", "") if p.get("users") else "",
            title=p["title"],
            description=p.get("description", ""),
            price=float(p["price"]),
            stock=int(p.get("stock", 0)),
            images=p.get("images") or [],
            is_active=p["is_active"],
            created_at=p["created_at"],
        )
        for p in products.data
    ]


@router.put("/products/{product_id}", response_model=AdminProductResponse)
async def admin_update_product(
    product_id: str,
    req: AdminUpdateProductRequest,
    admin: dict = Depends(require_admin),
):
    """Admin can update product title, price, stock, and active status."""
    sb = get_supabase()

    existing = sb.table("products").select("id").eq("id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = sb.table("products").update(update_data).eq("id", product_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update product")

    # Re-fetch with seller name
    p_result = sb.table("products").select("*, users!products_seller_id_fkey(full_name)").eq("id", product_id).execute()
    p = p_result.data[0]

    return AdminProductResponse(
        id=p["id"],
        seller_id=p["seller_id"],
        seller_name=p.get("users", {}).get("full_name", "") if p.get("users") else "",
        title=p["title"],
        description=p.get("description", ""),
        price=float(p["price"]),
        stock=int(p.get("stock", 0)),
        images=p.get("images") or [],
        is_active=p["is_active"],
        created_at=p["created_at"],
    )


# --- User Detail (Clickable Panel) ---

@router.get("/users/{user_id}/detail")
async def get_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    """Get full user detail for admin slide panel: report, history, transactions."""
    sb = get_supabase()

    # 1. User info
    user_resp = sb.table("users").select("*, user_balances(balance), user_contacts(contact_number)").eq("id", user_id).execute()
    if not user_resp.data:
        raise HTTPException(status_code=404, detail="User not found")

    u = user_resp.data[0]
    bal = 0.0
    if u.get("user_balances"):
        if isinstance(u["user_balances"], list) and len(u["user_balances"]) > 0:
            bal = float(u["user_balances"][0].get("balance", 0))
        elif isinstance(u["user_balances"], dict):
            bal = float(u["user_balances"].get("balance", 0))

    contact = ""
    if u.get("user_contacts"):
        if isinstance(u["user_contacts"], list) and len(u["user_contacts"]) > 0:
            contact = u["user_contacts"][0].get("contact_number", "")
        elif isinstance(u["user_contacts"], dict):
            contact = u["user_contacts"].get("contact_number", "")

    # 2. Transactions
    bought = sb.table("product_transactions").select("*, products(title)").eq("buyer_id", user_id).order("created_at", desc=True).limit(50).execute()
    sold = sb.table("product_transactions").select("*, products(title)").eq("seller_id", user_id).order("created_at", desc=True).limit(50).execute()
    delivered = sb.table("product_transactions").select("*, products(title)").eq("delivery_user_id", user_id).order("created_at", desc=True).limit(50).execute()

    # Merge and deduplicate
    all_txns = (bought.data or []) + (sold.data or []) + (delivered.data or [])
    seen = set()
    transactions = []
    for t in all_txns:
        if t["id"] not in seen:
            seen.add(t["id"])
            transactions.append({
                "id": t["id"],
                "product_title": (t.get("products") or {}).get("title", ""),
                "amount": float(t["amount"]),
                "quantity": int(t.get("quantity", 1)),
                "status": t["status"],
                "role_in_txn": "buyer" if t["buyer_id"] == user_id else ("seller" if t["seller_id"] == user_id else "delivery"),
                "created_at": t["created_at"],
            })
    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    # 3. Report: daily/weekly/monthly breakdown
    daily_data = {}
    monthly_data = {}
    for t in transactions:
        try:
            dt = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            day_key = dt.strftime("%Y-%m-%d")
            month_key = dt.strftime("%Y-%m")
        except Exception:
            day_key = t["created_at"][:10]
            month_key = t["created_at"][:7]

        if day_key not in daily_data:
            daily_data[day_key] = {"amount": 0, "count": 0}
        daily_data[day_key]["amount"] += t["amount"]
        daily_data[day_key]["count"] += 1

        if month_key not in monthly_data:
            monthly_data[month_key] = {"amount": 0, "count": 0}
        monthly_data[month_key]["amount"] += t["amount"]
        monthly_data[month_key]["count"] += 1

    daily = sorted(
        [{"date": k, "amount": round(v["amount"], 2), "count": v["count"]} for k, v in daily_data.items()],
        key=lambda x: x["date"], reverse=True
    )[:30]

    monthly = sorted(
        [{"date": k, "amount": round(v["amount"], 2), "count": v["count"]} for k, v in monthly_data.items()],
        key=lambda x: x["date"], reverse=True
    )[:12]

    # 4. SVF history
    svf = sb.table("stored_value").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()

    # 5. Seller products (if user is a seller)
    seller_products = []
    if u["role"] == "seller":
        prods = sb.table("products").select("id, title, price, stock, images, is_active, created_at").eq("seller_id", user_id).order("created_at", desc=True).limit(50).execute()
        seller_products = [
            {
                "id": p["id"],
                "title": p["title"],
                "price": float(p["price"]),
                "stock": int(p.get("stock", 0)),
                "image_url": (p.get("images") or [""])[0] if p.get("images") else "",
                "is_active": p["is_active"],
                "created_at": p["created_at"],
            }
            for p in (prods.data or [])
        ]

    return {
        "user": {
            "id": u["id"],
            "email": u["email"],
            "full_name": u["full_name"],
            "role": u["role"],
            "is_banned": u.get("is_banned", False),
            "balance": bal,
            "contact_number": contact,
            "created_at": u["created_at"],
        },
        "report": {
            "total_transactions": len(transactions),
            "total_amount": round(sum(t["amount"] for t in transactions), 2),
            "daily": daily,
            "monthly": monthly,
        },
        "transactions": transactions[:50],
        "seller_products": seller_products,
        "svf_history": [
            {
                "id": s["id"],
                "type": s["transaction_type"],
                "amount": float(s["amount"]),
                "created_at": s["created_at"],
            }
            for s in (svf.data or [])
        ],
    }


# --- Admin: Product approval (pending / approved / unapproved) ---

@router.get("/pending-products")
async def admin_get_pending_products(admin: dict = Depends(require_admin)):
    """Get all products with status 'pending', with seller info."""
    sb = get_supabase()
    prods = sb.table("products").select("*").eq("status", "pending").order("created_at", desc=True).execute()

    results = []
    for p in (prods.data or []):
        seller = sb.table("users").select("full_name, email").eq("id", p["seller_id"]).execute()
        seller_info = seller.data[0] if seller.data else {}

        results.append({
            "id": p["id"],
            "title": p["title"],
            "description": p.get("description", ""),
            "price": float(p["price"]),
            "stock": p["stock"],
            "images": p.get("images", []),
            "seller_id": p["seller_id"],
            "seller_name": seller_info.get("full_name", "Unknown"),
            "seller_email": seller_info.get("email", ""),
            "status": p["status"],
            "created_at": p["created_at"],
        })

    return results


@router.put("/products/{product_id}/approve")
async def admin_approve_product(
    product_id: str,
    admin: dict = Depends(require_admin),
):
    """Approve a product (pending → approved) so it can be listed and sold."""
    sb = get_supabase()

    prod = sb.table("products").select("status").eq("id", product_id).execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if prod.data[0]["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Can only approve products with status 'pending'. Current: {prod.data[0]['status']}")

    sb.table("products").update({"status": "approved"}).eq("id", product_id).execute()
    return {"message": "Product approved"}


@router.put("/products/{product_id}/unapprove")
async def admin_unapprove_product(
    product_id: str,
    admin: dict = Depends(require_admin),
):
    """Unapprove a product (pending → unapproved)."""
    sb = get_supabase()

    prod = sb.table("products").select("status").eq("id", product_id).execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if prod.data[0]["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Can only unapprove products with status 'pending'. Current: {prod.data[0]['status']}")

    sb.table("products").update({"status": "unapproved"}).eq("id", product_id).execute()
    return {"message": "Product unapproved"}


# --- Delivery User Registration ---

class DeliveryRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    contact_number: str


@router.post("/delivery/register")
async def admin_register_delivery(
    req: DeliveryRegisterRequest,
    admin: dict = Depends(require_admin),
):
    """Admin-only: register a new delivery user with unique name, email, and contact."""
    import bcrypt
    import traceback

    try:
        sb = get_supabase()

        # Check unique email
        existing_email = sb.table("users").select("id").eq("email", req.email).execute()
        if existing_email.data:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check unique full_name
        existing_name = sb.table("users").select("id").eq("full_name", req.full_name).execute()
        if existing_name.data:
            raise HTTPException(status_code=400, detail="Full name already taken")

        # Check unique contact_number
        existing_contact = sb.table("user_contacts").select("user_id").eq("contact_number", req.contact_number).execute()
        if existing_contact.data:
            raise HTTPException(status_code=400, detail="Contact number already registered")

        # Hash password
        password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Create user with delivery role
        result = sb.table("users").insert({
            "email": req.email,
            "password_hash": password_hash,
            "full_name": req.full_name,
            "role": "delivery",
            "is_banned": False,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create delivery user")

        user = result.data[0]

        # Create balance
        sb.table("user_balances").insert({"user_id": user["id"], "balance": 0.00}).execute()

        # Create contact
        sb.table("user_contacts").insert({"user_id": user["id"], "contact_number": req.contact_number}).execute()

        return {
            "message": "Delivery user registered successfully",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": "delivery",
                "contact_number": req.contact_number,
            },
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[DeliveryRegister] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
