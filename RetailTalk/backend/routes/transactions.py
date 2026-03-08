"""
Transaction routes — buy products, view transaction history, manage balance.
Revenue split: 90% to seller, 10% admin commission.
Supports quantity (buyer selects how many to buy).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from routes.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

SELLER_SHARE = 0.90
ADMIN_SHARE = 0.10


# --- Request/Response Models ---

class BuyRequest(BaseModel):
    product_id: str
    quantity: int = 1  # How many items to buy


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
    status: str
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
    Buy a product. Revenue split: 90% seller, 10% admin commission.
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
    if user_role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can purchase products")

    # 2. Get product
    product_result = sb.table("products").select("*").eq("id", req.product_id).eq("is_active", True).execute()
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

    if buyer_balance < total_price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. You have PHP {buyer_balance:.2f}, total cost is PHP {total_price:.2f}",
        )

    # 6. Calculate revenue split
    seller_amount = round(total_price * SELLER_SHARE, 2)
    admin_commission = round(total_price * ADMIN_SHARE, 2)

    # 7. Deduct from buyer
    new_buyer_balance = buyer_balance - total_price
    sb.table("user_balances").update({"balance": new_buyer_balance}).eq("user_id", user_id).execute()

    # 7b. Record SVF withdrawal (purchase reduces balance)
    sb.table("stored_value").insert({
        "user_id": user_id,
        "transaction_type": "withdrawal",
        "amount": total_price,
    }).execute()

    # 8. Add 90% to seller
    seller_balance_result = sb.table("user_balances").select("balance").eq("user_id", product["seller_id"]).execute()
    if seller_balance_result.data:
        new_seller_balance = float(seller_balance_result.data[0]["balance"]) + seller_amount
        sb.table("user_balances").update({"balance": new_seller_balance}).eq("user_id", product["seller_id"]).execute()

    # 9. Add 10% to admin balance
    admin_result = sb.table("users").select("id").eq("role", "admin").limit(1).execute()
    if admin_result.data:
        admin_id = admin_result.data[0]["id"]
        admin_bal_result = sb.table("user_balances").select("balance").eq("user_id", admin_id).execute()
        if admin_bal_result.data:
            new_admin_bal = float(admin_bal_result.data[0]["balance"]) + admin_commission
            sb.table("user_balances").update({"balance": new_admin_bal}).eq("user_id", admin_id).execute()

    # 10. Decrement stock
    new_stock = current_stock - req.quantity
    sb.table("products").update({"stock": new_stock}).eq("id", req.product_id).execute()

    # 11. Create product_transaction record
    txn_result = sb.table("product_transactions").insert({
        "buyer_id": user_id,
        "seller_id": product["seller_id"],
        "product_id": req.product_id,
        "quantity": req.quantity,
        "amount": total_price,
        "seller_amount": seller_amount,
        "admin_commission": admin_commission,
        "status": "completed",
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
        status=txn["status"],
        created_at=txn["created_at"],
    )


@router.get("/history", response_model=list[TransactionResponse])
async def get_transaction_history(current_user: dict = Depends(get_current_user)):
    """Get all transactions for the current user (as buyer or seller)."""
    sb = get_supabase()
    user_id = current_user["sub"]

    bought = sb.table("product_transactions").select("*, products(title)").eq("buyer_id", user_id).order("created_at", desc=True).execute()
    sold = sb.table("product_transactions").select("*, products(title)").eq("seller_id", user_id).order("created_at", desc=True).execute()

    all_txns = (bought.data or []) + (sold.data or [])
    seen = set()
    unique_txns = []
    for t in all_txns:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique_txns.append(t)

    unique_txns.sort(key=lambda t: t["created_at"], reverse=True)

    return [
        TransactionResponse(
            id=t["id"],
            buyer_id=t["buyer_id"],
            seller_id=t["seller_id"],
            product_id=t["product_id"],
            product_title=t.get("products", {}).get("title", "") if t.get("products") else "",
            amount=float(t["amount"]),
            quantity=int(t.get("quantity", 1)),
            seller_amount=float(t.get("seller_amount", 0)),
            admin_commission=float(t.get("admin_commission", 0)),
            status=t["status"],
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
