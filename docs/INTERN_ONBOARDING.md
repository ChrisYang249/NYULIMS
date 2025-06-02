# LIMS System - Intern Onboarding Guide

**Laboratory Information Management System (LIMS)**  
*Development Environment Setup & Guidelines*

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Setup & Branching](#repository-setup--branching)
4. [Development Environment Setup](#development-environment-setup)
5. [Project Structure](#project-structure)
6. [Development Workflow](#development-workflow)
7. [Feature Development Guidelines](#feature-development-guidelines)
8. [Testing Guidelines](#testing-guidelines)
9. [Key Resources](#key-resources)

---

## System Overview

The LIMS is a comprehensive laboratory management system designed for genomics/DNA sequencing laboratories. It tracks samples through their entire lifecycle from registration to final delivery, ensuring CFR Part 11 compliance for regulatory requirements.

### Core Functionality
- **Sample Management**: Track samples through 18+ workflow states
- **Project Management**: Handle multi-client projects with unique identifiers (CMBP00001 format)
- **Storage Tracking**: Monitor freezer locations and sample positions
- **Extraction Workflow**: Manage 96-well plate extractions with controls
- **Audit Trail**: Complete activity logging for compliance

---

## Technology Stack

### Backend (Python/FastAPI)
```
Framework:    FastAPI 0.104.1
Database:     PostgreSQL 14+
ORM:          SQLAlchemy 2.0
Auth:         python-jose (JWT)
Validation:   Pydantic 2.0
Server:       Uvicorn (ASGI)
Testing:      pytest
```

### Frontend (React/TypeScript)
```
Framework:    React 18.2
Language:     TypeScript 5.2
Build Tool:   Vite 5.0
UI Library:   Ant Design 5.x
State:        Zustand 4.4
HTTP Client:  Axios 1.6
Testing:      Vitest + React Testing Library
```

### Development Tools
```
Version Control:  Git
Package Manager:  npm (frontend), pip (backend)
Database Tool:    pgAdmin or DBeaver
API Testing:      Postman or Thunder Client
IDE:             VS Code (recommended)
```

---

## Repository Setup & Branching

### 1. Clone the Repository

First, the repository owner needs to add you as a collaborator:
1. Go to GitHub repository settings
2. Navigate to "Manage access"
3. Click "Add people" and add intern's GitHub username

Once added, intern can clone:
```bash
# Clone the repository
git clone https://github.com/[owner-username]/[repo-name].git
cd lims-system

# Verify you're on main branch
git branch
```

### 2. Create Your Development Branch

**IMPORTANT**: Always create a feature branch from `main`. Never commit directly to `main`.

```bash
# Ensure you have the latest main branch
git checkout main
git pull origin main

# Create your own development branch
git checkout -b intern/[your-name]/development

# Example:
git checkout -b intern/john-doe/development
```

### 3. Branch Naming Convention

For feature development:
```bash
# Pattern: intern/[your-name]/[feature-name]
git checkout -b intern/john-doe/user-dashboard
git checkout -b intern/john-doe/sample-import-fix
git checkout -b intern/john-doe/add-report-generation
```

### 4. Protecting Your Work

```bash
# Always pull latest changes before starting work
git checkout main
git pull origin main
git checkout intern/[your-name]/development
git merge main

# Commit frequently
git add .
git commit -m "feat: add sample export functionality"

# Push to your branch
git push origin intern/[your-name]/development
```

### 5. Creating Pull Requests

When ready to merge your feature:
1. Push all changes to your branch
2. Go to GitHub and click "New Pull Request"
3. Set base branch to `main` and compare to your branch
4. Add description of changes
5. Request review from supervisor

---

## Development Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

### Backend Setup

```bash
# Navigate to backend directory
cd lims-system/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env
```

Edit `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost/lims_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Database Setup

```bash
# Create database
createdb lims_db

# Run migrations (tables auto-created on first run)
python migrate_db.py
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd lims-system/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running the Full Stack

Terminal 1 (Backend):
```bash
cd lims-system/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend):
```bash
cd lims-system/frontend
npm run dev
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Project Structure

```
lims-system/
├── backend/
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── crud/        # Database operations
│   │   └── core/        # Config, security
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── store/       # State management
│   │   ├── hooks/       # Custom React hooks
│   │   └── config/      # Configuration
│   └── package.json
└── docs/
    └── CLAUDE.md        # AI assistant context
```

---

## Development Workflow

### 1. Daily Workflow

```bash
# Start your day
git checkout main
git pull origin main
git checkout intern/[your-name]/development
git merge main

# Work on features
# ... make changes ...

# Commit changes
git add .
git commit -m "feat: description of changes"
git push origin intern/[your-name]/development
```

### 2. Commit Message Format

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

Examples:
```bash
git commit -m "feat: add CSV export for sample data"
git commit -m "fix: resolve date formatting in sample table"
git commit -m "docs: update README with new endpoints"
```

### 3. Before Pushing Code

Always run these checks:
```bash
# Backend
cd backend
python -m pytest
python -m black app/
python -m flake8 app/

# Frontend
cd frontend
npm run lint
npm run type-check
npm test
```

---

## Feature Development Guidelines

### 1. Understanding the Codebase

Before adding features:
1. Read `CLAUDE.md` for system context
2. Review existing similar features
3. Check the API documentation at `/docs`
4. Understand the database schema

### 2. Adding a New Feature Example

**Example: Adding a Sample Report Generation Feature**

1. **Backend API Endpoint**:
```python
# backend/app/api/api_v1/endpoints/samples.py
@router.get("/samples/report/{project_id}")
async def generate_sample_report(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Implementation here
    pass
```

2. **Frontend Component**:
```typescript
// frontend/src/components/samples/ReportGenerator.tsx
import React from 'react';
import { Button } from 'antd';
import { api } from '@/config/api';

export const ReportGenerator: React.FC = () => {
    const handleGenerateReport = async () => {
        const response = await api.get('/samples/report/123');
        // Handle response
    };
    
    return (
        <Button onClick={handleGenerateReport}>
            Generate Report
        </Button>
    );
};
```

### 3. Common Features to Practice

Good starter features for interns:
1. **Add Excel Export** for sample data
2. **Create Dashboard Widgets** for statistics
3. **Add Filter Options** to existing tables
4. **Implement Keyboard Shortcuts** for common actions
5. **Add Data Validation** for form inputs
6. **Create Unit Tests** for existing functions

### 4. Database Migrations

When adding database fields:
```python
# Create a migration script
# backend/add_new_field.py
from app.db.base import engine
from sqlalchemy import text

def add_report_generated_field():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE samples 
            ADD COLUMN report_generated BOOLEAN DEFAULT FALSE
        """))
        conn.commit()

if __name__ == "__main__":
    add_report_generated_field()
```

---

## Testing Guidelines

### Backend Testing

```python
# backend/tests/test_samples.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_sample():
    response = client.post(
        "/api/v1/samples/",
        json={"barcode": "123456", "project_id": 1}
    )
    assert response.status_code == 200
```

Run tests:
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing

```typescript
// frontend/src/components/__tests__/SampleTable.test.tsx
import { render, screen } from '@testing-library/react';
import { SampleTable } from '../SampleTable';

test('renders sample table', () => {
    render(<SampleTable />);
    expect(screen.getByText('Samples')).toBeInTheDocument();
});
```

Run tests:
```bash
cd frontend
npm test
```

---

## Key Resources

### Documentation
- **API Documentation**: http://localhost:8000/docs (when running)
- **Project Context**: `/lims-system/CLAUDE.md`
- **README Files**: Check README.md in each directory

### Important Files to Review
1. **Backend Models**: `/backend/app/models/`
2. **API Endpoints**: `/backend/app/api/api_v1/endpoints/`
3. **Frontend Pages**: `/frontend/src/pages/`
4. **Component Library**: `/frontend/src/components/`

### Development Tools
- **VS Code Extensions**:
  - Python (Microsoft)
  - Pylance
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API testing)

### Getting Help
1. Check existing code for patterns
2. Review git history for similar changes
3. Use API docs for endpoint testing
4. Ask questions early and often

---

## Quick Reference Commands

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev

# Git
git status
git add .
git commit -m "feat: your message"
git push origin intern/[your-name]/[branch]

# Database
psql -d lims_db
\dt  # list tables
\q   # quit

# Testing
cd backend && python -m pytest
cd frontend && npm test
```

---

## Safety Guidelines

### DO:
- Always work in your own branch
- Commit and push frequently
- Pull from main daily
- Test your code before pushing
- Ask questions when unsure
- Review existing code patterns

### DON'T:
- Never force push (`git push -f`)
- Don't commit directly to main
- Don't delete branches you didn't create
- Don't modify database directly in production
- Don't commit sensitive data (.env files)
- Don't skip testing

---

**Welcome to the team! Happy coding!**

*Last Updated: January 2025*