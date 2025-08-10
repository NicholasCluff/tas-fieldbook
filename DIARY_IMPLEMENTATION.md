# Digital Diary Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for the Digital Diary feature in TasFieldbook. This feature provides surveyors with a powerful text editor enhanced with surveying-specific tools for bearing calculations, plan references, map integration, and comprehensive field data recording.

## Feature Requirements

### Core Diary Functionality
1. **Rich Text Editor**: Primary writing interface with formatting capabilities
2. **Surveying Extensions**: Specialized tools for bearing entry, calculations, and surveying notation
3. **Cross-Feature Integration**: Seamless linking to search documents, map annotations, and photos
4. **Field Data Templates**: Quick-entry forms for common surveying activities
5. **Offline Support**: Full functionality without internet connectivity
6. **Real-time Collaboration**: Live updates for supervisor oversight

### Surveying-Specific Features

#### Bearing Entry & Calculation System
- **Smart Bearing Input**: Auto-complete and validation for bearing formats (DMS, decimal degrees)
- **Bearing Calculator**: Convert between formats, calculate angles, and traverse calculations
- **Traverse Builder**: Interactive tool for creating closed traverses with automatic closure checking
- **Distance/Area Calculations**: Built-in surveying calculations with unit conversions

#### Plan References & Linking
- **Search Document Integration**: Direct linking to uploaded survey plans and documents
- **Reference Lookup**: Quick search and insertion of plan numbers and titles
- **Document Annotations**: Link specific text to highlighted areas in PDF documents
- **Hierarchical References**: Create parent-child relationships between diary entries and documents

#### Map Integration
- **Location Linking**: Connect diary entries to specific map coordinates and annotations
- **Site Sketches**: Embed simple sketches and measurements directly in entries
- **Photo Geotagging**: Automatic linking of photos based on GPS proximity and timestamps
- **Annotation References**: Link text descriptions to map markup and annotations

## Technical Architecture

### Frontend Stack
- **Rich Text Editor**: TipTap or Quill.js with custom surveying extensions
- **Mathematical Input**: MathLive for complex surveying calculations and formulas
- **Autocomplete System**: Custom typeahead for bearings, coordinates, and plan references
- **Offline Storage**: IndexedDB for local entry storage and sync management
- **Real-time Updates**: Supabase Realtime for collaborative editing

### Editor Extensions Architecture

#### Custom TipTap Extensions
```typescript
// Bearing input extension
BearingNode: CustomNode {
  type: 'bearing',
  attributes: {
    value: string,           // "123°45'30\"" 
    format: 'dms' | 'dd',   // degrees-minutes-seconds or decimal
    calculation?: string     // optional calculation context
  }
}

// Plan reference extension  
PlanReferenceNode: CustomNode {
  type: 'planReference',
  attributes: {
    planId: string,
    referenceNumber: string,
    title: string,
    pageNumber?: number
  }
}

// Map location extension
LocationNode: CustomNode {
  type: 'location', 
  attributes: {
    lat: number,
    lng: number,
    description: string,
    annotationId?: string
  }
}

// Calculation extension
CalculationNode: CustomNode {
  type: 'calculation',
  attributes: {
    formula: string,
    result: number,
    units: string,
    variables: Record<string, number>
  }
}
```

### Database Schema Extensions

#### Enhanced diary_entries Table
```sql
-- Extend existing diary_entries table
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS content_text TEXT; -- for search
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS calculation_data JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;
```

#### New Supporting Tables

```sql
-- Diary entry templates for common activities
CREATE TABLE diary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'setup', 'fieldwork', 'calculations', 'notes'
  template_json JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bearing calculations and traverse data
CREATE TABLE diary_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL, -- 'bearing', 'distance', 'area', 'traverse'
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  formula_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan references within diary entries
CREATE TABLE diary_plan_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
  search_document_id UUID REFERENCES search_documents(id) ON DELETE CASCADE,
  plan_id UUID, -- future reference to individual plans
  reference_text TEXT NOT NULL,
  page_number INTEGER,
  annotation_data JSONB, -- highlight coordinates, notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Map location references within diary entries  
CREATE TABLE diary_map_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
  map_annotation_id UUID REFERENCES map_annotations(id) ON DELETE SET NULL,
  location_lat DECIMAL NOT NULL,
  location_lng DECIMAL NOT NULL,
  description TEXT,
  reference_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diary entry revisions for version control
CREATE TABLE diary_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  content_json JSONB NOT NULL,
  content_html TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RLS Policies for New Tables
```sql
-- Diary templates policies
CREATE POLICY "Users can view templates" ON diary_templates
  FOR SELECT USING (is_system = true OR created_by = auth.uid());

-- Diary calculations policies  
CREATE POLICY "Users can manage calculations for their entries" ON diary_calculations
  FOR ALL USING (
    diary_entry_id IN (
      SELECT id FROM diary_entries WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables following existing patterns
```

## Component Architecture

### Diary Editor Component Structure

```
src/lib/components/diary/
├── DiaryEditor.svelte           # Main editor container
├── DiaryToolbar.svelte          # Formatting and surveying tools
├── DiaryNavigation.svelte       # Entry list and navigation
├── DiaryTemplates.svelte        # Template selector and manager
├── extensions/
│   ├── BearingInput.svelte      # Smart bearing entry
│   ├── CalculationTool.svelte   # Surveying calculations
│   ├── PlanReferencePicker.svelte # Document reference selector
│   ├── LocationPicker.svelte    # Map location selector
│   └── SketchTool.svelte        # Simple drawing tool
├── templates/
│   ├── SetupTemplate.svelte     # Setup phase template
│   ├── FieldworkTemplate.svelte # Daily fieldwork template
│   └── ReviewTemplate.svelte    # Review phase template
└── utils/
    ├── bearingCalculations.ts   # Bearing math utilities
    ├── surveyingFormulas.ts     # Common surveying calculations
    └── contentSerializer.ts    # JSON/HTML content conversion
```

### Route Structure

```
src/routes/(app)/projects/[id]/diary/
├── +page.svelte                 # Diary home - entry list
├── +layout.svelte              # Diary navigation and sidebar
├── [entryId]/
│   ├── +page.svelte            # View/edit entry
│   └── edit/
│       └── +page.svelte        # Full editor mode
├── new/
│   └── +page.svelte            # Create new entry
└── templates/
    └── +page.svelte            # Manage templates
```

## Integration Points

### Search Document Integration

#### Plan Reference System
```typescript
interface PlanReference {
  documentId: string;
  planId?: string;
  referenceNumber: string;
  title: string;
  pageNumber?: number;
  highlightData?: {
    coordinates: [number, number, number, number];
    color: string;
    note?: string;
  };
}

// Auto-complete service for plan references
class PlanReferenceService {
  async searchPlans(query: string, projectId: string): Promise<PlanReference[]>
  async linkPlanToEntry(entryId: string, reference: PlanReference): Promise<void>
  async getReferencesForEntry(entryId: string): Promise<PlanReference[]>
}
```

#### Document Annotation Linking
- Click-to-reference system in PDF viewers
- Automatic extraction of plan numbers from document content
- Bi-directional linking between diary entries and document annotations

### Map Feature Integration

#### Location Linking System
```typescript
interface LocationReference {
  coordinates: [number, number];
  description: string;
  annotationId?: string;
  accuracy?: number;
  timestamp: string;
}

// Service for map integration
class DiaryMapService {
  async linkLocationToEntry(entryId: string, location: LocationReference): Promise<void>
  async getNearbyEntries(coordinates: [number, number], radius: number): Promise<DiaryEntry[]>
  async createMapAnnotationFromEntry(entryId: string, content: string): Promise<string>
}
```

#### Map Annotation Workflow
- One-click location insertion from map view
- Automatic proximity detection for related entries
- Cross-linking between diary descriptions and map annotations

### Photo Management Integration

#### Smart Photo Linking
```typescript
interface PhotoReference {
  photoId: string;
  caption?: string;
  location?: [number, number];
  timestamp: string;
  autoLinked: boolean; // based on GPS/time proximity
}

// Service for photo integration
class DiaryPhotoService {
  async linkPhotoToEntry(entryId: string, photoId: string, caption?: string): Promise<void>
  async getPhotosForEntry(entryId: string): Promise<PhotoReference[]>
  async autoLinkNearbyPhotos(entryId: string, timeWindow: number): Promise<PhotoReference[]>
}
```

## Surveying Tools Implementation

### Bearing Input System

#### Smart Input Parser
```typescript
class BearingParser {
  // Parse various bearing formats
  parse(input: string): Bearing | null {
    // Support formats:
    // - "123°45'30\"" (DMS)
    // - "123.758333" (Decimal degrees)
    // - "123-45-30" (DMS with dashes)
    // - "N 45° E" (Quadrant bearing)
  }
  
  // Auto-complete suggestions
  getSuggestions(partial: string): BearingSuggestion[]
  
  // Validation
  validate(bearing: Bearing): ValidationResult
}
```

#### Bearing Calculator
```typescript
class BearingCalculator {
  // Convert between formats
  toDMS(decimal: number): DMSBearing
  toDecimal(dms: DMSBearing): number
  
  // Calculate angles
  calculateAngle(bearing1: Bearing, bearing2: Bearing): number
  calculateBackBearing(bearing: Bearing): Bearing
  
  // Traverse calculations
  calculateTraverse(courses: Course[]): TraverseResult
  checkClosure(traverse: Course[]): ClosureResult
}
```

### Calculation Engine

#### Formula Library
```typescript
interface CalculationFormula {
  name: string;
  description: string;
  formula: string;
  variables: Variable[];
  category: 'bearing' | 'distance' | 'area' | 'coordinate';
}

class SurveyingCalculations {
  // Distance calculations
  calculateDistance(point1: Coordinate, point2: Coordinate): number
  calculateHorizontalDistance(slopeDistance: number, verticalAngle: number): number
  
  // Area calculations
  calculateAreaByCoordinates(coordinates: Coordinate[]): number
  calculateAreaByTraverse(courses: Course[]): number
  
  // Coordinate calculations
  calculateCoordinates(startPoint: Coordinate, bearing: Bearing, distance: number): Coordinate
  transformCoordinates(points: Coordinate[], transformation: CoordinateTransform): Coordinate[]
}
```

## Offline Functionality

### Local Storage Strategy

#### Data Synchronization
```typescript
class DiaryOfflineManager {
  // Local storage using IndexedDB
  private db: IDBDatabase;
  
  // Cache management
  async cacheEntry(entry: DiaryEntry): Promise<void>
  async getCachedEntries(projectId: string): Promise<DiaryEntry[]>
  async syncPendingChanges(): Promise<SyncResult>
  
  // Conflict resolution
  async resolveConflicts(conflicts: EntryConflict[]): Promise<void>
  
  // Offline calculations
  async performOfflineCalculations(data: CalculationData): Promise<CalculationResult>
}
```

#### Offline-First Architecture
- All diary functionality works without internet
- Local storage of entries, templates, and calculation data
- Background sync when connection is restored
- Conflict resolution for collaborative editing
- Offline calculation engine for all surveying math

### Progressive Enhancement
- Basic text editing always available
- Enhanced features load progressively
- Graceful degradation of real-time features
- Local backup of all user content

## Real-time Collaboration

### Collaborative Editing System
```typescript
class DiaryCollaborationService {
  // Real-time updates via Supabase
  async subscribeToEntry(entryId: string, callback: (update: EntryUpdate) => void): Promise<void>
  
  // Operational Transform for conflict resolution
  async applyOperation(entryId: string, operation: EditOperation): Promise<void>
  
  // User presence tracking
  async trackUserPresence(entryId: string): Promise<void>
  async getUsersPresent(entryId: string): Promise<UserPresence[]>
}
```

### Supervisor Review System
- Real-time notifications for entry updates
- Inline commenting and suggestion system
- Approval workflow integration
- Version comparison tools

## Implementation Phases

### Phase 1: Core Editor (Weeks 1-2)
**Sprint 1.1: Basic Text Editor**
- TipTap integration with basic formatting
- Entry creation, editing, and deletion
- Basic template system
- Local storage implementation

**Sprint 1.2: Database Integration**
- Supabase service integration
- Entry synchronization
- User permissions and RLS
- Basic offline support

### Phase 2: Surveying Extensions (Weeks 3-4)
**Sprint 2.1: Bearing System**
- Smart bearing input component
- Bearing format conversion
- Basic angle calculations
- Validation and auto-complete

**Sprint 2.2: Calculation Engine**
- Surveying formula library
- Distance and area calculations
- Calculation history and storage
- Results integration into entries

### Phase 3: Integration Features (Weeks 5-6)
**Sprint 3.1: Plan References**
- Document reference picker
- PDF annotation linking
- Auto-complete for plan numbers
- Bi-directional reference system

**Sprint 3.2: Map Integration**
- Location picker component
- Map annotation linking
- GPS coordinate insertion
- Proximity-based suggestions

### Phase 4: Advanced Features (Weeks 7-8)
**Sprint 4.1: Photo Integration**
- Smart photo linking
- Image insertion in entries
- GPS-based auto-linking
- Caption and annotation system

**Sprint 4.2: Collaboration**
- Real-time editing
- Comment and review system
- Version control
- Conflict resolution

### Phase 5: Polish & Optimization (Week 9)
**Sprint 5.1: Performance & UX**
- Mobile optimization
- Performance improvements
- User experience refinements
- Error handling and validation

**Sprint 5.2: Testing & Documentation**
- Comprehensive testing
- User documentation
- API documentation
- Deployment preparation

## Testing Strategy

### Unit Testing
- Bearing calculation functions
- Formula validation
- Data serialization/deserialization
- Offline sync logic

### Integration Testing
- Editor component interactions
- Database operations
- File upload and linking
- Real-time collaboration

### Field Testing
- Mobile device compatibility
- Offline functionality
- GPS accuracy
- Performance under field conditions

### User Acceptance Testing
- Surveyor workflow validation
- Template effectiveness
- Integration with existing features
- Accessibility compliance

## Performance Considerations

### Mobile Optimization
- Lazy loading of editor extensions
- Efficient local storage management
- Optimized image handling
- Minimal bundle size for offline use

### Calculation Performance
- Cached calculation results
- Worker threads for complex calculations
- Progressive formula loading
- Memory-efficient data structures

### Network Efficiency
- Delta synchronization
- Compressed data transfer
- Background sync scheduling
- Intelligent conflict resolution

## Security & Privacy

### Data Protection
- End-to-end encryption for sensitive calculations
- Secure local storage encryption
- Audit trail for all changes
- Compliance with surveying regulations

### Access Control
- Role-based editing permissions
- Entry-level access control
- Supervisor override capabilities
- Audit logging for all operations

## Success Metrics

### User Engagement
- Daily diary entry creation rate
- Feature adoption (bearings, calculations, references)
- Time spent in diary vs. other features
- Template usage patterns

### Functionality Metrics
- Calculation accuracy and usage
- Reference linking frequency
- Offline usage patterns
- Sync success rates

### Performance Metrics
- Editor load time
- Calculation response time
- Sync completion time
- Mobile performance scores

## Future Enhancements

### Advanced Surveying Features
- CAD drawing integration
- Survey instrument data import
- Coordinate system transformations
- Advanced traverse calculations

### AI-Powered Features
- Smart content suggestions
- Automatic activity categorization
- Predictive text for common phrases
- Photo analysis and auto-tagging

### Workflow Automation
- Template auto-selection
- Scheduled entry reminders
- Progress tracking automation
- Report generation from entries

## Conclusion

This implementation plan provides a comprehensive roadmap for creating a powerful, surveying-specific digital diary system. The phased approach ensures steady progress while maintaining focus on user needs and technical excellence. The integration with existing TasFieldbook features creates a cohesive ecosystem that significantly enhances the surveying workflow.

The emphasis on offline functionality, mobile optimization, and surveying-specific tools makes this feature invaluable for field surveyors working in challenging conditions. The real-time collaboration features support the supervisor-candidate relationship central to surveying education and practice.

Success depends on close collaboration with surveying professionals throughout development, ensuring the tools meet real-world needs and integrate seamlessly into existing workflows.