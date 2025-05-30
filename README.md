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
- **Enhanced Accessioning**: 
  - Pre-treatment options (Metapolyzyme, Proteinase K, etc.)
  - Spike-in tracking for quality control (Zymo standards)
  - Flag system with standardized abbreviations
  - Discrepancy management with electronic approvals
- **Bulk Operations**: Import samples via CSV/Excel, bulk status updates, bulk deletion
- **Storage Management**: Track freezer locations with visual occupancy indicators
- **Extraction Queue Management**: Lab manager interface for assigning work to technicians
- **Workflow Management**: Extraction and library prep planning with 96-well plate layouts
- **Sequencing Run Planning**: Track runs, yields, and QC metrics
- **Activity Logging**: Complete timeline of all sample activities and comments

### User Experience
- **Smart Navigation**: Open items in new tabs with Cmd/Ctrl+Click
- **Persistent Filters**: Maintain search and filter settings across page navigation
- **Searchable Dropdowns**: Fast client and project selection
- **Flexible Pagination**: Choose between 20, 50, 100, or 200 items per page
- **Import Templates**: Download pre-formatted CSV/Excel templates with validation
- **Smart Sorting**: Samples automatically sorted by due date and project
- **Consistent UI**: Compact table styling across all pages

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
3. **Sample Receipt** (PM) - Mark samples as received
4. **Accessioning Queue** (PM) - Assign samples to accessioning status
5. **Sample Accessioning** (Accessioner) - Verify, apply pre-treatments, add flags
6. **Extraction Queue** (Accessioner) - Move accessioned samples to extraction queue
7. **Extraction Assignment** (Lab Manager) - Assign samples to technicians
8. **DNA Extraction** (Lab Tech) - Process samples in 96-well plates
9. **DNA Quantification** - Measure concentration and purity
10. **Library Preparation** (Lab Tech) - Prepare sequencing libraries
11. **Sequencing** (Lab Tech) - Run samples on sequencer
12. **Data Analysis** (BIS Analyst) - Process sequencing data
13. **Delivery** (PM) - Deliver results to client

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
- Enhanced accessioning workflow with pre-treatments and spike-ins
- Flag system with standardized abbreviations
- Discrepancy management with electronic approvals
- Extraction queue management system
- Lab manager interface for work assignment
- Smart sample sorting by due date and project
- Consistent table styling across all pages

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