"""
Role-based permissions for API endpoints
Centralized configuration for easy management
"""
from typing import List, Optional
from fastapi import HTTPException, Depends
from app.api.deps import get_current_user
from app.models import User

# Define role hierarchies and permissions
# TODO: Update these based on your organizational structure
ROLE_PERMISSIONS = {
    # Sample queue permissions
    "accessioning_queue": ["super_admin", "accessioner", "lab_manager", "director"],
    "extraction_queue": ["super_admin", "lab_tech", "lab_manager", "director"],
    "extraction_active": ["super_admin", "lab_tech", "lab_manager", "director"],
    "library_prep_queue": ["super_admin", "lab_tech", "lab_manager", "director"],
    "library_prep_active": ["super_admin", "lab_tech", "lab_manager", "director"],
    "sequencing_queue": ["super_admin", "lab_tech", "lab_manager", "director"],
    "sequencing_active": ["super_admin", "lab_tech", "lab_manager", "director"],
    "reprocess_queue": ["super_admin", "lab_manager", "director"],
    
    # Sample actions
    "register_samples": ["super_admin", "pm", "lab_manager", "director"],
    "accession_samples": ["super_admin", "accessioner", "lab_manager", "director"],
    "fail_samples": ["super_admin", "lab_tech", "lab_manager", "director"],
    "update_sample_status": ["super_admin", "lab_tech", "lab_manager", "director"],
    "edit_samples": ["super_admin", "lab_manager", "director"],
    "delete_samples": ["super_admin", "director"],
    
    # Project permissions
    "create_projects": ["super_admin", "pm", "director"],
    "edit_projects": ["super_admin", "pm", "director"],
    "delete_projects": ["super_admin", "director"],
    "view_all_projects": ["super_admin", "pm", "lab_manager", "director", "sales"],
    
    # User management
    "manage_users": ["super_admin"],
    "view_users": ["super_admin", "director"],
    
    # Storage management
    "manage_storage": ["super_admin", "lab_manager", "director"],
    "view_storage": ["super_admin", "lab_tech", "lab_manager", "director"],
    
    # Audit logs
    "view_audit_logs": ["super_admin", "director"],
}

def require_permission(permission: str):
    """
    Dependency to require specific permission for an endpoint
    
    Usage:
        @router.get("/protected")
        def protected_endpoint(
            current_user: User = Depends(require_permission("view_protected"))
        ):
            return {"message": "Access granted"}
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        allowed_roles = ROLE_PERMISSIONS.get(permission, [])
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required permission: {permission}"
            )
        
        return current_user
    
    return permission_checker

def require_any_role(roles: List[str]):
    """
    Dependency to require any of the specified roles
    
    Usage:
        @router.get("/protected")
        def protected_endpoint(
            current_user: User = Depends(require_any_role(["admin", "manager"]))
        ):
            return {"message": "Access granted"}
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        
        return current_user
    
    return role_checker

def check_permission(user: User, permission: str) -> bool:
    """
    Check if a user has a specific permission
    
    Args:
        user: The user object
        permission: The permission to check
    
    Returns:
        bool: True if user has permission, False otherwise
    """
    allowed_roles = ROLE_PERMISSIONS.get(permission, [])
    return user.role in allowed_roles

def get_user_permissions(user: User) -> List[str]:
    """
    Get all permissions for a user based on their role
    
    Args:
        user: The user object
    
    Returns:
        List[str]: List of permission names the user has
    """
    permissions = []
    for permission, allowed_roles in ROLE_PERMISSIONS.items():
        if user.role in allowed_roles:
            permissions.append(permission)
    
    return permissions

# Convenience functions for common checks
def is_lab_personnel(user: User) -> bool:
    """Check if user is any type of lab personnel"""
    return user.role in ["lab_tech", "lab_manager", "director", "super_admin"]

def is_management(user: User) -> bool:
    """Check if user is in management"""
    return user.role in ["lab_manager", "director", "super_admin", "pm"]

def is_admin(user: User) -> bool:
    """Check if user is admin or super admin"""
    return user.role in ["super_admin", "director"]

def can_edit_samples(user: User) -> bool:
    """Check if user can edit samples"""
    return check_permission(user, "edit_samples")

def can_fail_samples(user: User) -> bool:
    """Check if user can mark samples as failed"""
    return check_permission(user, "fail_samples")