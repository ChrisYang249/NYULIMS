from fastapi import APIRouter
from app.api.api_v1.endpoints import dashboard_simple, clients, employees, deletion_logs, products_simple, blockers_simple

api_router = APIRouter()


api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(deletion_logs.router, prefix="/deletion-logs", tags=["deletion logs"])
api_router.include_router(dashboard_simple.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(products_simple.router, prefix="/products", tags=["products"])
api_router.include_router(blockers_simple.router, prefix="/blockers", tags=["blockers"])