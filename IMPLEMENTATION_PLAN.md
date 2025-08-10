# TasFieldbook - Technical Implementation Plan

## Phase 1: Foundation (Weeks 1-3)

### Setup & Dependencies
```bash
# Core dependencies to add
npm install @supabase/supabase-js
npm install leaflet svelte-leafletjs
npm install @tailwindcss/forms @tailwindcss/typography
npm install lucide-svelte date-fns
npm install @vite-pwa/sveltekit workbox-window
```

### Database Schema (Supabase)

```sql
-- Enable RLS and create core tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('supervisor', 'candidate')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supervisor-Candidate relationships (optional)
CREATE TABLE supervisor_candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id UUID REFERENCES profiles(id) NOT NULL,
    candidate_id UUID REFERENCES profiles(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supervisor_id, candidate_id)
);

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) NOT NULL, -- Project owner (can be candidate or supervisor)
    supervisor_id UUID REFERENCES profiles(id), -- Optional supervisor
    phase TEXT NOT NULL DEFAULT 'setup' CHECK (phase IN ('setup', 'fieldwork', 'review')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    supervision_required BOOLEAN NOT NULL DEFAULT false, -- Whether supervisor approval is needed
    supervision_requested BOOLEAN NOT NULL DEFAULT false, -- Whether supervision has been requested
    start_date DATE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search documents
CREATE TABLE search_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'not_required')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diary entries
CREATE TABLE diary_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    entry_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    weather TEXT,
    temperature DECIMAL,
    activities JSONB,
    location_lat DECIMAL,
    location_lng DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos
CREATE TABLE photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    diary_entry_id UUID REFERENCES diary_entries(id),
    title TEXT,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    location_lat DECIMAL,
    location_lng DECIMAL,
    taken_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Map annotations
CREATE TABLE map_annotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon', 'text')),
    coordinates JSONB NOT NULL,
    properties JSONB,
    style JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project invitations and collaboration
CREATE TABLE project_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    inviter_id UUID REFERENCES profiles(id) NOT NULL,
    invitee_id UUID REFERENCES profiles(id) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('supervisor', 'collaborator')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, invitee_id)
);

-- Project permissions for flexible access control
CREATE TABLE project_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'supervisor', 'collaborator')),
    can_edit BOOLEAN NOT NULL DEFAULT true,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_invite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
```

### File Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── auth/
│   │   ├── common/
│   │   ├── diary/
│   │   ├── map/
│   │   ├── photos/
│   │   └── projects/
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   └── ui.ts
│   ├── types/
│   │   └── database.ts
│   ├── utils/
│   │   ├── supabase.ts
│   │   ├── dates.ts
│   │   └── validation.ts
│   └── services/
│       ├── auth.service.ts
│       ├── projects.service.ts
│       ├── invitations.service.ts
│       ├── permissions.service.ts
│       ├── diary.service.ts
│       ├── photos.service.ts
│       └── maps.service.ts
├── routes/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   │   ├── create/
│   │   │   └── [id]/
│   │   │       ├── search/
│   │   │       ├── diary/
│   │   │       ├── map/
│   │   │       ├── photos/
│   │   │       ├── settings/
│   │   │       └── invitations/
│   │   ├── invitations/
│   │   └── profile/
│   └── +layout.svelte
└── app.html
```

## Phase 2: Core Features (Weeks 4-8)

### Authentication System
- Implement Supabase Auth with role-based access
- Create login/register flows
- Build optional supervisor-candidate relationship management
- Add profile management

### Project Management
- Project CRUD operations with flexible ownership
- Phase workflow implementation with optional supervision
- Project invitation and collaboration system
- Dashboard with owned and supervised project overview
- Supervision request/acceptance workflow

### Search Analysis Module
- PDF upload with Supabase Storage
- Document preview component
- Flexible review and approval workflow (optional supervision)
- Comment and annotation system
- Self-approval for independent projects

## Phase 3: Field Features (Weeks 9-12)

### Digital Diary
- Daily entry forms with templates
- Photo attachment capabilities
- GPS location integration
- Offline storage with sync

### Interactive Maps
- Leaflet integration with Tasmania LIST services
- Markup tools and annotations
- Photo markers and integration
- Layer management system

### Photo Management
- Camera integration
- Bulk upload capabilities
- GPS coordinate embedding
- Gallery and organization features

## Phase 4: Polish & PWA (Weeks 13-16)

### Progressive Web App
- Service worker implementation
- Offline caching strategy
- Background sync for uploads
- Push notifications

### Mobile Optimization
- Touch-friendly interfaces
- Performance optimization
- Battery usage optimization
- Data usage minimization

### Testing & Deployment
- Unit and integration tests
- User acceptance testing
- Production deployment setup
- Documentation completion

## Key Technical Decisions

### State Management
- Svelte stores for global state
- Local component state for UI
- Supabase real-time for collaboration
- IndexedDB for offline storage

### File Storage Strategy
- Supabase Storage for photos and PDFs
- Organized bucket structure by project
- Automatic compression for mobile
- CDN integration for performance

### Offline Capabilities
- Service worker with workbox
- IndexedDB for critical data
- Background sync queues
- Conflict resolution strategies

### Security Implementation
- Row Level Security (RLS) policies
- File access controls
- Input validation and sanitization
- Audit logging for compliance

## Development Milestones

### Week 4: MVP Authentication
- Basic login/register
- Role assignment
- Protected routes

### Week 6: Project Foundation
- Project CRUD with flexible ownership
- Basic dashboard showing owned and supervised projects
- Project invitation system
- Permission management

### Week 8: Search Module
- PDF upload/preview
- Flexible approval workflow (optional supervision)
- Self-approval capabilities
- Invitation and collaboration features

### Week 10: Diary System
- Entry creation/editing
- Photo attachments
- Basic offline support

### Week 12: Map Integration
- Basic map display
- Photo markers
- Simple annotations

### Week 14: PWA Features
- Offline functionality
- Service worker
- Mobile optimization

### Week 16: Production Ready
- Full testing suite
- Performance optimization
- Deployment pipeline