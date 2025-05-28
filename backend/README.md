# LIMS Backend

## Setup

1. Create a PostgreSQL database:
```bash
createdb lims_db
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy .env.example to .env and update values:
```bash
cp .env.example .env
```

5. Run the server:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000
API documentation at http://localhost:8000/docs

## Creating initial super admin

Run this in Python after starting the server:
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