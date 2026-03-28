"""
Manager routes — department management, staff CRUD, restock approval.
Only accessible by manager users (role='manager').
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from routes.auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/manager", tags=["Manager"])


# --- Helpers ---

async def require_manager(current_user: dict = Depends(get_current_user)):
    """Dependency that ensures the current user is a manager."""
    sb = get_supabase()
    result = sb.table("users").select("role, department_id").eq("id", current_user["sub"]).execute()
    if not result.data or result.data[0].get("role") != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    current_user["department_id"] = result.data[0].get("department_id")
    return current_user


# --- Request/Response Models ---

class StaffRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    contact_number: str = ""


class RestockApproveRequest(BaseModel):
    approved_quantity: Optional[int] = None
    manager_notes: str = ""


class RestockRejectRequest(BaseModel):
    manager_notes: str = ""


# --- Routes ---

@router.get("/dashboard")
async def manager_dashboard(manager: dict = Depends(require_manager)):
    """Get manager dashboard stats for their department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    # Department info
    dept = sb.table("departments").select("*").eq("id", dept_id).execute()
    dept_info = dept.data[0] if dept.data else {}

    # Staff count
    staff = sb.table("users").select("id", count="exact").eq("department_id", dept_id).eq("role", "seller").execute()

    # Products in department (via staff + manager themselves)
    staff_ids_result = sb.table("users").select("id").eq("department_id", dept_id).eq("role", "seller").execute()
    staff_ids = [s["id"] for s in (staff_ids_result.data or [])]
    manager_id = manager["sub"]
    if manager_id not in staff_ids:
        staff_ids.append(manager_id)

    total_products = 0
    total_revenue = 0
    daily_sales = {}
    weekly_sales = {}
    monthly_sales = {}

    if staff_ids:
        products = sb.table("products").select("id", count="exact").in_("seller_id", staff_ids).execute()
        total_products = products.count or 0

        # Revenue from transactions
        txns = sb.table("product_transactions").select("amount, seller_amount, created_at, purchase_type").in_(
            "seller_id", staff_ids
        ).in_("status", ["delivered", "completed"]).execute()

        for t in (txns.data or []):
            amt = float(t.get("seller_amount", 0))
            total_revenue += amt

            try:
                dt = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
                day_key = dt.strftime("%Y-%m-%d")
                week_start = dt - timedelta(days=dt.weekday())
                week_key = week_start.strftime("%Y-%m-%d")
                month_key = dt.strftime("%Y-%m")
            except Exception:
                day_key = t["created_at"][:10]
                week_key = t["created_at"][:10]
                month_key = t["created_at"][:7]

            for data, key in [(daily_sales, day_key), (weekly_sales, week_key), (monthly_sales, month_key)]:
                if key not in data:
                    data[key] = {"amount": 0, "count": 0}
                data[key]["amount"] += amt
                data[key]["count"] += 1

    def to_list(data):
        return sorted(
            [{"date": k, "amount": round(v["amount"], 2), "count": v["count"]} for k, v in data.items()],
            key=lambda x: x["date"], reverse=True
        )[:30]

    # Pending restock requests
    pending_restocks = sb.table("restock_requests").select("id", count="exact").eq(
        "department_id", dept_id
    ).eq("status", "pending_manager").execute()

    return {
        "department": dept_info,
        "total_staff": staff.count or 0,
        "total_products": total_products,
        "total_revenue": round(total_revenue, 2),
        "pending_restocks": pending_restocks.count or 0,
        "daily_sales": to_list(daily_sales),
        "weekly_sales": to_list(weekly_sales),
        "monthly_sales": to_list(monthly_sales),
    }


@router.get("/staff")
async def list_staff(
    search: str = Query("", description="Search by name or email"),
    manager: dict = Depends(require_manager),
):
    """List all staff in the manager's department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    query = sb.table("users").select("*").eq(
        "department_id", dept_id
    ).eq("role", "seller")

    if search:
        query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")

    result = query.order("created_at", desc=True).execute()

    staff_list = []
    for u in (result.data or []):
        staff_list.append({
            "id": u["id"],
            "email": u["email"],
            "full_name": u["full_name"],
            "role": u["role"],
            "is_banned": u.get("is_banned", False),
            "created_at": u["created_at"],
        })

    return staff_list


@router.post("/staff/register")
async def register_staff(req: StaffRegisterRequest, manager: dict = Depends(require_manager)):
    """Manager creates a new staff (seller) account in their department."""
    import bcrypt
    import traceback

    try:
        sb = get_supabase()
        dept_id = manager.get("department_id")
        manager_id = manager["sub"]

        if not dept_id:
            raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

        # Check unique email
        existing_email = sb.table("users").select("id").eq("email", req.email).execute()
        if existing_email.data:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check unique full_name
        existing_name = sb.table("users").select("id").eq("full_name", req.full_name).execute()
        if existing_name.data:
            raise HTTPException(status_code=400, detail="Full name already taken")

        # Check unique contact_number if provided
        if req.contact_number:
            existing_contact = sb.table("user_contacts").select("user_id").eq("contact_number", req.contact_number).execute()
            if existing_contact.data:
                raise HTTPException(status_code=400, detail="Contact number already registered")

        # Hash password
        password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Create user with seller role and department assignment
        result = sb.table("users").insert({
            "email": req.email,
            "password_hash": password_hash,
            "full_name": req.full_name,
            "role": "seller",
            "is_banned": False,
            "department_id": dept_id,
            "manager_id": manager_id,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create staff user")

        user = result.data[0]

        # Create contact if provided
        if req.contact_number:
            sb.table("user_contacts").insert({"user_id": user["id"], "contact_number": req.contact_number}).execute()

        return {
            "message": "Staff registered successfully",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": "seller",
                "department_id": dept_id,
                "contact_number": req.contact_number,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[StaffRegister] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/staff/{user_id}/detail")
async def get_staff_detail(user_id: str, manager: dict = Depends(require_manager)):
    """Get detailed info about a staff member in the manager's department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    # Verify staff belongs to manager's department
    user_resp = sb.table("users").select("*, user_contacts(contact_number)").eq("id", user_id).execute()
    if not user_resp.data:
        raise HTTPException(status_code=404, detail="User not found")

    u = user_resp.data[0]
    if u.get("department_id") != dept_id:
        raise HTTPException(status_code=403, detail="This user is not in your department")

    contact = ""
    if u.get("user_contacts"):
        if isinstance(u["user_contacts"], list) and len(u["user_contacts"]) > 0:
            contact = u["user_contacts"][0].get("contact_number", "")
        elif isinstance(u["user_contacts"], dict):
            contact = u["user_contacts"].get("contact_number", "")

    # Transactions
    sold = sb.table("product_transactions").select("*, products(title)").eq("seller_id", user_id).order("created_at", desc=True).limit(50).execute()

    transactions = []
    daily_data = {}
    monthly_data = {}
    for t in (sold.data or []):
        amt = float(t["amount"])
        transactions.append({
            "id": t["id"],
            "product_title": (t.get("products") or {}).get("title", ""),
            "amount": amt,
            "quantity": int(t.get("quantity", 1)),
            "status": t["status"],
            "purchase_type": t.get("purchase_type", "delivery"),
            "created_at": t["created_at"],
        })

        try:
            dt = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            day_key = dt.strftime("%Y-%m-%d")
            month_key = dt.strftime("%Y-%m")
        except Exception:
            day_key = t["created_at"][:10]
            month_key = t["created_at"][:7]

        for data, key in [(daily_data, day_key), (monthly_data, month_key)]:
            if key not in data:
                data[key] = {"amount": 0, "count": 0}
            data[key]["amount"] += amt
            data[key]["count"] += 1

    daily = sorted(
        [{"date": k, "amount": round(v["amount"], 2), "count": v["count"]} for k, v in daily_data.items()],
        key=lambda x: x["date"], reverse=True
    )[:30]

    monthly = sorted(
        [{"date": k, "amount": round(v["amount"], 2), "count": v["count"]} for k, v in monthly_data.items()],
        key=lambda x: x["date"], reverse=True
    )[:12]

    # Products
    prods = sb.table("products").select("id, title, price, stock, images, is_active, created_at").eq("seller_id", user_id).order("created_at", desc=True).limit(50).execute()
    products = [
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
        "products": products,
    }


# --- Restock Approval ---

@router.get("/restock-requests")
async def get_restock_requests(
    status: str = Query("pending_manager", description="Filter by status"),
    manager: dict = Depends(require_manager),
):
    """Get restock requests for the manager's department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    query = sb.table("restock_requests").select(
        "*, products(title, price, stock, images)"
    ).eq("department_id", dept_id)

    if status:
        query = query.eq("status", status)

    requests = query.order("created_at", desc=True).execute()

    # Get staff names
    staff_ids = set(r["staff_id"] for r in (requests.data or []))
    staff_names = {}
    if staff_ids:
        users_result = sb.table("users").select("id, full_name").in_("id", list(staff_ids)).execute()
        staff_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    results = []
    for r in (requests.data or []):
        prod = r.get("products") or {}
        results.append({
            "id": r["id"],
            "staff_id": r["staff_id"],
            "staff_name": staff_names.get(r["staff_id"], "Unknown"),
            "product_id": r["product_id"],
            "product_title": prod.get("title", ""),
            "product_images": prod.get("images", []),
            "product_price": float(prod.get("price", 0)),
            "current_stock": int(prod.get("stock", 0)),
            "requested_quantity": r["requested_quantity"],
            "approved_quantity": r.get("approved_quantity"),
            "notes": r.get("notes", ""),
            "manager_notes": r.get("manager_notes", ""),
            "status": r["status"],
            "created_at": r["created_at"],
        })

    return results


@router.put("/restock-requests/{request_id}/approve")
async def approve_restock(
    request_id: str,
    req: RestockApproveRequest,
    manager: dict = Depends(require_manager),
):
    """Approve a restock request. Moves to deliveryman queue."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    # Verify request belongs to department and is pending
    restock = sb.table("restock_requests").select("*").eq("id", request_id).eq(
        "department_id", dept_id
    ).eq("status", "pending_manager").execute()

    if not restock.data:
        raise HTTPException(status_code=404, detail="Restock request not found or already processed")

    update_data = {
        "status": "approved_manager",
        "manager_approved_at": datetime.now(timezone.utc).isoformat(),
        "manager_notes": req.manager_notes,
    }

    if req.approved_quantity is not None:
        update_data["approved_quantity"] = req.approved_quantity
    else:
        update_data["approved_quantity"] = restock.data[0]["requested_quantity"]

    sb.table("restock_requests").update(update_data).eq("id", request_id).execute()

    return {"message": "Restock request approved and moved to delivery queue"}


@router.put("/restock-requests/{request_id}/reject")
async def reject_restock(
    request_id: str,
    req: RestockRejectRequest,
    manager: dict = Depends(require_manager),
):
    """Reject a restock request."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    restock = sb.table("restock_requests").select("*").eq("id", request_id).eq(
        "department_id", dept_id
    ).eq("status", "pending_manager").execute()

    if not restock.data:
        raise HTTPException(status_code=404, detail="Restock request not found or already processed")

    sb.table("restock_requests").update({
        "status": "rejected_manager",
        "manager_notes": req.manager_notes,
    }).eq("id", request_id).execute()

    return {"message": "Restock request rejected"}


# --- Department Products & Transactions ---

@router.get("/products")
async def list_department_products(
    search: str = Query("", description="Search by product title"),
    manager: dict = Depends(require_manager),
):
    """List all products from staff in the manager's department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    # Get all staff in department + the manager themselves (managers create products)
    staff_result = sb.table("users").select("id, full_name").eq("department_id", dept_id).eq("role", "seller").execute()
    staff_ids = [s["id"] for s in (staff_result.data or [])]
    staff_names = {s["id"]: s["full_name"] for s in (staff_result.data or [])}

    # Include manager's own products (managers create products with their own ID as seller_id)
    manager_id = manager["sub"]
    if manager_id not in staff_ids:
        staff_ids.append(manager_id)
        # Get manager's name for display
        mgr_user = sb.table("users").select("full_name").eq("id", manager_id).execute()
        if mgr_user.data:
            staff_names[manager_id] = mgr_user.data[0]["full_name"]

    if not staff_ids:
        return []

    query = sb.table("products").select("*").in_("seller_id", staff_ids).order("created_at", desc=True)

    if search:
        query = query.ilike("title", f"%{search}%")

    result = query.execute()

    return [
        {
            "id": p["id"],
            "title": p["title"],
            "description": p.get("description", ""),
            "price": float(p["price"]),
            "stock": int(p.get("stock", 0)),
            "images": p.get("images") or [],
            "is_active": p.get("is_active", True),
            "status": p.get("status", "pending"),
            "seller_id": p["seller_id"],
            "seller_name": staff_names.get(p["seller_id"], "Unknown"),
            "created_at": p["created_at"],
        }
        for p in (result.data or [])
    ]


@router.get("/transactions")
async def list_department_transactions(
    search: str = Query("", description="Search by buyer or product"),
    manager: dict = Depends(require_manager),
):
    """List all transactions from staff in the manager's department."""
    sb = get_supabase()
    dept_id = manager.get("department_id")

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    # Get all staff in department + manager themselves
    staff_result = sb.table("users").select("id, full_name").eq("department_id", dept_id).eq("role", "seller").execute()
    staff_ids = [s["id"] for s in (staff_result.data or [])]

    # Include manager's own ID (managers can create products with their own seller_id)
    manager_id = manager["sub"]
    if manager_id not in staff_ids:
        staff_ids.append(manager_id)

    if not staff_ids:
        return []

    txns = sb.table("product_transactions").select(
        "*, products(title)"
    ).in_("seller_id", staff_ids).order("created_at", desc=True).limit(100).execute()

    # Get buyer names
    buyer_ids = set(t.get("buyer_id") for t in (txns.data or []) if t.get("buyer_id"))
    all_user_ids = buyer_ids | set(staff_ids)
    user_names = {}
    if all_user_ids:
        users_result = sb.table("users").select("id, full_name").in_("id", list(all_user_ids)).execute()
        user_names = {u["id"]: u["full_name"] for u in (users_result.data or [])}

    results = []
    for t in (txns.data or []):
        product_title = (t.get("products") or {}).get("title", "Unknown")
        if search and search.lower() not in product_title.lower() and search.lower() not in user_names.get(t.get("buyer_id"), "").lower():
            continue
        results.append({
            "id": t["id"],
            "buyer_name": user_names.get(t.get("buyer_id"), "Unknown"),
            "seller_name": user_names.get(t.get("seller_id"), "Unknown"),
            "product_title": product_title,
            "quantity": int(t.get("quantity", 1)),
            "amount": float(t.get("amount", 0)),
            "seller_amount": float(t.get("seller_amount", 0)),
            "delivery_fee": float(t.get("delivery_fee", 0)),
            "purchase_type": t.get("purchase_type", "delivery"),
            "status": t.get("status", ""),
            "created_at": t["created_at"],
        })

    return results


# --- Product Removal Request ---

@router.post("/products/{product_id}/request-removal")
async def request_product_removal(product_id: str, manager: dict = Depends(require_manager)):
    """Manager requests removal of a product. Sets status to 'pending_removal' for admin approval."""
    sb = get_supabase()
    dept_id = manager.get("department_id")
    manager_id = manager["sub"]

    if not dept_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a department")

    # Get all staff IDs in this department + manager
    staff_result = sb.table("users").select("id").eq("department_id", dept_id).eq("role", "seller").execute()
    staff_ids = [s["id"] for s in (staff_result.data or [])]
    if manager_id not in staff_ids:
        staff_ids.append(manager_id)

    prod = sb.table("products").select("id, status, seller_id").eq("id", product_id).execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if prod.data[0]["seller_id"] not in staff_ids:
        raise HTTPException(status_code=403, detail="Product does not belong to your department")

    if prod.data[0]["status"] != "approved":
        raise HTTPException(status_code=400, detail="Only approved products can be requested for removal")

    sb.table("products").update({
        "status": "pending_removal",
        "removal_requested_by": manager_id,
        "removal_requested_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", product_id).execute()

    return {"message": "Product removal requested. Awaiting admin approval."}
