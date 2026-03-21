"""
Delivery routes — delivery user dashboard.
Available pickups, pick order, update status, earnings, history.
Max 5 active deliveries enforced.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from routes.auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/delivery", tags=["Delivery"])

MAX_ACTIVE_DELIVERIES = 5
DELIVERY_FEE = 90.00


# --- Helpers ---

async def require_delivery(current_user: dict = Depends(get_current_user)):
    """Ensure the current user is a delivery user."""
    if current_user.get("role") != "delivery":
        sb = get_supabase()
        result = sb.table("users").select("role").eq("id", current_user["sub"]).execute()
        if not result.data or result.data[0]["role"] != "delivery":
            raise HTTPException(status_code=403, detail="Delivery user access required")
    return current_user


# --- Response Models ---

class AvailableOrderResponse(BaseModel):
    transaction_id: str
    product_id: str
    product_title: str
    product_price: float
    product_images: list = []
    quantity: int
    amount: float
    delivery_fee: float
    buyer_name: str
    buyer_contact: str = ""
    seller_name: str
    delivery_address: str = ""
    status: str
    created_at: str


class DeliveryHistoryItem(BaseModel):
    transaction_id: str
    product_title: str
    product_price: float
    product_images: list = []
    quantity: int
    delivery_fee: float
    status: str
    buyer_name: str
    buyer_contact: str
    seller_name: str
    delivery_address: str = ""
    created_at: str


class EarningsDay(BaseModel):
    date: str
    amount: float
    count: int


class EarningsResponse(BaseModel):
    total_earnings: float
    total_deliveries: int
    wallet_balance: float
    daily: list[EarningsDay]
    weekly: list[EarningsDay]
    monthly: list[EarningsDay]
    daily_delivery_count: list[EarningsDay]
    weekly_delivery_count: list[EarningsDay]
    monthly_delivery_count: list[EarningsDay]


class StatusUpdateRequest(BaseModel):
    status: str  # 'delivered' or 'undelivered'


class WithdrawRequest(BaseModel):
    amount: float


# --- Routes ---

@router.get("/available", response_model=list[AvailableOrderResponse])
async def get_available_orders(delivery_user: dict = Depends(require_delivery)):
    """Get orders with status 'approved' that are ready for pickup."""
    sb = get_supabase()

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).eq("status", "approved").is_("delivery_user_id", "null").order("created_at", desc=False).limit(50).execute()

    if not txns.data:
        return []

    # Get user names
    user_ids = set()
    for t in txns.data:
        user_ids.add(t["buyer_id"])
        user_ids.add(t["seller_id"])

    users_result = sb.table("users").select("id, full_name").in_("id", list(user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    # Get buyer contacts
    buyer_ids = list(set(t["buyer_id"] for t in txns.data))
    contacts_result = sb.table("user_contacts").select("user_id, contact_number").in_("user_id", buyer_ids).execute()
    buyer_contacts = {c["user_id"]: c["contact_number"] for c in (contacts_result.data or [])}

    results = []
    for t in txns.data:
        prod = t.get("products", {}) or {}
        results.append(AvailableOrderResponse(
            transaction_id=t["id"],
            product_id=t["product_id"],
            product_title=prod.get("title", ""),
            product_price=float(prod.get("price", 0)),
            product_images=prod.get("images", []),
            quantity=int(t.get("quantity", 1)),
            amount=float(t["amount"]),
            delivery_fee=float(t.get("delivery_fee", DELIVERY_FEE)),
            buyer_name=user_names.get(t["buyer_id"], "Unknown"),
            buyer_contact=buyer_contacts.get(t["buyer_id"], "N/A"),
            seller_name=user_names.get(t["seller_id"], "Unknown"),
            delivery_address=t.get("delivery_address", ""),
            status=t["status"],
            created_at=t["created_at"],
        ))
    return results


@router.get("/active", response_model=list[AvailableOrderResponse])
async def get_active_deliveries(delivery_user: dict = Depends(require_delivery)):
    """Get delivery user's current active deliveries (status='ondeliver')."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).eq("delivery_user_id", user_id).eq("status", "ondeliver").order("created_at", desc=False).execute()

    if not txns.data:
        return []

    user_ids = set()
    for t in txns.data:
        user_ids.add(t["buyer_id"])
        user_ids.add(t["seller_id"])

    users_result = sb.table("users").select("id, full_name").in_("id", list(user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    # Get buyer contacts
    buyer_ids = list(set(t["buyer_id"] for t in txns.data))
    contacts_result = sb.table("user_contacts").select("user_id, contact_number").in_("user_id", buyer_ids).execute()
    buyer_contacts = {c["user_id"]: c["contact_number"] for c in (contacts_result.data or [])}

    return [
        AvailableOrderResponse(
            transaction_id=t["id"],
            product_id=t["product_id"],
            product_title=(t.get("products") or {}).get("title", ""),
            product_price=float((t.get("products") or {}).get("price", 0)),
            product_images=(t.get("products") or {}).get("images", []),
            quantity=int(t.get("quantity", 1)),
            amount=float(t["amount"]),
            delivery_fee=float(t.get("delivery_fee", DELIVERY_FEE)),
            buyer_name=user_names.get(t["buyer_id"], "Unknown"),
            buyer_contact=buyer_contacts.get(t["buyer_id"], "N/A"),
            seller_name=user_names.get(t["seller_id"], "Unknown"),
            delivery_address=t.get("delivery_address", ""),
            status=t["status"],
            created_at=t["created_at"],
        )
        for t in txns.data
    ]


@router.post("/pick/{transaction_id}")
async def pick_order(transaction_id: str, delivery_user: dict = Depends(require_delivery)):
    """Pick an order for delivery. Max 5 active deliveries."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    # Check contact number
    contact = sb.table("user_contacts").select("contact_number").eq("user_id", user_id).execute()
    if not contact.data:
        raise HTTPException(status_code=400, detail="Please add your contact number before accepting deliveries")

    # Check active deliveries count
    active = sb.table("product_transactions").select("id", count="exact").eq(
        "delivery_user_id", user_id
    ).eq("status", "ondeliver").execute()

    if (active.count or 0) >= MAX_ACTIVE_DELIVERIES:
        raise HTTPException(
            status_code=400,
            detail=f"You already have {MAX_ACTIVE_DELIVERIES} active deliveries. Complete some before picking more."
        )

    # Verify the transaction is available
    txn = sb.table("product_transactions").select("*").eq("id", transaction_id).eq("status", "approved").execute()
    if not txn.data:
        raise HTTPException(status_code=404, detail="Order not found or already picked")

    if txn.data[0].get("delivery_user_id"):
        raise HTTPException(status_code=400, detail="This order is already assigned to another delivery user")

    # Assign to delivery user and update status
    sb.table("product_transactions").update({
        "delivery_user_id": user_id,
        "status": "ondeliver",
    }).eq("id", transaction_id).execute()

    return {"message": "Order picked up! Deliver it to the buyer."}


@router.put("/status/{transaction_id}")
async def update_delivery_status(
    transaction_id: str,
    req: StatusUpdateRequest,
    delivery_user: dict = Depends(require_delivery),
):
    """Update delivery status to 'delivered' or 'undelivered'."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    if req.status not in ("delivered", "undelivered"):
        raise HTTPException(status_code=400, detail="Status must be 'delivered' or 'undelivered'")

    # Verify this is the delivery user's order
    txn = sb.table("product_transactions").select("*").eq("id", transaction_id).eq(
        "delivery_user_id", user_id
    ).eq("status", "ondeliver").execute()

    if not txn.data:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")

    # Update status
    sb.table("product_transactions").update({"status": req.status}).eq("id", transaction_id).execute()

    # If delivered, create earnings entry and add to wallet
    if req.status == "delivered":
        fee = float(txn.data[0].get("delivery_fee", DELIVERY_FEE))
        sb.table("delivery_earnings").insert({
            "delivery_user_id": user_id,
            "transaction_id": transaction_id,
            "amount": fee,
        }).execute()

        # Add to delivery user's balance
        bal = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
        if bal.data:
            new_bal = float(bal.data[0]["balance"]) + fee
            sb.table("user_balances").update({"balance": new_bal}).eq("user_id", user_id).execute()

    status_msg = "delivered" if req.status == "delivered" else "marked as undelivered"
    return {"message": f"Order {status_msg} successfully!"}


@router.get("/earnings", response_model=EarningsResponse)
async def get_earnings(delivery_user: dict = Depends(require_delivery)):
    """Get delivery earnings with daily/weekly/monthly breakdowns for graphs."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    # Get all earnings
    earnings = sb.table("delivery_earnings").select("*").eq(
        "delivery_user_id", user_id
    ).order("created_at", desc=True).execute()

    # Get wallet balance
    bal = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
    wallet_balance = float(bal.data[0]["balance"]) if bal.data else 0.0

    all_data = earnings.data or []
    total_earnings = sum(float(e["amount"]) for e in all_data)
    total_deliveries = len(all_data)

    # Build time-series data
    daily_data = {}
    weekly_data = {}
    monthly_data = {}

    for e in all_data:
        try:
            dt = datetime.fromisoformat(e["created_at"].replace("Z", "+00:00"))
            day_key = dt.strftime("%Y-%m-%d")
            # ISO week
            week_start = dt - timedelta(days=dt.weekday())
            week_key = week_start.strftime("%Y-%m-%d")
            month_key = dt.strftime("%Y-%m")
        except Exception:
            day_key = e["created_at"][:10]
            week_key = e["created_at"][:10]
            month_key = e["created_at"][:7]

        amt = float(e["amount"])

        if day_key not in daily_data:
            daily_data[day_key] = {"amount": 0, "count": 0}
        daily_data[day_key]["amount"] += amt
        daily_data[day_key]["count"] += 1

        if week_key not in weekly_data:
            weekly_data[week_key] = {"amount": 0, "count": 0}
        weekly_data[week_key]["amount"] += amt
        weekly_data[week_key]["count"] += 1

        if month_key not in monthly_data:
            monthly_data[month_key] = {"amount": 0, "count": 0}
        monthly_data[month_key]["amount"] += amt
        monthly_data[month_key]["count"] += 1

    def to_list(data):
        return sorted(
            [EarningsDay(date=k, amount=round(v["amount"], 2), count=v["count"]) for k, v in data.items()],
            key=lambda x: x.date, reverse=True
        )[:30]

    return EarningsResponse(
        total_earnings=round(total_earnings, 2),
        total_deliveries=total_deliveries,
        wallet_balance=round(wallet_balance, 2),
        daily=to_list(daily_data),
        weekly=to_list(weekly_data),
        monthly=to_list(monthly_data),
        daily_delivery_count=to_list(daily_data),
        weekly_delivery_count=to_list(weekly_data),
        monthly_delivery_count=to_list(monthly_data),
    )


@router.get("/history", response_model=list[DeliveryHistoryItem])
async def get_delivery_history(delivery_user: dict = Depends(require_delivery)):
    """Get delivery history with product and user details."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    txns = sb.table("product_transactions").select(
        "*, products(title, price, images)"
    ).eq("delivery_user_id", user_id).in_(
        "status", ["delivered", "undelivered", "ondeliver"]
    ).order("created_at", desc=True).limit(100).execute()

    if not txns.data:
        return []

    # Get user names + contacts
    user_ids = set()
    for t in txns.data:
        user_ids.add(t["buyer_id"])
        user_ids.add(t["seller_id"])

    users_result = sb.table("users").select("id, full_name").in_("id", list(user_ids)).execute()
    user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    contacts_result = sb.table("user_contacts").select("user_id, contact_number").in_(
        "user_id", list(user_ids)
    ).execute()
    user_contacts = {c["user_id"]: c["contact_number"] for c in (contacts_result.data or [])}

    return [
        DeliveryHistoryItem(
            transaction_id=t["id"],
            product_title=(t.get("products") or {}).get("title", ""),
            product_price=float((t.get("products") or {}).get("price", 0)),
            product_images=(t.get("products") or {}).get("images", []),
            quantity=int(t.get("quantity", 1)),
            delivery_fee=float(t.get("delivery_fee", DELIVERY_FEE)),
            status=t["status"],
            buyer_name=user_names.get(t["buyer_id"], "Unknown"),
            buyer_contact=user_contacts.get(t["buyer_id"], "N/A"),
            seller_name=user_names.get(t["seller_id"], "Unknown"),
            delivery_address=t.get("delivery_address", ""),
            created_at=t["created_at"],
        )
        for t in txns.data
    ]


@router.post("/withdraw")
async def withdraw_earnings(req: WithdrawRequest, delivery_user: dict = Depends(require_delivery)):
    """Withdraw earnings from delivery wallet."""
    sb = get_supabase()
    user_id = delivery_user["sub"]

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    bal = sb.table("user_balances").select("balance").eq("user_id", user_id).execute()
    if not bal.data:
        raise HTTPException(status_code=404, detail="Balance not found")

    current = float(bal.data[0]["balance"])
    if current < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    new_bal = current - req.amount
    sb.table("user_balances").update({"balance": new_bal}).eq("user_id", user_id).execute()

    sb.table("stored_value").insert({
        "user_id": user_id,
        "transaction_type": "withdrawal",
        "amount": req.amount,
    }).execute()

    return {"message": f"Withdrew PHP {req.amount:.2f}", "balance": round(new_bal, 2)}
