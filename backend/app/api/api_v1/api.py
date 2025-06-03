from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, users, projects, samples, dashboard, clients, employees, sample_types, deletion_logs, extraction_plates

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(samples.router, prefix="/samples", tags=["samples"])
api_router.include_router(sample_types.router, prefix="/sample-types", tags=["sample types"])
api_router.include_router(deletion_logs.router, prefix="/deletion-logs", tags=["deletion logs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(extraction_plates.router, prefix="/extraction-plates", tags=["extraction plates"])