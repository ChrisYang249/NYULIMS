# LIMS System

A CFR Part 11 compliant Laboratory Information Management System for tracking samples through DNA sequencing workflows.

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup
```bash
cd lims-system/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create database
createdb lims_db

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run server
uvicorn app.main:app --reload
```

API docs available at: http://localhost:8000/docs

### Frontend Setup
```bash
cd lims-system/frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173

### Create Initial Admin User
After starting the backend, run this Python script:

```python
from app.db.base import SessionLocal
from app.crud.user import create_user

db = SessionLocal()
user_data = {
    "email": "admin@lims.com",
    "username": "admin",
    "full_name": "Admin User",
    "role": "super_admin",
    "password": "Admin123!"
}
create_user(db, user_data)
```

## Features

- **Project Management**: Track projects from quote to delivery
- **Sample Tracking**: Barcode-based sample management with full chain of custody
- **Workflow Management**: Extraction and library prep planning with 96-well plate layouts
- **Sequencing Run Planning**: Track runs, yields, and QC metrics
- **CFR Part 11 Compliance**: 
  - Electronic signatures
  - Complete audit trails
  - Password policies
  - Session management
- **Role-Based Access**: Different permissions for PM, Lab, BIS teams

## User Roles

- **Super Admin**: Full system access
- **Project Manager**: Create/manage projects and client data
- **Accessioner**: Receive and accession samples
- **Lab Tech**: Execute extraction and prep plans
- **Lab Manager**: Assign work, approve results
- **BIS Analyst**: Process sequencing data
- **Director**: View reports and approve critical steps

## Sample Workflow

1. **Project Creation** (PM)
2. **Sample Registration** (PM)
3. **Sample Accessioning** (Accessioner)
4. **DNA Extraction** (Lab Tech)
5. **Library Preparation** (Lab Tech)
6. **Sequencing** (Lab Tech)
7. **Data Analysis** (BIS Analyst)
8. **Delivery** (PM)

## Next Steps

The MVP is ready for testing. Key areas to expand:

1. File upload for quotes/submission forms
2. Extraction and prep plan creation UI
3. Sequencing run planning interface
4. Report generation
5. Client portal
6. Instrument integrations