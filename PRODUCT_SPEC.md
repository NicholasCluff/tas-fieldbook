# TasFieldbook - Product Specification

## Overview

TasFieldbook is a comprehensive digital fieldbook application designed specifically for land surveyors in Tasmania. The application facilitates the modern surveying workflow from initial search analysis through field data collection to final review and approval, replacing traditional paper-based systems with a robust mobile-first digital platform.

## Core Value Proposition

- **Streamlined Workflow**: Digitizes the entire surveying process from setup to completion
- **Regulatory Compliance**: Supports Tasmania's surveying standards and documentation requirements
- **Supervisor Oversight**: Built-in approval workflows and mentorship features
- **Field-Ready**: Mobile-optimized for use in challenging field conditions
- **Centralized Data**: All project data, photos, and documentation in one secure location

## User Roles & Authentication

### User Types

**Supervisor**
- Licensed surveyor with project oversight capabilities
- Can create projects and invite candidates
- Can access and manage any project where they are assigned as supervisor
- Reviews and approves candidate work when supervision is required
- Provides feedback and comments on submissions
- Full access to all project phases for supervised projects

**Candidate**
- Surveyor (trainee or independent) who can create and manage projects
- Can create their own projects with optional supervisor assignment
- Can invite supervisors to oversee their projects
- Can work independently on projects without supervision
- Records daily field activities and manages project workflow
- Full project ownership and management capabilities

**Admin** (Future Enhancement)
- System administration and user management
- Analytics and reporting across all projects

### Authentication Features

- Email/password authentication via Supabase Auth
- Role-based access control (RBAC) with flexible permissions
- Optional supervisor-candidate relationships
- Project-level permission management
- Session management with automatic logout
- Password reset and account verification

## Project Management System

### Project Lifecycle

Projects follow a structured three-phase workflow:

**1. Setup Phase**
- Project creation and basic information entry
- Search analysis document upload and review
- Initial planning and resource allocation
- Optional supervisor assignment and approval workflow
- Phase progression based on project supervision settings

**2. Fieldwork Phase**
- Daily activity logging in digital diary
- Photo capture with GPS coordinates
- Map markup and annotation
- Real-time data collection
- Progress updates to supervisor (if assigned)

**3. Review Phase**
- Final data compilation and review
- Supervisor assessment and feedback (if supervision required)
- Project completion certification
- Archive and handover documentation
- Self-certification for independent projects

### Project Features

- Project templates for common survey types
- Flexible ownership model (candidate-owned with optional supervision)
- Deadline tracking and milestone management
- Progress indicators and completion status
- Document version control
- Export capabilities for regulatory submission
- Supervision request and invitation system
- Independent project workflow options

## Core Features

### 1. Search Analysis Module

**PDF Upload System**
- Drag-and-drop PDF upload interface
- Document preview and annotation tools
- Version control for document revisions
- Storage optimization for mobile networks

**Review & Approval Workflow**
- Supervisor notification system
- Inline commenting and markup tools
- Approval/rejection with detailed feedback
- Document status tracking
- Revision request system

**Integration Features**
- Links to relevant cadastral databases
- Historical search reference system
- Automatic metadata extraction
- Search criteria checklist validation

### 2. Digital Diary System

**Daily Activity Logging**
- Time-stamped activity entries
- Pre-defined activity categories
- Weather and site condition tracking
- Equipment and resource logging
- Personnel and team member records

**Field Data Entry**
- Quick-entry templates for common activities
- Photo attachment to diary entries
- GPS location stamping
- Offline capability with sync when connected
- Voice-to-text entry support

**Reporting Features**
- Daily, weekly, and project summaries
- Supervisor progress notifications
- Timesheet integration
- Compliance reporting for training requirements

### 3. Interactive Map System

**Map Display**
- Integration with Tasmania's LIST mapping services
- Satellite and cadastral overlay options
- Property boundary visualization
- Topographic and aerial imagery
- Real-time GPS positioning

**Markup Tools**
- Point, line, and polygon annotation
- Text labels and measurements
- Color-coded marking system
- Layer management for different data types
- Sketch and freehand drawing tools

**Photo Integration**
- Photo markers on map locations
- GPS-tagged photo placement
- Photo gallery with map navigation
- Thumbnail previews on map
- Full-screen photo viewing with details

### 4. Photo Management System

**Capture & Upload**
- In-app camera integration
- Bulk photo upload from device gallery
- Automatic GPS coordinate embedding
- Compression for mobile data efficiency
- Offline storage with background sync

**Organization Features**
- Date and location-based sorting
- Custom tagging and categorization
- Search and filter capabilities
- Photo comparison tools
- Duplicate detection and management

**Documentation Tools**
- Photo annotation and markup
- Caption and description fields
- Photo reports and summaries
- Export for external documentation
- Print-ready formatting options

## Technical Architecture

### Frontend Stack
- **SvelteKit 5** with TypeScript
- **TailwindCSS v4** for responsive design
- **Progressive Web App (PWA)** capabilities
- **Offline-first** architecture with service workers
- **Mobile-optimized** touch interfaces

### Backend Infrastructure
- **Supabase** for backend-as-a-service
- **PostgreSQL** for primary data storage
- **Supabase Storage** for file and photo management
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for collaborative features

### Key Integrations
- **Tasmanian LIST** mapping services
- **GPS and geolocation** services
- **Camera and media** APIs
- **File system** access for offline storage
- **Push notifications** for supervisor alerts

## Data Model Overview

### Core Entities

**Users**
- Profile information and credentials
- Role assignments and permissions
- Supervisor-candidate relationships
- Training progress tracking

**Projects**
- Basic project metadata
- Phase and status tracking
- Assignment and access control
- Deadline and milestone management

**Search Documents**
- PDF storage and metadata
- Review status and comments
- Version control and history
- Approval workflow tracking

**Diary Entries**
- Daily activity records
- Time and location stamps
- Weather and site conditions
- Equipment and resource usage

**Photos**
- Image files with metadata
- GPS coordinates and timestamps
- Project and location associations
- Annotation and markup data

**Map Data**
- Markup annotations and drawings
- Layer organization and styling
- Coordinate and measurement data
- Integration with external mapping services

## Mobile-First Design Principles

### User Experience
- **Touch-optimized** interfaces for field use
- **Large buttons** and gesture-friendly navigation
- **High contrast** design for outdoor visibility
- **Quick access** to frequently used features
- **Minimal data usage** for rural connectivity

### Performance Optimization
- **Lazy loading** for large photo galleries
- **Image compression** and progressive loading
- **Offline caching** for critical functionality
- **Background sync** when connectivity returns
- **Battery optimization** for all-day field use

## Security & Compliance

### Data Protection
- **End-to-end encryption** for sensitive documents
- **Role-based access control** throughout application
- **Audit logging** for all user actions
- **Secure file storage** with access controls
- **GDPR compliance** for personal data handling

### Professional Standards
- **Digital signatures** for document approval
- **Timestamp verification** for legal compliance
- **Document retention** policies
- **Export capabilities** for regulatory submission
- **Backup and disaster recovery** procedures

## Future Enhancements

### Phase 2 Features
- **Multi-language support** for diverse teams
- **Advanced analytics** and reporting dashboard
- **Integration with CAD systems** and survey software
- **Automated backup** to external storage services
- **Team chat** and communication features

### Phase 3 Features
- **AI-powered** search analysis assistance
- **Drone integration** for aerial photography
- **3D visualization** and modeling tools
- **Advanced GIS** analysis capabilities
- **Mobile device management** for enterprise deployment

## Success Metrics

### User Adoption
- User registration and active usage rates
- Feature adoption across different user types
- Time savings compared to paper-based processes
- User satisfaction and feedback scores

### Operational Efficiency
- Project completion time improvements
- Error reduction in documentation
- Supervisor review cycle efficiency
- Compliance adherence rates

### Technical Performance
- Application load times and responsiveness
- Offline functionality reliability
- Photo upload and sync success rates
- System uptime and availability metrics

---

*This specification serves as the foundation for developing TasFieldbook, providing a comprehensive roadmap for creating a modern, efficient digital surveying solution tailored specifically for Tasmania's land surveying community.*