"""
Authentication routes — register, login, get current user.
Uses JWT tokens and bcrypt password hashing.
Roles: buyer, seller, admin
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from database import get_supabase
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


# --- Request/Response Models ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "buyer"  # buyer or seller only


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_banned: bool = False
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- JWT Helpers ---

def create_token(user_id: str, email: str, role: str = "buyer") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency that verifies JWT token and returns the payload."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Dependency alias for use in other routes
get_current_user = verify_token


# --- Routes ---

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    """Register a new user account. Role must be 'buyer' or 'seller'."""
    # Validate role
    if req.role not in ("buyer", "seller"):
        raise HTTPException(status_code=400, detail="Role must be 'buyer' or 'seller'")

    sb = get_supabase()

    # Check if email already exists
    existing = sb.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Create user
    result = sb.table("users").insert({
        "email": req.email,
        "password_hash": password_hash,
        "full_name": req.full_name,
        "role": req.role,
        "is_banned": False,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = result.data[0]

    # Create initial balance (0.00)
    sb.table("user_balances").insert({
        "user_id": user["id"],
        "balance": 0.00,
    }).execute()

    # Generate token
    token = create_token(user["id"], user["email"], role=user["role"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            is_banned=False,
            created_at=user["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Login with email and password."""
    sb = get_supabase()

    result = sb.table("users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    # Check if user is banned
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account has been banned. Contact admin for support.")

    # Verify password
    if not bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"], role=user["role"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            is_banned=user.get("is_banned", False),
            created_at=user["created_at"],
        ),
    )


# Admin login endpoint
@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(req: LoginRequest):
    """Login as admin. Only users with role='admin' can login here."""
    sb = get_supabase()

    result = sb.table("users").select("*").eq("email", req.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="This account is not an admin")

    if not bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"], role="admin")

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role="admin",
            is_banned=user.get("is_banned", False),
            created_at=user["created_at"],
        ),
    )


# Admin registration (only if no admin exists yet)
@router.post("/admin/register", response_model=TokenResponse)
async def admin_register(req: RegisterRequest):
    """Register as admin. Only works if no admin exists yet."""
    sb = get_supabase()

    # Check if an admin already exists
    existing_admin = sb.table("users").select("id").eq("role", "admin").execute()
    if existing_admin.data:
        raise HTTPException(status_code=400, detail="Admin account already exists. Contact the existing admin.")

    # Check if email already exists
    existing = sb.table("users").select("id").eq("email", req.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    result = sb.table("users").insert({
        "email": req.email,
        "password_hash": password_hash,
        "full_name": req.full_name,
        "role": "admin",
        "is_banned": False,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create admin account")

    user = result.data[0]

    sb.table("user_balances").insert({
        "user_id": user["id"],
        "balance": 0.00,
    }).execute()

    token = create_token(user["id"], user["email"], role="admin")

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role="admin",
            is_banned=False,
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current logged-in user's profile."""
    sb = get_supabase()
    result = sb.table("users").select("*").eq("id", current_user["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        is_banned=user.get("is_banned", False),
        created_at=user["created_at"],
    )
