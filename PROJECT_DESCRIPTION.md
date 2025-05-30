# LIMS System - Laboratory Information Management System

## Project Description

A modern, CFR Part 11 compliant Laboratory Information Management System (LIMS) designed for managing DNA sequencing workflows in genomics laboratories. Built with FastAPI and React, this system provides end-to-end sample tracking, project management, and sequencing operations with complete audit trails and regulatory compliance.

## Key Features

### 🔬 Sample Management
- **Barcode Generation**: Automatic 6-8 digit barcode generation with support for re-processing (e.g., 123456-R1 for rerun)
- **Sample Tracking**: Complete chain of custody from receipt through delivery with activity logging
- **Multiple Sample Types**: Support for 70+ sample types including stool, swab, DNA, RNA, tissue, environmental samples
- **Workflow States**: Registered → Received → Accessioned → Extracted → Library Prepped → Sequenced → Analyzed → Delivered
- **Bulk Operations**: Import samples via CSV/Excel, bulk status updates, bulk deletion
- **Service Type Tracking**: Track specific sequencing service requirements (WGS, 16S V1V3, V3V4, ONT, etc.)
- **Storage Management**: Comprehensive freezer/shelf/box/position tracking with occupancy visualization
- **Activity Timeline**: Complete comment and change history for each sample

### 📊 Project Management
- **Project Tracking**: Unique project IDs (CP + 5 digits) with client association
- **TAT Management**: Configurable turnaround times (5-7D to 10-12W)
- **Status Monitoring**: Real-time project status based on sample progress
- **File Attachments**: Support for quotes and submission forms

### 🧪 Laboratory Operations
- **Extraction Planning**: 96-well plate management with 3 control positions
- **Library Prep Planning**: Batch processing across multiple projects
- **Sequencing Run Management**: Track flowcells, reagents, yields, and QC metrics
- **Re-processing Support**: Handle re-extraction, re-prep, and re-sequencing workflows

### 🔐 Regulatory Compliance (CFR Part 11)
- **Electronic Signatures**: Timestamped approval workflows with reason capture
- **Audit Trails**: Complete tracking of all data changes with before/after values
- **Access Control**: Role-based permissions (Super Admin, PM, Accessioner, Lab Tech, Lab Manager, Director, Sales)
- **Password Policies**: Enforced complexity, history, and expiration rules
- **Session Management**: Automatic timeouts and account lockouts

### 📈 Analytics & Reporting
- **Dashboard**: Real-time metrics for active projects, samples, and pending work
- **QC Tracking**: Pass/fail rates and resequencing queues
- **Performance Metrics**: TAT adherence and throughput monitoring

## Technical Architecture

### Backend (FastAPI + PostgreSQL)
- **API**: RESTful API with automatic OpenAPI documentation
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with role-based access control
- **Audit System**: Automatic change tracking on all database operations

### Frontend (React + TypeScript)
- **UI Framework**: Ant Design components for professional interface
- **State Management**: Zustand for efficient state handling
- **Routing**: React Router with protected routes and URL-based filter persistence
- **API Integration**: Axios with automatic auth token handling
- **Advanced Features**: 
  - Searchable dropdowns with real-time filtering
  - Bulk import with validation preview
  - CSV/Excel template generation
  - Keyboard shortcuts (Cmd/Ctrl+Click for new tab)
  - Persistent filter states across navigation

### Deployment & Portability
- **Containerization Ready**: Designed for Docker deployment
- **On-Premise**: Suitable for in-house server installation
- **Environment Configuration**: Flexible .env based configuration

## Use Cases

1. **Clinical Genomics Labs**: Managing patient samples through NGS workflows
2. **Research Facilities**: Tracking research samples with full audit compliance
3. **Food Safety Testing**: Managing food and environmental samples
4. **Contract Labs**: Multi-client project management with TAT tracking

## Benefits

- **Compliance**: Meet regulatory requirements for clinical and research labs
- **Efficiency**: Streamline lab operations with automated workflows
- **Traceability**: Complete sample history from receipt to delivery
- **Scalability**: Handle 5000+ samples per month
- **Flexibility**: Adaptable to various sequencing platforms and workflows

## Target Users

- Laboratory Directors
- Project Managers
- Lab Technicians
- Bioinformatics Analysts
- Quality Assurance Teams
- Client Service Representatives

## Recent Updates (January 2025)

### Sample Management Enhancements
- ✅ Comprehensive sample details page with tabs for basic info, lab data, comments, and activity logs
- ✅ Bulk sample import from CSV/Excel with validation preview
- ✅ Bulk operations (status update, delete) for efficient sample management
- ✅ Service type tracking for each sample
- ✅ Clickable barcodes for quick navigation
- ✅ Storage management system with visual occupancy tracking

### User Experience Improvements
- ✅ URL-based filter persistence (maintain filters when navigating)
- ✅ Searchable client selection in project creation
- ✅ Open samples/projects in new tab with Cmd/Ctrl/Shift+Click
- ✅ Configurable pagination (20/50/100/200 items per page)
- ✅ Excel and CSV template generation with instructions

### Data Integrity & Compliance
- ✅ Soft delete with audit trail and deletion reasons
- ✅ Comprehensive activity logging for all sample operations
- ✅ Comment system for sample-specific notes
- ✅ Automatic sample name cleaning for consistency

## Future Roadmap

- Instrument integration (sequencers, liquid handlers)
- Advanced analytics and reporting dashboards
- Client portal for sample submission and tracking
- Mobile app for barcode scanning
- Integration with ERP/billing systems
- Automated sequencing run planning based on sample queue
- Email notifications for status changes
- Batch QR code label printing
- Sample pooling and dilution calculations
- Integration with bioinformatics pipelines

---

This LIMS system represents a comprehensive solution for modern genomics laboratories requiring robust sample tracking, regulatory compliance, and operational efficiency.