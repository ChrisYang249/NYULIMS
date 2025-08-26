from fastapi import APIRouter
from app.api.api_v1.endpoints import dashboard, clients, employees, deletion_logs, products_simple, blockers

api_router = APIRouter()


api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(deletion_logs.router, prefix="/deletion-logs", tags=["deletion logs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(products_simple.router, prefix="/products", tags=["products"])
api_router.include_router(blockers.router, prefix="/blockers", tags=["blockers"])