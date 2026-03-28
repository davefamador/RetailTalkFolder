"""
Wishlist routes — buyers can save products to their wishlist.
Also includes a seller-facing report endpoint for wishlist analytics.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_supabase
from routes.auth import get_current_user

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


class AddWishlistRequest(BaseModel):
    product_id: str


class WishlistItemResponse(BaseModel):
    id: str
    product_id: str
    title: str
    description: str
    price: float
    stock: int
    seller_id: str
    seller_name: str
    image_url: str
    created_at: str


# --- Routes ---

@router.get("/", response_model=list[WishlistItemResponse])
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    """Get the current buyer's wishlist with product details."""
    sb = get_supabase()
    user_id = current_user["sub"]

    wishlist_data = sb.table("wishlist_items").select(
        "*, products(id, title, description, price, seller_id, images, stock)"
    ).eq("buyer_id", user_id).order("created_at", desc=True).execute()

    items = []
    seller_name_cache = {}

    for w in (wishlist_data.data or []):
        prod = w.get("products")
        if not prod:
            continue

        sid = prod["seller_id"]
        if sid not in seller_name_cache:
            seller_resp = sb.table("users").select("full_name, department_id").eq("id", sid).execute()
            if seller_resp.data:
                full_name = seller_resp.data[0]["full_name"]
                dept_id = seller_resp.data[0].get("department_id")
                if dept_id:
                    dept_resp = sb.table("departments").select("name").eq("id", dept_id).execute()
                    if dept_resp.data:
                        seller_name_cache[sid] = dept_resp.data[0]["name"]
                    else:
                        seller_name_cache[sid] = full_name
                else:
                    seller_name_cache[sid] = full_name
            else:
                seller_name_cache[sid] = "Seller"

        images = prod.get("images") or []

        items.append(WishlistItemResponse(
            id=w["id"],
            product_id=prod["id"],
            title=prod["title"],
            description=prod.get("description", ""),
            price=float(prod["price"]),
            stock=int(prod.get("stock", 0)),
            seller_id=prod["seller_id"],
            seller_name=seller_name_cache[sid],
            image_url=images[0] if images else "",
            created_at=w["created_at"],
        ))

    return items


@router.post("/add")
async def add_to_wishlist(req: AddWishlistRequest, current_user: dict = Depends(get_current_user)):
    """Add a product to the buyer's wishlist."""
    sb = get_supabase()
    user_id = current_user["sub"]

    # Verify product exists and is active
    prod = sb.table("products").select("id, seller_id").eq("id", req.product_id).eq("is_active", True).eq("status", "approved").execute()
    if not prod.data:
        raise HTTPException(status_code=404, detail="Product not found")

    if prod.data[0]["seller_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot add your own product to wishlist")

    # Check if already in wishlist
    existing = sb.table("wishlist_items").select("id").eq("buyer_id", user_id).eq("product_id", req.product_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Product already in wishlist")

    sb.table("wishlist_items").insert({
        "buyer_id": user_id,
        "product_id": req.product_id,
    }).execute()

    return {"message": "Added to wishlist"}


@router.delete("/remove/{product_id}")
async def remove_from_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a product from the buyer's wishlist."""
    sb = get_supabase()
    sb.table("wishlist_items").delete().eq("buyer_id", current_user["sub"]).eq("product_id", product_id).execute()
    return {"message": "Removed from wishlist"}


@router.get("/check/{product_id}")
async def check_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    """Check if a product is in the buyer's wishlist."""
    sb = get_supabase()
    existing = sb.table("wishlist_items").select("id").eq("buyer_id", current_user["sub"]).eq("product_id", product_id).execute()
    return {"in_wishlist": bool(existing.data)}


@router.get("/seller-report")
async def get_seller_wishlist_report(current_user: dict = Depends(get_current_user)):
    """
    Seller-facing wishlist report.
    Returns wishlist counts for the seller's products and a wishlist-to-product ratio.
    """
    sb = get_supabase()
    user_id = current_user["sub"]

    # Get all seller's products
    products = sb.table("products").select("id, title, images").eq("seller_id", user_id).execute()
    if not products.data:
        return {
            "total_products": 0,
            "total_wishlists": 0,
            "wishlist_per_product": 0,
            "products": [],
        }

    product_ids = [p["id"] for p in products.data]
    product_map = {p["id"]: p for p in products.data}

    # Get all wishlist items for these products
    wishlist_data = sb.table("wishlist_items").select("product_id").in_("product_id", product_ids).execute()

    # Count wishlists per product
    wishlist_counts = {}
    for w in (wishlist_data.data or []):
        pid = w["product_id"]
        wishlist_counts[pid] = wishlist_counts.get(pid, 0) + 1

    total_wishlists = sum(wishlist_counts.values())
    total_products = len(products.data)

    product_details = []
    for p in products.data:
        count = wishlist_counts.get(p["id"], 0)
        images = p.get("images") or []
        product_details.append({
            "product_id": p["id"],
            "title": p["title"],
            "image_url": images[0] if images else "",
            "wishlist_count": count,
        })

    # Sort by wishlist count descending
    product_details.sort(key=lambda x: x["wishlist_count"], reverse=True)

    return {
        "total_products": total_products,
        "total_wishlists": total_wishlists,
        "wishlist_per_product": round(total_wishlists / total_products, 2) if total_products > 0 else 0,
        "products": product_details,
    }
