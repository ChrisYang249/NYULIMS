from sqlalchemy import Column, String, Integer, Boolean
from app.db.base import Base
from app.models.base import TimestampMixin

class Employee(Base, TimestampMixin):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)