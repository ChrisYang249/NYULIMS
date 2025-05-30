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
   - Accessioned → Extraction Queue → In Extraction → Extracted
   - Extracted → DNA Quant Queue → Library Prep → Sequenced → Analyzed → Delivered
2. **Barcode System**: Auto-generated 6-digit barcodes with re-processing support (e.g., 123456-R1)
3. **Extraction/Prep Planning**: 96-well plates with 3 control positions, batch multiple projects
4. **Audit Trail**: All database changes are tracked with user, timestamp, and before/after values

## API Endpoints

- Auth: `/api/v1/auth/*`
- Projects: `/api/v1/projects/*`
- Samples: `/api/v1/samples/*`
- Users: `/api/v1/users/*` (admin only)

## CFR Part 11 Compliance

- Password complexity requirements enforced
- Session timeouts and account lockouts
- Complete audit trail for all data changes
- Electronic signature support with timestamp and reason

## Recent Updates & Current State

### Database Schema Changes
- **Project Status Enum**: Migrated from old values (RECEIVED, ACCESSIONING, etc.) to new simplified values (pending, lab, bis, completed, deleted)
- **Sample Status Enum**: Uses detailed workflow states (registered, received, accessioning, accessioned, extraction_queue, in_extraction, extracted, dna_quant_queue, in_library_prep, library_prepped, in_sequencing, sequenced, in_analysis, analysis_complete, delivered, failed, cancelled)

### User Management System
- **User Roles**: super_admin, pm, accessioner, lab_tech, lab_manager, director, sales
- **Current Implementation**: 
  - Basic user CRUD endpoints exist at `/api/v1/users/` (list and create only)
  - Frontend "Employees" page exists but incorrectly uses `/employees` endpoints
  - Role-based access control partially implemented (only super_admin checks)
- **Missing Features**:
  - Update/delete user endpoints
  - Password reset functionality
  - Role-based UI visibility
  - Metrics/monitoring dashboard

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

### Frontend Routes
- `/samples` - Sample list with bulk operations
- `/samples/:id` - Sample details page with edit/status update

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
- Working on: `feature/discrepancy-management`
- Status: All changes committed and pushed to GitHub
- Latest commit: Add multiple sample discrepancy reporting and improve sample sorting

## Recent Updates (Latest Sessions)

### Sample Management System (Completed)
1. ✅ Created comprehensive sample details page with tabs for basic info, lab data, and activity
2. ✅ Added sample status update functionality with notes
3. ✅ Made barcodes clickable links to details page
4. ✅ Fixed CSV template to show actual CMBP project IDs
5. ✅ Created Excel template with multiple reference sheets
6. ✅ Added sample edit functionality
7. ✅ Installed xlsx and file-saver packages for Excel generation
8. ✅ Implemented comprehensive logging system for samples
9. ✅ Added comment functionality to sample details
10. ✅ Created activity timeline showing all changes and comments
11. ✅ Added automatic logging for create, update, status change, and accession operations
12. ✅ Created sample_logs table with proper indexes

### Latest Enhancements (January 2025)
1. ✅ Added service type tracking for samples (inherits from project)
2. ✅ Implemented bulk operations (delete, status update) with dedicated endpoints
3. ✅ Added URL-based filter persistence across navigation
4. ✅ Enabled Cmd/Ctrl/Shift+Click to open samples/projects in new tabs
5. ✅ Made client field searchable in project creation
6. ✅ Fixed pagination to support configurable page sizes (20/50/100/200)
7. ✅ Added service type validation during bulk import
8. ✅ Created bulk actions dropdown for selected samples
9. ✅ Fixed "Show deleted samples" toggle functionality
10. ✅ Updated documentation (PROJECT_DESCRIPTION.md and README.md)

### Accessioning & Extraction Workflow (January 30, 2025)
1. ✅ Added ACCESSIONING status between RECEIVED and ACCESSIONED
2. ✅ Created comprehensive accessioning page with pre-treatment and spike-in options
3. ✅ Implemented flag system with standardized abbreviations
4. ✅ Added discrepancy management with electronic approval workflow
5. ✅ Created extraction queue management system
6. ✅ Built lab manager interface for assigning extraction work to technicians
7. ✅ Added extraction_queue and dna_quant_queue statuses
8. ✅ Implemented automatic plate ID generation for extraction batches
9. ✅ Added extraction-related fields to database (method, QC data, well positions)
10. ✅ Made table styling consistent across all pages (compact view)
11. ✅ Implemented smart sample sorting by due date and project
12. ✅ Added bulk discrepancy reporting for multiple samples
13. ✅ Enhanced discrepancy modal to show selected samples (up to 5)
14. ✅ Restricted file attachments to single sample discrepancies only

## Next Steps
1. Build Extraction planning and tracking system (96-well plate management)
2. Build Library Prep planning and tracking system
3. Build Sequencing run management system
4. Implement CSV import backend endpoint for bulk samples
5. Add visual freezer/box maps
6. Complete user management CRUD operations
7. Add audit trail viewing for samples