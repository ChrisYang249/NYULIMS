from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, dashboard, clients, employees, deletion_logs, products, blockers, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(deletion_logs.router, prefix="/deletion-logs", tags=["deletion logs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(blockers.router, prefix="/blockers", tags=["blockers"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])