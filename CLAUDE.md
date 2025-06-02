# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LIMS (Laboratory Information Management System) - A CFR Part 11 compliant system for managing laboratory workflows including sample tracking, project management, and sequencing operations.

## Architecture

- **Backend**: FastAPI (Python) with PostgreSQL
  - Async API with automatic documentation
  - SQLAlchemy ORM with audit trail support
  - JWT authentication with role-based access control
  - CFR Part 11 compliant with electronic signatures and audit logs

- **Frontend**: React + TypeScript + Vite + Ant Design
  - Component-based architecture
  - State management with Zustand
  - Protected routes and role-based UI

## Development Commands

### Backend
```bash
cd lims-system/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Update database credentials
uvicorn app.main:app --reload
```

### Frontend
```bash
cd lims-system/frontend
npm install
npm run dev
```

### Database Setup
```bash
createdb lims_db
# Tables are auto-created on first run
```

## Key Features & Workflows

1. **Enhanced Sample Workflow**: 
   - Registered → Received → Accessioning → Accessioned
   - PM Review: Accessioned → extraction_queue OR dna_quant_queue (based on sample type)
   - extraction_queue → In Extraction → Extracted → dna_quant_queue
   - dna_quant_queue → Library Prep → Sequenced → Analyzed → Delivered
2. **Barcode System**: Auto-generated 6-digit barcodes with re-processing support (e.g., 123456-R1)
3. **Extraction/Prep Planning**: 96-well plates with 3 control positions, batch multiple projects
4. **Audit Trail**: All database changes are tracked with user, timestamp, and before/after values

## API Endpoints

- Auth: `/api/v1/auth/*`
- Projects: `/api/v1/projects/*`
- Samples: `/api/v1/samples/*`
- Users: `/api/v1/users/*` (admin only)
- Queues: `/api/v1/samples/queues/{queue_name}` (accessioning, extraction, dna_quant, etc.)

## CFR Part 11 Compliance

- Password complexity requirements enforced
- Session timeouts and account lockouts
- Complete audit trail for all data changes
- Electronic signature support with timestamp and reason

## Recent Updates & Current State (Feb 6, 2025)

### PM Review Workflow
- **Implemented**: PM reviews accessioned samples and routes to appropriate queues
- **DNA Sample Types**: dna, dna_plate, cdna, dna_cdna, dna_library, rna_library, library_pool → Go directly to DNA Quant Queue
- **Other Sample Types**: Go to Extraction Queue
- **Permissions**: Added `reviewAndRouteSamples` action for PM role

### Database Schema Changes
- **Sample Status**: Changed from PostgreSQL enum to VARCHAR(50) to fix SQLAlchemy issues
- **Status Values**: 
  - Old workflow: REGISTERED, RECEIVED, ACCESSIONING, ACCESSIONED, IN_EXTRACTION, etc.
  - New queue statuses: extraction_queue, dna_quant_queue (lowercase)

### Frontend Updates
- **Accessioning Page**: Shows "Queue Destination" column when viewing completed samples
- **Samples Page**: Added extraction_queue and dna_quant_queue to statusOptions
- **New Page**: DNAQuantQueue.tsx at `/samples/dna-quant-queue`

### Known Issues
- Frontend user management page (Employees.tsx) needs to be connected to proper `/users/` endpoints
- Need to implement granular role-based permissions beyond super_admin checks
- Missing update and delete operations in user management API

## Sample Registration System (Completed)

### Features Implemented
- **Bulk Registration**: Register up to 2000 samples at once with auto-generated barcodes
- **Storage Tracking**: StorageLocation model tracks freezer/shelf/box/position
- **Enhanced Sample Model**: Added target_depth, well_location, due_date fields
- **DNA Plate Support**: Special sample type with required well location validation
- **Comprehensive Display**: Compact table with extraction/library prep/sequencing data in popover tags
- **Bulk Operations**: Bulk accession multiple samples, CSV/Excel template download
- **Project Display**: Shows actual CMBP project IDs (e.g., CMBP00001) instead of database IDs
- **Sample Details Page**: Full details view with edit and status update functionality
- **Status Management**: Update sample status at any time with notes
- **Clickable Barcodes**: Navigate to details by clicking barcode
- **Comprehensive Logging**: All sample operations are logged with user, timestamp, and changes
- **Comment System**: Add comments to samples with full activity timeline
- **Activity Statistics**: Track total activities, comments, status changes, and updates

### Import Templates
- **CSV Template**: Includes actual project IDs and helpful comments
- **Excel Template**: Multi-sheet workbook with:
  - Sample data sheet with examples including service_type
  - Valid Sample Types reference sheet
  - Valid Service Types reference sheet
  - Instructions sheet with validation rules

### Database Migration Status
✅ Migrations completed:
1. `python add_sample_fields.py` - Added new sample fields and storage locations
2. `python add_sample_logs.py` - Added sample_logs table for activity tracking
3. Status column converted from enum to VARCHAR (Feb 6, 2025)

Tables created:
- storage_locations - Track freezer/shelf/box/position
- sample_logs - Track all changes, comments, and activities

### API Endpoints
- `GET/POST /samples` - List and create samples (includes lab data joins)
- `GET /samples/{id}` - Get single sample with full details
- `POST /samples/bulk` - Bulk create samples
- `POST /samples/bulk-import` - Import samples from CSV/Excel with validation
- `POST /samples/bulk-update` - Update multiple samples at once
- `POST /samples/bulk-delete` - Soft delete multiple samples
- `PUT /samples/{id}` - Update sample (including status changes)
- `DELETE /samples/{id}` - Soft delete single sample
- `PATCH /samples/{id}/accession` - Accession single sample
- `POST /samples/accession/bulk` - Bulk accession
- `GET/POST /samples/storage/locations` - Manage storage locations
- `GET /samples/{id}/logs` - Get all activity logs for a sample
- `POST /samples/{id}/logs` - Add a comment to a sample
- `GET /samples/queues/{queue_name}` - Get samples in specific queue

### Frontend Routes
- `/samples` - Sample list with bulk operations
- `/samples/:id` - Sample details page with edit/status update
- `/samples/dna-quant-queue` - DNA Quantification Queue

## Storage Management System (Completed)

### Features Implemented
- **Dedicated Storage Page**: Separate menu item and comprehensive management interface
- **Overview Tab**: Statistics cards, full location table with occupancy visualization
- **Location Details Tab**: View samples in each location
- **Filtering**: By freezer, search capabilities
- **Smart Entry**: Freezer dropdown with custom entry option
- **Occupancy Tracking**: Visual progress bars showing space utilization

### Storage Page Location
- Menu: Storage (with InboxOutlined icon)
- Route: `/storage`
- Component: `frontend/src/pages/Storage.tsx`

## Current Git Branch
- Working on: main/master
- All PM review workflow changes have been implemented

## Next Steps
1. Build Library Prep planning and tracking system
2. Build Sequencing run management system
3. Implement CSV import backend endpoint for bulk samples
4. Add visual freezer/box maps
5. Complete user management CRUD operations
6. Add audit trail viewing for samples