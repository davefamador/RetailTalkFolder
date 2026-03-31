"""
Transaction routes — buy products, view transaction history, manage balance.
Buyer's money is held on purchase (pending). On successful delivery/completion,
the product amount is credited to the admin. Buyer can cancel with conditions.
Supports quantity (buyer selects how many to buy).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from routes.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

DELIVERY_FEE = 90.00


# --- Request/Response Models ---

class BuyRequest(BaseModel):
    product_id: str
    quantity: int = 1  # How many items to buy
    purchase_type: str = "delivery"  # 'walkin' or 'delivery'


class TopUpRequest(BaseModel):
    amount: float


class WithdrawRequest(BaseModel):
    amount: float


class TransactionResponse(BaseModel):
    id: str
    buyer_id: str
    seller_id: str
    product_id: str
    product_title: str
    amount: float
    quantity: int = 1
    seller_amount: float
    admin_commission: float
    delivery_fee: float = 0
    status: str
    purchase_type: str = "delivery"
    delivery_user_id: str = ""
    delivery_user_name: str = ""
    delivery_user_contact: str = ""
    seller_name: str = ""
    buyer_name: str = ""
    delivery_address: str = ""
    product_images: list = []
    created_at: str


class BalanceResponse(BaseModel):
    user_id: str
    balance: float


class SVFEntry(BaseModel):
    id: str
    user_id: str
    transaction_type: str
    amount: float
    created_at: str


# --- Routes ---

@router.post("/buy", response_model=TransactionResponse)
async def buy_product(req: BuyRequest, current_user: dict = Depends(get_current_user)):
    """
    Buy a product. 100% of product revenue goes to the department balance.
    Buyer can select quantity. Stock is decremented.
    """
    sb = get_supabase()
    user_id = current_user["sub"]

    if req.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    # 1. Check user isn't banned
    user_result = sb.table("users").select("role, is_banned").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_result.data[0]
    if user_data.get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account has been banned")

    user_role = user_data["role"]
    if user_role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot purchase products")
    if user_role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can purchase products")

    # Validate purchase_type
    if req.purchase_type not in ("walkin", "delivery"):
        raise HTTPException(status_code=400, detail="purchase_type must be 'walkin' or 'delivery'")

    # For delivery orders, get buyer's delivery address
    delivery_address = ""
    if req.purchase_type == "delivery":
        contact = sb.table("user_contacts").select("contact_number, delivery_address").eq("user_id", user_id).execute()
        if not contact.data:
            raise HTTPException(status_code=400, detail="Please add your contact number and delivery address before placing a delivery order")
        delivery_address = (contact.data[0].get("delivery_address") or "").strip()
        if not delivery_address:
            raise HTTPException(status_code=400, detail="Please set your delivery address before placing a delivery order")

    # 2. Get product
    product_result = sb.table("products").select("*").eq("id", req.product_id).eq("is_active", True).eq("status", "approved").execute()
    if not product_result.data:
        raise HTTPException(status_code=404, detail="Product not found or not available")

    product = product_result.data[0]

    # 3. Can't buy your own product
    if product["seller_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot buy your own product")

    # 4. Check stock
    current_stock = int(product.get("stock", 0))
    if current_stock <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock")
    if req.quantity > current_stock:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Available: {current_stock}, requested: {req.quantity}",
        )

    # 5. Check buyer balance
    balance_result = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
    if not balance_result.data:
        raise HTTPException(status_code=400, detail="No balance found. Top up your wallet first.")

    buyer_balance = float(balance_result.data[0]["balance"])
    unit_price = float(product["price"])
    total_price = unit_price * req.quantity

    # Add delivery fee for delivery orders
    delivery_fee = 90.00 if req.purchase_type == "delivery" else 0.0
    grand_total = total_price + delivery_fee

    if buyer_balance < grand_total:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. You have PHP {buyer_balance:.2f}, total cost is PHP {grand_total:.2f}",
        )

    # 6. Amounts (no commission split — admin gets paid on successful completion)
    seller_amount = total_price
    admin_commission = 0.0

    # 7. Deduct from buyer (money is held until transaction completes)
    new_buyer_balance = buyer_balance - grand_total
    sb.table("user_balances").update({"balance": new_buyer_balance}).eq("user_id", user_id).execute()

    # 8. Decrement stock
    new_stock = current_stock - req.quantity
    sb.table("products").update({"stock": new_stock}).eq("id", req.product_id).execute()

    # 11. Create product_transaction record
    txn_status = "pending_walkin" if req.purchase_type == "walkin" else "pending"
    txn_result = sb.table("product_transactions").insert({
        "buyer_id": user_id,
        "seller_id": product["seller_id"],
        "product_id": req.product_id,
        "quantity": req.quantity,
        "amount": total_price,
        "seller_amount": seller_amount,
        "admin_commission": admin_commission,
        "delivery_fee": delivery_fee,
        "delivery_address": delivery_address,
        "purchase_type": req.purchase_type,
        "status": txn_status,
    }).execute()

    if not txn_result.data:
        raise HTTPException(status_code=500, detail="Failed to create transaction")

    txn = txn_result.data[0]
    return TransactionResponse(
        id=txn["id"],
        buyer_id=txn["buyer_id"],
        seller_id=txn["seller_id"],
        product_id=txn["product_id"],
        product_title=product["title"],
        amount=float(txn["amount"]),
        quantity=int(txn.get("quantity", 1)),
        seller_amount=float(txn.get("seller_amount", 0)),
        admin_commission=float(txn.get("admin_commission", 0)),
        delivery_fee=float(txn.get("delivery_fee", 0)),
        status=txn["status"],
        purchase_type=txn.get("purchase_type", "delivery"),
        delivery_user_id=txn.get("delivery_user_id") or "",
        created_at=txn["created_at"],
    )


@router.get("/history", response_model=list[TransactionResponse])
async def get_transaction_history(current_user: dict = Depends(get_current_user)):
    """Get all transactions for the current user (as buyer or seller).
    For sellers/managers in a department, includes all department transactions."""
    sb = get_supabase()
    user_id = current_user["sub"]

    bought = sb.table("product_transactions").select("*, products(title, images)").eq("buyer_id", user_id).order("created_at", desc=True).execute()
    sold = sb.table("product_transactions").select("*, products(title, images)").eq("seller_id", user_id).order("created_at", desc=True).execute()

    all_txns = (bought.data or []) + (sold.data or [])

    # For sellers/managers in a department, also include department-wide transactions
    user_info = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if user_info.data and user_info.data[0].get("role") in ("seller", "manager") and user_info.data[0].get("department_id"):
        dept_id = user_info.data[0]["department_id"]
        dept_staff = sb.table("users").select("id").eq("department_id", dept_id).execute()
        dept_ids = [s["id"] for s in (dept_staff.data or [])]
        # Also include the department manager
        dept_info = sb.table("departments").select("manager_id").eq("id", dept_id).execute()
        if dept_info.data and dept_info.data[0].get("manager_id"):
            mgr_id = dept_info.data[0]["manager_id"]
            if mgr_id not in dept_ids:
                dept_ids.append(mgr_id)
        if dept_ids:
            dept_txns = sb.table("product_transactions").select("*, products(title, images)").in_(
                "seller_id", dept_ids
            ).order("created_at", desc=True).execute()
            all_txns += (dept_txns.data or [])
    seen = set()
    unique_txns = []
    for t in all_txns:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique_txns.append(t)

    unique_txns.sort(key=lambda t: t["created_at"], reverse=True)

    # Get delivery user info
    delivery_ids = set(t.get("delivery_user_id") for t in unique_txns if t.get("delivery_user_id"))
    delivery_names = {}
    delivery_contacts = {}
    if delivery_ids:
        d_users = sb.table("users").select("id, full_name").in_("id", list(delivery_ids)).execute()
        delivery_names = {u["id"]: u["full_name"] for u in (d_users.data or [])}
        d_contacts = sb.table("user_contacts").select("user_id, contact_number").in_("user_id", list(delivery_ids)).execute()
        delivery_contacts = {c["user_id"]: c["contact_number"] for c in (d_contacts.data or [])}

    # Get seller names (use department name if seller belongs to a department)
    seller_ids = set(t.get("seller_id") for t in unique_txns if t.get("seller_id"))
    seller_names = {}
    if seller_ids:
        s_users = sb.table("users").select("id, full_name, department_id").in_("id", list(seller_ids)).execute()
        # Batch-lookup department names
        dept_ids = set(u.get("department_id") for u in (s_users.data or []) if u.get("department_id"))
        dept_names = {}
        if dept_ids:
            depts = sb.table("departments").select("id, name").in_("id", list(dept_ids)).execute()
            dept_names = {d["id"]: d["name"] for d in (depts.data or [])}
        for u in (s_users.data or []):
            dept_id = u.get("department_id")
            if dept_id and dept_id in dept_names:
                seller_names[u["id"]] = dept_names[dept_id]
            else:
                seller_names[u["id"]] = u["full_name"]

    # Get buyer names
    buyer_ids = set(t.get("buyer_id") for t in unique_txns if t.get("buyer_id"))
    buyer_names = {}
    if buyer_ids:
        b_users = sb.table("users").select("id, full_name").in_("id", list(buyer_ids)).execute()
        buyer_names = {u["id"]: u["full_name"] for u in (b_users.data or [])}

    return [
        TransactionResponse(
            id=t["id"],
            buyer_id=t["buyer_id"],
            seller_id=t["seller_id"],
            product_id=t["product_id"],
            product_title=t.get("products", {}).get("title", "") if t.get("products") else "",
            product_images=t.get("products", {}).get("images", []) if t.get("products") else [],
            amount=float(t["amount"]),
            quantity=int(t.get("quantity", 1)),
            seller_amount=float(t.get("seller_amount", 0)),
            admin_commission=float(t.get("admin_commission", 0)),
            delivery_fee=float(t.get("delivery_fee", 0)),
            status=t["status"],
            purchase_type=t.get("purchase_type", "delivery"),
            delivery_user_id=t.get("delivery_user_id") or "",
            delivery_user_name=delivery_names.get(t.get("delivery_user_id", ""), ""),
            delivery_user_contact=delivery_contacts.get(t.get("delivery_user_id", ""), ""),
            seller_name=seller_names.get(t.get("seller_id", ""), ""),
            buyer_name=buyer_names.get(t.get("buyer_id", ""), ""),
            delivery_address=t.get("delivery_address", ""),
            created_at=t["created_at"],
        )
        for t in unique_txns
    ]


@router.get("/balance", response_model=BalanceResponse)
async def get_balance(current_user: dict = Depends(get_current_user)):
    """Get the current user's balance."""
    sb = get_supabase()
    result = sb.table("user_balances").select("*").eq("user_id", current_user["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Balance not found")

    return BalanceResponse(
        user_id=result.data[0]["user_id"],
        balance=float(result.data[0]["balance"]),
    )


@router.post("/topup", response_model=BalanceResponse)
async def topup_balance(req: TopUpRequest, current_user: dict = Depends(get_current_user)):
    """Add funds to the current user's balance."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    sb = get_supabase()
    user_id = current_user["sub"]

    result = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Balance not found")

    new_balance = float(result.data[0]["balance"]) + req.amount
    sb.table("user_balances").update({"balance": new_balance}).eq("user_id", user_id).execute()

    # Record SVF deposit
    sb.table("stored_value").insert({
        "user_id": user_id,
        "transaction_type": "deposit",
        "amount": req.amount,
    }).execute()

    return BalanceResponse(user_id=user_id, balance=new_balance)


@router.post("/withdraw", response_model=BalanceResponse)
async def withdraw_balance(req: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    """Withdraw funds from the current user's balance."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    sb = get_supabase()
    user_id = current_user["sub"]

    result = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Balance not found")

    current_balance = float(result.data[0]["balance"])
    if current_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    new_balance = current_balance - req.amount
    sb.table("user_balances").update({"balance": new_balance}).eq("user_id", user_id).execute()

    # Record SVF withdrawal
    sb.table("stored_value").insert({
        "user_id": user_id,
        "transaction_type": "withdrawal",
        "amount": req.amount,
    }).execute()

    return BalanceResponse(user_id=user_id, balance=new_balance)


@router.get("/svf-history", response_model=list[SVFEntry])
async def get_svf_history(current_user: dict = Depends(get_current_user)):
    """Get stored value facility history for the current user."""
    sb = get_supabase()
    user_id = current_user["sub"]

    result = sb.table("stored_value").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(100).execute()

    return [
        SVFEntry(
            id=row["id"],
            user_id=row["user_id"],
            transaction_type=row["transaction_type"],
            amount=float(row["amount"]),
            created_at=row["created_at"],
        )
        for row in (result.data or [])
    ]


# --- Walk-in Order Management (Staff) ---

class WalkinStatusUpdate(BaseModel):
    status: str  # 'inwork', 'ready', or 'completed' (completed only after buyer confirms pickup)


@router.get("/staff/walkin-orders")
async def get_staff_walkin_orders(current_user: dict = Depends(get_current_user)):
    """Get walk-in orders for all staff in the same department/store."""
    sb = get_supabase()
    user_id = current_user["sub"]

    # Verify seller role and get department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Only sellers can view walk-in orders")

    dept_id = user.data[0].get("department_id")

    # Get all staff in the same department
    if dept_id:
        staff = sb.table("users").select("id").eq("department_id", dept_id).execute()
        seller_ids = [s["id"] for s in (staff.data or [])]
        if user_id not in seller_ids:
            seller_ids.append(user_id)
    else:
        seller_ids = [user_id]

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).in_("seller_id", seller_ids).eq("purchase_type", "walkin").in_(
        "status", ["pending_walkin", "inwork", "ready", "picked_up"]
    ).order("created_at", desc=False).execute()

    if not txns.data:
        return []

    # Get buyer names
    buyer_ids = set(t["buyer_id"] for t in txns.data)
    buyers = sb.table("users").select("id, full_name").in_("id", list(buyer_ids)).execute()
    buyer_names = {u["id"]: u["full_name"] for u in (buyers.data or [])}

    results = []
    for t in txns.data:
        prod = t.get("products") or {}
        results.append({
            "id": t["id"],
            "buyer_id": t["buyer_id"],
            "buyer_name": buyer_names.get(t["buyer_id"], "Unknown"),
            "product_id": t["product_id"],
            "product_title": prod.get("title", ""),
            "product_price": float(prod.get("price", 0)),
            "product_images": prod.get("images", []),
            "quantity": int(t.get("quantity", 1)),
            "amount": float(t["amount"]),
            "status": t["status"],
            "purchase_type": t.get("purchase_type", "walkin"),
            "created_at": t["created_at"],
        })

    return results


@router.put("/staff/walkin-orders/{transaction_id}/status")
async def update_walkin_order_status(
    transaction_id: str,
    req: WalkinStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Staff updates walk-in order status: pending_walkin -> inwork -> ready, picked_up -> completed."""
    sb = get_supabase()
    user_id = current_user["sub"]

    valid_transitions = {
        "pending_walkin": "inwork",
        "inwork": "ready",
        "picked_up": "completed",
    }

    if req.status not in ("inwork", "ready", "completed"):
        raise HTTPException(status_code=400, detail="Status must be 'inwork', 'ready', or 'completed' (after buyer confirms pickup).")

    # Verify staff role and get department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user.data[0].get("department_id")

    # Get the transaction
    txn = sb.table("product_transactions").select("*").eq(
        "id", transaction_id
    ).eq("purchase_type", "walkin").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Walk-in order not found")

    # Verify the order belongs to the same department or to this seller
    seller_id = txn.data[0]["seller_id"]
    if dept_id:
        seller_info = sb.table("users").select("department_id").eq("id", seller_id).execute()
        if not seller_info.data or seller_info.data[0].get("department_id") != dept_id:
            raise HTTPException(status_code=403, detail="Order does not belong to your department")
    else:
        if seller_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to you")

    current_status = txn.data[0]["status"]
    expected_next = valid_transitions.get(current_status)

    if expected_next != req.status:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{req.status}'. Expected: '{expected_next}'"
        )

    sb.table("product_transactions").update({"status": req.status}).eq("id", transaction_id).execute()

    # On completion, admin gets 100% commission on product amount (walk-in has no delivery fee)
    if req.status == "completed":
        txn_amount = float(txn.data[0].get("amount", 0))
        # Admin gets 100% of product amount for walk-in orders
        sb.table("admin_earnings").insert({
            "transaction_id": transaction_id,
            "amount": txn_amount,
        }).execute()
        # Credit admin's balance
        admin_user = sb.table("users").select("id").eq("role", "admin").limit(1).execute()
        if admin_user.data:
            admin_id = admin_user.data[0]["id"]
            admin_bal = sb.table("user_balances").select("balance").eq("user_id", admin_id).execute()
            if admin_bal.data:
                new_admin_bal = float(admin_bal.data[0]["balance"]) + txn_amount
                sb.table("user_balances").update({"balance": new_admin_bal}).eq("user_id", admin_id).execute()

    return {"message": f"Walk-in order updated to '{req.status}'"}


@router.put("/buyer/walkin-confirm/{transaction_id}")
async def buyer_confirm_walkin(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Buyer confirms they picked up the walk-in order (ready -> picked_up)."""
    sb = get_supabase()
    user_id = current_user["sub"]

    # Verify this is the buyer's order and it's ready
    txn = sb.table("product_transactions").select("*").eq(
        "id", transaction_id
    ).eq("buyer_id", user_id).eq("purchase_type", "walkin").eq("status", "ready").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Walk-in order not found or not ready for confirmation")

    sb.table("product_transactions").update({"status": "picked_up"}).eq("id", transaction_id).execute()

    return {"message": "Walk-in order confirmed as picked up"}


# --- Manager Walk-in Order Management ---

@router.get("/manager/walkin-orders")
async def get_manager_walkin_orders(current_user: dict = Depends(get_current_user)):
    """Get walk-in orders for all staff in the manager's department."""
    sb = get_supabase()
    user_id = current_user["sub"]

    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user.data[0]
    if user_data["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user_data.get("department_id")

    # Fallback: look up department via departments.manager_id
    if not dept_id:
        dept_lookup = sb.table("departments").select("id").eq("manager_id", user_id).limit(1).execute()
        if dept_lookup.data:
            dept_id = dept_lookup.data[0]["id"]

    if dept_id:
        staff = sb.table("users").select("id").eq("department_id", dept_id).execute()
        seller_ids = [s["id"] for s in (staff.data or [])]
        if user_id not in seller_ids:
            seller_ids.append(user_id)
    else:
        seller_ids = [user_id]

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).in_("seller_id", seller_ids).eq("purchase_type", "walkin").in_(
        "status", ["pending_walkin", "inwork", "ready", "picked_up"]
    ).order("created_at", desc=False).execute()

    if not txns.data:
        return []

    buyer_ids = set(t["buyer_id"] for t in txns.data)
    all_user_ids = buyer_ids | set(t["seller_id"] for t in txns.data)
    users_result = sb.table("users").select("id, full_name").in_("id", list(all_user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    results = []
    for t in txns.data:
        prod = t.get("products") or {}
        results.append({
            "id": t["id"],
            "buyer_id": t["buyer_id"],
            "buyer_name": user_names.get(t["buyer_id"], "Unknown"),
            "seller_name": user_names.get(t["seller_id"], "Unknown"),
            "product_id": t["product_id"],
            "product_title": prod.get("title", ""),
            "product_price": float(prod.get("price", 0)),
            "product_images": prod.get("images", []),
            "quantity": int(t.get("quantity", 1)),
            "amount": float(t["amount"]),
            "status": t["status"],
            "purchase_type": t.get("purchase_type", "walkin"),
            "created_at": t["created_at"],
        })

    return results


@router.put("/manager/walkin-orders/{transaction_id}/status")
async def manager_update_walkin_order_status(
    transaction_id: str,
    req: WalkinStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Manager updates walk-in order status: pending_walkin -> inwork -> ready, picked_up -> completed."""
    sb = get_supabase()
    user_id = current_user["sub"]

    valid_transitions = {
        "pending_walkin": "inwork",
        "inwork": "ready",
        "picked_up": "completed",
    }

    if req.status not in ("inwork", "ready", "completed"):
        raise HTTPException(status_code=400, detail="Status must be 'inwork', 'ready', or 'completed' (after buyer confirms pickup).")

    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user.data[0].get("department_id")

    if not dept_id:
        dept_lookup = sb.table("departments").select("id").eq("manager_id", user_id).limit(1).execute()
        if dept_lookup.data:
            dept_id = dept_lookup.data[0]["id"]

    txn = sb.table("product_transactions").select("*").eq(
        "id", transaction_id
    ).eq("purchase_type", "walkin").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Walk-in order not found")

    seller_id = txn.data[0]["seller_id"]
    if dept_id:
        seller_info = sb.table("users").select("department_id").eq("id", seller_id).execute()
        if not seller_info.data or seller_info.data[0].get("department_id") != dept_id:
            raise HTTPException(status_code=403, detail="Order does not belong to your department")
    else:
        if seller_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to you")

    current_status = txn.data[0]["status"]
    expected_next = valid_transitions.get(current_status)

    if expected_next != req.status:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{req.status}'. Expected: '{expected_next}'"
        )

    sb.table("product_transactions").update({"status": req.status}).eq("id", transaction_id).execute()

    # On completion, admin gets 100% commission on product amount (walk-in has no delivery fee)
    if req.status == "completed":
        txn_amount = float(txn.data[0].get("amount", 0))
        # Admin gets 100% of product amount for walk-in orders
        sb.table("admin_earnings").insert({
            "transaction_id": transaction_id,
            "amount": txn_amount,
        }).execute()
        # Credit admin's balance
        admin_user = sb.table("users").select("id").eq("role", "admin").limit(1).execute()
        if admin_user.data:
            admin_id = admin_user.data[0]["id"]
            admin_bal = sb.table("user_balances").select("balance").eq("user_id", admin_id).execute()
            if admin_bal.data:
                new_admin_bal = float(admin_bal.data[0]["balance"]) + txn_amount
                sb.table("user_balances").update({"balance": new_admin_bal}).eq("user_id", admin_id).execute()

    return {"message": f"Walk-in order updated to '{req.status}'"}


# --- Delivery Order Management (Staff/Manager) ---

class DeliveryOrderStatusUpdate(BaseModel):
    status: str  # 'approved' (ready for pickup)


@router.get("/staff/delivery-orders")
async def get_staff_delivery_orders(current_user: dict = Depends(get_current_user)):
    """Get delivery orders for all staff in the same department/store."""
    sb = get_supabase()
    user_id = current_user["sub"]

    # Verify seller role and get department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Only sellers/managers can view delivery orders")

    dept_id = user.data[0].get("department_id")

    # Get all staff in the same department so orders are visible to all store staff
    if dept_id:
        staff = sb.table("users").select("id").eq("department_id", dept_id).execute()
        seller_ids = [s["id"] for s in (staff.data or [])]
        if user_id not in seller_ids:
            seller_ids.append(user_id)
    else:
        seller_ids = [user_id]

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).in_("seller_id", seller_ids).in_(
        "status", ["pending", "approved", "ondeliver"]
    ).order("created_at", desc=False).execute()

    if not txns.data:
        return []

    buyer_ids = set(t["buyer_id"] for t in txns.data)
    buyers = sb.table("users").select("id, full_name").in_("id", list(buyer_ids)).execute()
    buyer_names = {u["id"]: u["full_name"] for u in (buyers.data or [])}

    results = []
    for t in txns.data:
        prod = t.get("products") or {}
        results.append({
            "id": t["id"],
            "buyer_id": t["buyer_id"],
            "buyer_name": buyer_names.get(t["buyer_id"], "Unknown"),
            "product_id": t["product_id"],
            "product_title": prod.get("title", ""),
            "product_price": float(prod.get("price", 0)),
            "product_images": prod.get("images", []),
            "quantity": int(t.get("quantity", 1)),
            "amount": float(t["amount"]),
            "delivery_fee": float(t.get("delivery_fee", 0)),
            "delivery_address": t.get("delivery_address", ""),
            "status": t["status"],
            "purchase_type": t.get("purchase_type", "delivery"),
            "created_at": t["created_at"],
        })

    return results


@router.put("/staff/delivery-orders/{transaction_id}/status")
async def update_delivery_order_status(
    transaction_id: str,
    req: DeliveryOrderStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Staff updates delivery order status: pending -> approved (ready for deliveryman pickup)."""
    sb = get_supabase()
    user_id = current_user["sub"]

    if req.status != "approved":
        raise HTTPException(status_code=400, detail="Status must be 'approved'")

    # Verify staff role and get department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user.data[0].get("department_id")

    # Get the transaction
    txn = sb.table("product_transactions").select("*").eq(
        "id", transaction_id
    ).eq("purchase_type", "delivery").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    # Verify the order belongs to the same department or to this seller
    seller_id = txn.data[0]["seller_id"]
    if dept_id:
        seller_info = sb.table("users").select("department_id").eq("id", seller_id).execute()
        if not seller_info.data or seller_info.data[0].get("department_id") != dept_id:
            raise HTTPException(status_code=403, detail="Order does not belong to your department")
    else:
        if seller_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to you")

    current_status = txn.data[0]["status"]
    if current_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Can only approve orders with 'pending' status. Current: '{current_status}'"
        )

    sb.table("product_transactions").update({"status": "approved"}).eq("id", transaction_id).execute()

    return {"message": "Order marked as ready for delivery pickup"}


@router.get("/manager/delivery-orders")
async def get_manager_delivery_orders(current_user: dict = Depends(get_current_user)):
    """Get delivery orders for all products in the manager's department."""
    sb = get_supabase()
    user_id = current_user["sub"]

    # Get manager's department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user.data[0]
    if user_data["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user_data.get("department_id")

    # Fallback: look up department via departments.manager_id
    if not dept_id:
        dept_lookup = sb.table("departments").select("id").eq("manager_id", user_id).limit(1).execute()
        if dept_lookup.data:
            dept_id = dept_lookup.data[0]["id"]

    # Get all sellers in this department (or just this seller if no department)
    if dept_id:
        staff = sb.table("users").select("id").eq("department_id", dept_id).execute()
        seller_ids = [s["id"] for s in (staff.data or [])]
        # Include manager's own ID
        if user_id not in seller_ids:
            seller_ids.append(user_id)
    else:
        seller_ids = [user_id]

    if not seller_ids:
        return []

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).in_("seller_id", seller_ids).in_(
        "status", ["pending", "approved", "ondeliver"]
    ).order("created_at", desc=False).execute()

    if not txns.data:
        return []

    buyer_ids = set(t["buyer_id"] for t in txns.data)
    all_user_ids = buyer_ids | set(t["seller_id"] for t in txns.data)
    users_result = sb.table("users").select("id, full_name").in_("id", list(all_user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    results = []
    for t in txns.data:
        prod = t.get("products") or {}
        results.append({
            "id": t["id"],
            "buyer_id": t["buyer_id"],
            "buyer_name": user_names.get(t["buyer_id"], "Unknown"),
            "seller_name": user_names.get(t["seller_id"], "Unknown"),
            "product_id": t["product_id"],
            "product_title": prod.get("title", ""),
            "product_price": float(prod.get("price", 0)),
            "product_images": prod.get("images", []),
            "quantity": int(t.get("quantity", 1)),
            "amount": float(t["amount"]),
            "delivery_fee": float(t.get("delivery_fee", 0)),
            "delivery_address": t.get("delivery_address", ""),
            "status": t["status"],
            "purchase_type": t.get("purchase_type", "delivery"),
            "created_at": t["created_at"],
        })

    return results


@router.put("/manager/delivery-orders/{transaction_id}/status")
async def manager_update_delivery_order_status(
    transaction_id: str,
    req: DeliveryOrderStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Manager updates delivery order status: pending -> approved."""
    sb = get_supabase()
    user_id = current_user["sub"]

    if req.status != "approved":
        raise HTTPException(status_code=400, detail="Status must be 'approved'")

    # Get manager's department
    user = sb.table("users").select("role, department_id").eq("id", user_id).execute()
    if not user.data or user.data[0]["role"] not in ("seller", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")

    dept_id = user.data[0].get("department_id")

    # Fallback: look up department via departments.manager_id
    if not dept_id:
        dept_lookup = sb.table("departments").select("id").eq("manager_id", user_id).limit(1).execute()
        if dept_lookup.data:
            dept_id = dept_lookup.data[0]["id"]

    # Verify the transaction belongs to the department
    txn = sb.table("product_transactions").select("*, products(seller_id)").eq(
        "id", transaction_id
    ).eq("purchase_type", "delivery").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    seller_id = txn.data[0]["seller_id"]
    if dept_id:
        seller_info = sb.table("users").select("department_id").eq("id", seller_id).execute()
        if not seller_info.data or seller_info.data[0].get("department_id") != dept_id:
            raise HTTPException(status_code=403, detail="Order does not belong to your department")
    else:
        if seller_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to you")

    current_status = txn.data[0]["status"]
    if current_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Can only approve orders with 'pending' status. Current: '{current_status}'"
        )

    sb.table("product_transactions").update({"status": "approved"}).eq("id", transaction_id).execute()

    return {"message": "Order approved for delivery pickup"}


# --- Buyer Order Cancellation ---

CANCELLATION_FEE = 50.00


@router.put("/buyer/cancel/{transaction_id}")
async def buyer_cancel_order(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Buyer cancels an order.
    - Delivery: free cancel if pending/approved. 50 PHP fee if ondeliver (fee goes to delivery user).
    - Walk-in: free cancel if pending_walkin. Cannot cancel if inwork/ready or later.
    """
    sb = get_supabase()
    user_id = current_user["sub"]

    txn = sb.table("product_transactions").select("*").eq(
        "id", transaction_id
    ).eq("buyer_id", user_id).execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = txn.data[0]
    status = order["status"]
    purchase_type = order.get("purchase_type", "delivery")
    amount = float(order.get("amount", 0))
    delivery_fee = float(order.get("delivery_fee", 0))
    grand_total = amount + delivery_fee

    # Determine if cancellation is allowed and calculate refund
    if purchase_type == "walkin":
        if status != "pending_walkin":
            raise HTTPException(status_code=400, detail="Walk-in orders can only be cancelled before preparation starts.")
        refund_amount = grand_total
        fee_to_delivery = 0.0
    elif purchase_type == "delivery":
        if status in ("pending", "approved"):
            refund_amount = grand_total
            fee_to_delivery = 0.0
        elif status == "ondeliver":
            fee_to_delivery = CANCELLATION_FEE
            refund_amount = grand_total - fee_to_delivery
        else:
            raise HTTPException(status_code=400, detail=f"Cannot cancel order with status '{status}'.")
    else:
        raise HTTPException(status_code=400, detail="Unknown purchase type.")

    # 1. Cancel the transaction
    sb.table("product_transactions").update({"status": "cancelled"}).eq("id", transaction_id).execute()

    # 2. Refund buyer
    if refund_amount > 0:
        buyer_bal = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
        if buyer_bal.data:
            new_bal = float(buyer_bal.data[0]["balance"]) + refund_amount
            sb.table("user_balances").update({"balance": new_bal}).eq("user_id", user_id).execute()

    # 3. Pay cancellation fee to delivery user (if mid-delivery cancel)
    if fee_to_delivery > 0 and order.get("delivery_user_id"):
        del_bal = sb.table("user_balances").select("balance").eq("user_id", order["delivery_user_id"]).execute()
        if del_bal.data:
            new_del_bal = float(del_bal.data[0]["balance"]) + fee_to_delivery
            sb.table("user_balances").update({"balance": new_del_bal}).eq("user_id", order["delivery_user_id"]).execute()

        # Log in delivery_earnings for earnings history
        sb.table("delivery_earnings").insert({
            "delivery_user_id": order["delivery_user_id"],
            "transaction_id": transaction_id,
            "amount": fee_to_delivery,
        }).execute()

    # 4. Restore product stock
    prod = sb.table("products").select("stock").eq("id", order["product_id"]).execute()
    if prod.data:
        new_stock = int(prod.data[0]["stock"]) + int(order.get("quantity", 1))
        sb.table("products").update({"stock": new_stock}).eq("id", order["product_id"]).execute()

    fee_msg = f" A cancellation fee of PHP {fee_to_delivery:.2f} was deducted." if fee_to_delivery > 0 else ""
    return {
        "message": f"Order cancelled successfully. PHP {refund_amount:.2f} refunded to your wallet.{fee_msg}",
        "refund_amount": refund_amount,
        "cancellation_fee": fee_to_delivery,
    }
