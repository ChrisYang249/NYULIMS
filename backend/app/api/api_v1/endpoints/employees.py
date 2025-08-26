from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User, Employee
from app.schemas.employee import Employee as EmployeeSchema, EmployeeCreate, EmployeeUpdate

router = APIRouter()

@router.get("/", response_model=List[EmployeeSchema])
def read_employees(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve employees"""
    employees = db.query(Employee).filter(Employee.is_active == True).offset(skip).limit(limit).all()
    return employees

@router.post("/", response_model=EmployeeSchema)
def create_employee(
    *,
    db: Session = Depends(deps.get_db),
    employee_in: EmployeeCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new employee"""
    # Check if user has admin privileges
    if current_user.role not in ["super_admin", "director"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create employees"
        )
    
    # Check if email already exists
    existing = db.query(Employee).filter(Employee.email == employee_in.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An employee with this email already exists"
        )
    
    employee = Employee(**employee_in.dict())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

@router.get("/{employee_id}", response_model=EmployeeSchema)
def read_employee(
    employee_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get employee by ID"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.put("/{employee_id}", response_model=EmployeeSchema)
def update_employee(
    employee_id: int,
    *,
    db: Session = Depends(deps.get_db),
    employee_in: EmployeeUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update employee"""
    # Check if user has admin privileges
    if current_user.role not in ["super_admin", "director"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update employees"
        )
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if email is being changed and if it already exists
    if employee_in.email and employee_in.email != employee.email:
        existing = db.query(Employee).filter(Employee.email == employee_in.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="An employee with this email already exists"
            )
    
    update_data = employee_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Deactivate employee (soft delete)"""
    # Check if user has admin privileges
    if current_user.role not in ["super_admin", "director"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete employees"
        )
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = False
    db.add(employee)
    db.commit()
    
    return {"message": "Employee deactivated successfully"}