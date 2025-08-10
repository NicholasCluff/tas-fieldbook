# Survey Search Analysis Implementation Plan

## Overview

This document outlines the implementation plan for the Survey Search Analysis feature in TasFieldbook. This feature enables surveyors to upload, process, organize, and annotate survey search documents containing multiple survey plans.

## Feature Requirements

### Core Workflow
1. **Document Upload**: Upload search documents (PDFs containing multiple survey plans)
2. **Automatic Splitting**: Split documents into individual survey plans based on bookmarks/reference numbers
3. **Organization & Tagging**: Organize plans with custom tags and metadata
4. **Markup & Annotations**: Draw annotations and notes on plans
5. **Hierarchical Linking**: Create relationships between related plans

### Test Document Analysis
- Sample document: `test_data/SurveyDocument(LTO-DO)-432367.pdf`
- Contains multiple survey plans with bookmark references
- Each plan has a reference number that should be extracted for splitting

## Technical Architecture

### Frontend Stack
- **SvelteKit** with Svelte 5 runes system
- **PDF.js** for PDF rendering and viewing
- **PDF-lib** for client-side PDF manipulation
- **Canvas/SVG** for annotations and markup
- **Leaflet** for geospatial context (if needed)

### Backend Processing
- **Supabase Edge Functions** for server-side PDF processing
- **pdf-lib** + **PDFtk** for advanced bookmark extraction and splitting
- **Supabase Storage** for file management
- **PostgreSQL** with RLS for data security

## Database Schema Extensions

### New Tables

#### survey_plans
```sql
CREATE TABLE survey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  search_document_id UUID REFERENCES search_documents(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL, -- extracted from bookmarks (e.g., "432367-1")
  title TEXT,
  description TEXT,
  file_path TEXT NOT NULL, -- path to individual plan PDF
  page_numbers INTEGER[], -- pages from original document
  file_size INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### plan_tags
```sql
CREATE TABLE plan_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- hex color for tag display
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, name)
);
```

#### plan_tag_assignments
```sql
CREATE TABLE plan_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES plan_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_id, tag_id)
);
```

#### plan_relationships
```sql
CREATE TABLE plan_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE,
  child_plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'related' CHECK (relationship_type IN ('parent', 'child', 'related', 'supersedes', 'superseded_by')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_plan_id, child_plan_id),
  CHECK (parent_plan_id != child_plan_id)
);
```

#### plan_annotations
```sql
CREATE TABLE plan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('markup', 'text', 'highlight', 'arrow', 'rectangle', 'circle', 'freehand')),
  page_number INTEGER NOT NULL DEFAULT 1,
  coordinates JSONB NOT NULL, -- {x, y, width, height} or path data for freehand
  content TEXT, -- text content for text annotations
  style JSONB, -- {color, strokeWidth, opacity, etc.}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_survey_plans_project_id ON survey_plans(project_id);
CREATE INDEX idx_survey_plans_search_document_id ON survey_plans(search_document_id);
CREATE INDEX idx_survey_plans_reference_number ON survey_plans(reference_number);
CREATE INDEX idx_plan_annotations_plan_id ON plan_annotations(plan_id);
CREATE INDEX idx_plan_annotations_page_number ON plan_annotations(plan_id, page_number);
CREATE INDEX idx_plan_relationships_parent ON plan_relationships(parent_plan_id);
CREATE INDEX idx_plan_relationships_child ON plan_relationships(child_plan_id);
```

## Implementation Phases

### Phase 1: Basic Document Management (Week 1-2)
- [ ] Create `/projects/[id]/search` route structure
- [ ] Implement document upload interface
- [ ] Basic document listing and viewing
- [ ] Document status management (pending/approved/rejected)

### Phase 2: PDF Processing & Splitting (Week 3-4)
- [ ] Set up Supabase Edge Function for PDF processing
- [ ] Implement bookmark extraction using pdf-lib/PDFtk
- [ ] Create automatic splitting workflow
- [ ] Generate individual plan files
- [ ] Handle extraction errors and edge cases

### Phase 3: Plan Organization (Week 5-6)
- [ ] Implement plan listing and grid view
- [ ] Create tagging system interface
- [ ] Add plan metadata editing
- [ ] Implement search and filtering
- [ ] Add bulk operations (tag multiple, delete, etc.)

### Phase 4: Markup & Annotations (Week 7-9)
- [ ] Integrate PDF.js viewer
- [ ] Implement annotation toolbar
- [ ] Add drawing capabilities (shapes, freehand, text)
- [ ] Save annotations to database
- [ ] Load and display existing annotations

### Phase 5: Hierarchical Relationships (Week 10-11)
- [ ] Create plan relationship interface
- [ ] Implement drag-and-drop hierarchy builder
- [ ] Add relationship visualization
- [ ] Enable linking and unlinking plans

### Phase 6: Advanced Features (Week 12-13)
- [ ] Add plan comparison view
- [ ] Implement export functionality
- [ ] Add plan history/versioning
- [ ] Mobile optimization for field use
- [ ] Offline capabilities

## File Structure

```
src/routes/(app)/projects/[id]/search/
├── +page.svelte                 # Main search analysis page
├── +layout.svelte              # Search-specific layout
├── upload/
│   └── +page.svelte            # Document upload interface
├── plans/
│   ├── +page.svelte            # Plan listing and organization
│   └── [planId]/
│       ├── +page.svelte        # Individual plan viewer
│       ├── edit/
│       │   └── +page.svelte    # Plan metadata editing
│       └── annotations/
│           └── +page.svelte    # Annotation interface
└── relationships/
    └── +page.svelte            # Plan hierarchy management

src/lib/components/search/
├── DocumentUpload.svelte        # Upload interface
├── DocumentList.svelte          # Document listing
├── PlanGrid.svelte             # Plan grid view
├── PlanCard.svelte             # Individual plan card
├── TagManager.svelte           # Tag creation/management
├── AnnotationToolbar.svelte    # Annotation tools
├── PDFViewer.svelte            # PDF.js integration
├── RelationshipBuilder.svelte  # Hierarchy interface
└── PlanSearch.svelte           # Search and filtering

src/lib/services/
├── searchDocuments.service.ts  # Document CRUD operations
├── surveyPlans.service.ts      # Plan management
├── planAnnotations.service.ts  # Annotation management
├── planTags.service.ts         # Tag operations
├── pdfProcessing.service.ts    # Client-side PDF utilities
└── planRelationships.service.ts # Relationship management

src/lib/stores/
├── searchDocuments.ts          # Document state management
├── surveyPlans.ts              # Plan state management
└── annotations.ts              # Annotation state management
```

## API Design

### Supabase Edge Functions

#### PDF Processing Function
```typescript
// supabase/functions/process-search-document/index.ts
export async function processPDF(
  documentId: string,
  fileBuffer: ArrayBuffer
): Promise<{
  success: boolean;
  plans: Array<{
    referenceNumber: string;
    title: string;
    pages: number[];
    filePath: string;
  }>;
  errors?: string[];
}> {
  // 1. Extract bookmarks using pdf-lib
  // 2. Identify plan boundaries
  // 3. Split PDF into individual plans
  // 4. Upload individual files to Supabase Storage
  // 5. Return plan metadata
}
```

### Service Layer APIs

#### Document Service
```typescript
class SearchDocumentsService {
  async uploadDocument(projectId: string, file: File): Promise<ServiceResult<SearchDocument>>
  async listDocuments(projectId: string): Promise<ServiceResult<SearchDocument[]>>
  async deleteDocument(documentId: string): Promise<ServiceResult<void>>
  async processDocument(documentId: string): Promise<ServiceResult<SurveyPlan[]>>
}
```

#### Plan Service
```typescript
class SurveyPlansService {
  async listPlans(projectId: string, filters?: PlanFilters): Promise<ServiceResult<SurveyPlan[]>>
  async getPlan(planId: string): Promise<ServiceResult<SurveyPlan>>
  async updatePlan(planId: string, updates: Partial<SurveyPlan>): Promise<ServiceResult<SurveyPlan>>
  async deletePlan(planId: string): Promise<ServiceResult<void>>
  async addTags(planId: string, tagIds: string[]): Promise<ServiceResult<void>>
  async removeTags(planId: string, tagIds: string[]): Promise<ServiceResult<void>>
}
```

#### Annotation Service
```typescript
class PlanAnnotationsService {
  async getAnnotations(planId: string, pageNumber?: number): Promise<ServiceResult<PlanAnnotation[]>>
  async saveAnnotation(annotation: CreateAnnotationRequest): Promise<ServiceResult<PlanAnnotation>>
  async updateAnnotation(annotationId: string, updates: Partial<PlanAnnotation>): Promise<ServiceResult<PlanAnnotation>>
  async deleteAnnotation(annotationId: string): Promise<ServiceResult<void>>
}
```

## Technical Considerations

### PDF Processing Strategy
1. **Client-side**: Use PDF.js for viewing and basic manipulation
2. **Server-side**: Use pdf-lib + PDFtk for complex operations (bookmark extraction, splitting)
3. **Hybrid approach**: Upload to server for processing, return metadata to client

### Performance Optimization
- Lazy load PDF pages for large documents
- Use virtual scrolling for plan grids
- Implement progressive loading for annotations
- Cache processed documents in Supabase Storage

### Mobile Considerations
- Touch-friendly annotation tools
- Responsive PDF viewer
- Offline support for downloaded plans
- Optimized file sizes for mobile data

### Security & Permissions
- Leverage existing RLS policies on projects table
- Implement file access controls via Supabase Storage policies
- Audit trail for plan modifications
- Role-based access for annotations

## Testing Strategy

### Unit Tests
- PDF processing utilities
- Annotation geometry calculations
- Service layer operations
- Component state management

### Integration Tests
- Document upload workflow
- PDF splitting pipeline
- Annotation persistence
- Tag and relationship operations

### E2E Tests
- Complete upload-to-annotation workflow
- Plan organization scenarios
- Mobile responsiveness
- Offline functionality

## Deployment Considerations

### Dependencies
```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "pdfjs-dist": "^4.0.379",
    "@types/pdf-lib": "^1.4.0"
  }
}
```

### Supabase Configuration
- Set up Edge Function for PDF processing
- Configure Storage bucket for search documents
- Update RLS policies for new tables
- Set up database triggers for audit logging

### Environment Variables
```env
VITE_SUPABASE_PDF_PROCESSING_FUNCTION_URL=https://your-project.supabase.co/functions/v1/process-search-document
VITE_MAX_PDF_SIZE_MB=50
VITE_SUPPORTED_PDF_VERSIONS=1.4,1.5,1.6,1.7
```

## Success Metrics

### Functional Metrics
- [ ] Upload success rate > 95%
- [ ] PDF splitting accuracy > 90%
- [ ] Annotation save success rate > 99%
- [ ] Plan search response time < 500ms

### User Experience Metrics
- [ ] Time from upload to organized plans < 2 minutes
- [ ] Annotation tools are touch-friendly on mobile
- [ ] Offline functionality works for downloaded plans
- [ ] Search and filtering feels responsive

### Performance Metrics
- [ ] PDF viewer loads within 3 seconds
- [ ] Annotation rendering performance acceptable on mobile
- [ ] File upload handles 50MB documents reliably
- [ ] Database queries remain performant with 1000+ plans

## Risk Mitigation

### Technical Risks
- **PDF complexity**: Some PDFs may not have proper bookmarks
  - *Mitigation*: Implement manual splitting interface
- **Large file sizes**: Mobile data usage concerns
  - *Mitigation*: Implement compression and progressive loading
- **Browser compatibility**: PDF.js may have issues on older browsers
  - *Mitigation*: Provide fallback PDF viewer options

### User Experience Risks
- **Learning curve**: Complex interface may confuse users
  - *Mitigation*: Implement guided tutorials and tooltips
- **Mobile usability**: Annotation tools may be difficult on small screens
  - *Mitigation*: Design touch-optimized interfaces

### Business Risks
- **Processing costs**: Supabase Edge Function usage may be expensive
  - *Mitigation*: Implement client-side processing where possible
- **Storage costs**: Large PDF files may increase storage costs
  - *Mitigation*: Implement file compression and cleanup policies

## Future Enhancements

### Phase 7+: Advanced Features
- AI-powered plan classification and tagging
- OCR for text extraction from scanned plans
- Integration with external survey databases
- Advanced search with geospatial queries
- Collaborative annotation features
- Version control for plan revisions
- Advanced export formats (DWG, GeoJSON)
- Integration with surveying instruments

### Technical Debt Considerations
- Monitor PDF.js version updates
- Regular security audits for file upload handling
- Performance monitoring for large document collections
- Database query optimization as data grows

## Conclusion

This implementation plan provides a comprehensive roadmap for building a robust survey search analysis feature. The phased approach allows for iterative development while maintaining focus on core user workflows. The technical architecture leverages modern web technologies while considering mobile-first usage patterns typical in surveying field work.

The emphasis on PDF processing, annotation capabilities, and organizational features addresses the specific needs of Tasmanian land surveyors working with complex survey search documents in field conditions.