from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, Employee as EmployeeSchema

router = APIRouter()

@router.get("/", response_model=List[EmployeeSchema])
def read_employees(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Retrieve employees"""
    employees = db.query(Employee).offset(skip).limit(limit).all()
    return employees

@router.post("/", response_model=EmployeeSchema)
def create_employee(
    *,
    db: Session = Depends(deps.get_db),
    employee_in: EmployeeCreate,
):
    """Create new employee"""
    employee = Employee(**employee_in.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

@router.get("/{employee_id}", response_model=EmployeeSchema)
def read_employee(
    *,
    db: Session = Depends(deps.get_db),
    employee_id: int,
):
    """Get employee by ID"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.put("/{employee_id}", response_model=EmployeeSchema)
def update_employee(
    *,
    db: Session = Depends(deps.get_db),
    employee_id: int,
    employee_in: EmployeeUpdate,
):
    """Update employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for field, value in employee_in.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

@router.delete("/{employee_id}")
def delete_employee(
    *,
    db: Session = Depends(deps.get_db),
    employee_id: int,
):
    """Deactivate employee (soft delete)"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = False
    db.add(employee)
    db.commit()
    return {"message": "Employee deactivated successfully"}
