from fastapi import APIRouter
from app.api.api_v1.endpoints import products_simple, blockers_simple

api_router = APIRouter()


api_router.include_router(products_simple.router, prefix="/products", tags=["products"])
api_router.include_router(blockers_simple.router, prefix="/blockers", tags=["blockers"])