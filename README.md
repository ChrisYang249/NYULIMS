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

### Core Functionality
- **Project Management**: Track projects from quote to delivery with service type tracking
- **Sample Tracking**: Barcode-based sample management with full chain of custody
- **Bulk Operations**: Import samples via CSV/Excel, bulk status updates, bulk deletion
- **Storage Management**: Track freezer locations with visual occupancy indicators
- **Workflow Management**: Extraction and library prep planning with 96-well plate layouts
- **Sequencing Run Planning**: Track runs, yields, and QC metrics
- **Activity Logging**: Complete timeline of all sample activities and comments

### User Experience
- **Smart Navigation**: Open items in new tabs with Cmd/Ctrl+Click
- **Persistent Filters**: Maintain search and filter settings across page navigation
- **Searchable Dropdowns**: Fast client and project selection
- **Flexible Pagination**: Choose between 20, 50, 100, or 200 items per page
- **Import Templates**: Download pre-formatted CSV/Excel templates with validation

### Compliance & Security
- **CFR Part 11 Compliance**: 
  - Electronic signatures with timestamps
  - Complete audit trails for all changes
  - Password complexity enforcement
  - Session timeout management
- **Role-Based Access**: Granular permissions for different team roles
- **Soft Delete**: Maintain data integrity with deletion reasons

## User Roles

- **Super Admin**: Full system access
- **Project Manager**: Create/manage projects and client data
- **Accessioner**: Receive and accession samples
- **Lab Tech**: Execute extraction and prep plans
- **Lab Manager**: Assign work, approve results
- **BIS Analyst**: Process sequencing data
- **Director**: View reports and approve critical steps

## Sample Workflow

1. **Project Creation** (PM) - Define project with service type (WGS, 16S, etc.)
2. **Sample Registration** (PM) - Single or bulk import via CSV/Excel
3. **Sample Accessioning** (Accessioner) - Receive and verify samples
4. **Storage Assignment** - Track freezer/shelf/box locations
5. **DNA Extraction** (Lab Tech) - Process samples in 96-well plates
6. **Library Preparation** (Lab Tech) - Prepare sequencing libraries
7. **Sequencing** (Lab Tech) - Run samples on sequencer
8. **Data Analysis** (BIS Analyst) - Process sequencing data
9. **Delivery** (PM) - Deliver results to client

## Recent Updates (January 2025)

### ✅ Completed Features
- Sample details page with activity timeline
- Bulk sample import with validation
- Service type tracking
- Storage management system
- URL-based filter persistence
- Bulk operations (status update, delete)
- Searchable client selection
- Configurable pagination
- Excel/CSV template generation

### 🚀 Next Steps

1. **Extraction Planning UI** - Visual 96-well plate layout designer
2. **Library Prep Planning** - Batch samples across projects
3. **Sequencing Run Management** - Track flowcells and yields
4. **File Attachments** - Upload quotes and submission forms
5. **Report Generation** - Project status and TAT reports
6. **Dashboard Analytics** - Real-time lab metrics
7. **Client Portal** - Self-service sample submission
8. **Instrument Integration** - Direct data capture from sequencers
9. **Barcode Printing** - Generate sample labels
10. **Email Notifications** - Status change alerts

## Contributing

See CLAUDE.md for development guidelines when using Claude Code or other AI assistants.

## License

Proprietary - All rights reserved