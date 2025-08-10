# Map Implementation Plan
## TasFieldbook Interactive Map Feature

### Overview
This document outlines the comprehensive implementation plan for the interactive map feature in TasFieldbook. The map will integrate with Tasmanian government WMS services, support custom annotations, and display project photos spatially.

### Technical Architecture

#### Core Technologies
- **Leaflet 1.9.4** - Primary mapping library (already installed)
- **svelte-leafletjs 2.0.0** - Svelte wrapper for Leaflet (already installed)  
- **Supabase** - Backend storage for annotations and map configurations
- **TailwindCSS v4** - Styling and responsive design

#### Component Structure
```
src/lib/components/map/
├── MapContainer.svelte          # Main map component wrapper
├── MapControls.svelte           # Map control panel (layers, tools)
├── WMSLayerManager.svelte       # WMS layer configuration
├── AnnotationTools.svelte       # Drawing tools for annotations
├── PhotoOverlay.svelte          # Photo markers and popups
├── LayerLegend.svelte           # Map legend component
└── MapSettings.svelte           # Map preferences and configuration
```

### Database Schema Extensions

#### Map Annotations Table
```sql
CREATE TABLE map_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon')),
  geometry JSONB NOT NULL, -- GeoJSON geometry
  properties JSONB DEFAULT '{}', -- Style and metadata
  label TEXT,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  stroke_width INTEGER DEFAULT 2,
  fill_opacity DECIMAL(3,2) DEFAULT 0.3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX map_annotations_project_id_idx ON map_annotations(project_id);
CREATE INDEX map_annotations_type_idx ON map_annotations(type);
```

#### Map Configurations Table
```sql
CREATE TABLE map_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  name VARCHAR(255) NOT NULL,
  center_lat DECIMAL(10,8) NOT NULL DEFAULT -41.4545,
  center_lng DECIMAL(11,8) NOT NULL DEFAULT 145.9707,
  zoom_level INTEGER NOT NULL DEFAULT 10,
  base_layer VARCHAR(255) DEFAULT 'osm',
  wms_layers JSONB DEFAULT '[]',
  layer_opacity JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX map_configurations_project_id_idx ON map_configurations(project_id);
```

#### WMS Layer Sources Table
```sql
CREATE TABLE wms_layer_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  layers TEXT NOT NULL, -- Comma-separated layer names
  format VARCHAR(50) DEFAULT 'image/png',
  version VARCHAR(10) DEFAULT '1.1.1',
  crs VARCHAR(50) DEFAULT 'EPSG:4326',
  attribution TEXT,
  description TEXT,
  category VARCHAR(100), -- e.g., 'cadastral', 'topographic', 'geological'
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default Tasmania WMS layers
INSERT INTO wms_layer_sources (name, url, layers, category, attribution, description) VALUES
('LIST Cadastre', 'https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer', 'Parcels,Boundaries', 'cadastral', 'Land Information System Tasmania', 'Tasmanian cadastral boundaries and parcels'),
('MRT Geology', 'https://www.mrt.tas.gov.au/erdas-iws/ogc/wms/', 'GeologyPolygons', 'geological', 'Mineral Resources Tasmania', 'Geological formations and rock types');
```

### WMS Integration

#### Tasmanian Government WMS Services
1. **LIST Cadastre and Administrative**
   - URL: `https://services.thelist.tas.gov.au/arcgis/services/Public/CadastreAndAdministrative/MapServer/WMSServer`
   - Layers: Parcels, Boundaries, Local Government Areas
   - CRS: EPSG:4326, EPSG:28355, EPSG:3857

2. **Mineral Resources Tasmania**
   - URL: `https://www.mrt.tas.gov.au/erdas-iws/ogc/wms/`
   - Layers: GeologyPolygons, Geophysics data
   - CRS: EPSG:4326, EPSG:4283, EPSG:28355

#### WMS Layer Management
- Dynamic layer loading and configuration
- Layer opacity controls (0-100%)
- Layer ordering and visibility toggles
- Custom styling where supported
- Caching for offline access

### Annotation System

#### Drawing Tools
1. **Point Annotations**
   - Click to place markers
   - Custom icons and colors
   - Labels and descriptions
   - Popup editing interface

2. **Line Annotations**
   - Polyline drawing
   - Measurement display (distance)
   - Stroke width and color options
   - Dashed line patterns

3. **Polygon Annotations**
   - Area drawing with click-to-close
   - Area measurement (hectares/acres)
   - Fill color and opacity
   - Stroke customization

#### Annotation Features
- **Labeling System**: Rich text labels with custom positioning
- **Style Customization**: Color picker, stroke width, opacity controls
- **Measurement Tools**: Automatic distance and area calculations
- **Snapping**: Snap to grid, existing features, or coordinates
- **Import/Export**: GeoJSON import/export functionality
- **Collaboration**: Real-time annotation sharing between project members

### Photo Integration

#### Spatial Photo Display
1. **EXIF Metadata Extraction**
   - GPS coordinates from photo metadata
   - Automatic placement on map
   - Timestamp and camera information
   - Direction/bearing if available

2. **Manual Photo Placement**
   - Drag-and-drop interface for photos without GPS
   - Click-to-place functionality
   - Coordinate input fields
   - Batch placement tools

#### Photo Overlay Features
- **Clustering**: Group nearby photos to reduce clutter
- **Popup Galleries**: Thumbnail previews with full-size viewer
- **Photo Filtering**: Filter by date, user, or tags
- **Photo Annotation**: Link photos to map annotations
- **Offline Sync**: Cache photos for offline map viewing

### Service Layer Architecture

#### Map Service (`src/lib/services/map.service.ts`)
```typescript
export class MapService {
  // Annotation CRUD operations
  async createAnnotation(projectId: string, annotation: AnnotationData): Promise<Result<Annotation>>
  async updateAnnotation(id: string, updates: Partial<AnnotationData>): Promise<Result<Annotation>>
  async deleteAnnotation(id: string): Promise<Result<void>>
  async getProjectAnnotations(projectId: string): Promise<Result<Annotation[]>>

  // Map configuration management
  async saveMapConfiguration(projectId: string, config: MapConfig): Promise<Result<MapConfiguration>>
  async loadMapConfiguration(projectId: string): Promise<Result<MapConfiguration>>
  
  // WMS layer operations
  async getAvailableWMSLayers(): Promise<Result<WMSLayer[]>>
  async testWMSConnection(url: string): Promise<Result<boolean>>
}
```

#### Photo Service Extensions
```typescript
export class PhotoService {
  // Spatial photo operations
  async extractPhotoMetadata(file: File): Promise<Result<PhotoMetadata>>
  async getPhotosInBounds(projectId: string, bounds: LatLngBounds): Promise<Result<Photo[]>>
  async updatePhotoLocation(photoId: string, lat: number, lng: number): Promise<Result<Photo>>
}
```

### Component Implementation Details

#### MapContainer.svelte
```typescript
// Core map initialization and event handling
let map: Map
let annotations: Annotation[] = []
let photos: Photo[] = []
let currentTool: 'select' | 'point' | 'line' | 'polygon' = 'select'

// Reactive map updates
$: if (map && annotations) {
  updateAnnotationLayers()
}

$: if (map && photos) {
  updatePhotoMarkers()
}
```

#### WMSLayerManager.svelte
```typescript
// WMS layer configuration and management
let wmsLayers: WMSLayer[] = []
let activeLayerIds: string[] = []
let layerOpacity: Record<string, number> = {}

// Dynamic WMS layer loading
function addWMSLayer(layer: WMSLayer) {
  const wmsLayer = L.tileLayer.wms(layer.url, {
    layers: layer.layers,
    format: layer.format,
    transparent: true,
    opacity: layerOpacity[layer.id] || 1
  })
  map.addLayer(wmsLayer)
}
```

#### AnnotationTools.svelte
```typescript
// Drawing tool management
let drawingLayer: FeatureGroup
let currentDrawControl: Control.Draw

// Tool-specific drawing controls
function enablePointTool() {
  currentDrawControl = new L.Control.Draw({
    draw: {
      marker: true,
      polyline: false,
      polygon: false,
      circle: false,
      rectangle: false
    }
  })
}
```

### Routing Structure

#### Map Routes
```
src/routes/(app)/projects/[id]/map/
├── +page.svelte              # Main map view
├── +page.server.ts           # Server-side map data loading
├── annotations/
│   ├── +page.svelte          # Annotation management
│   └── [annotationId]/
│       ├── +page.svelte      # Edit annotation
│       └── +page.server.ts   # Annotation CRUD
├── layers/
│   ├── +page.svelte          # WMS layer configuration
│   └── +page.server.ts       # Layer management
└── settings/
    ├── +page.svelte          # Map preferences
    └── +page.server.ts       # Configuration persistence
```

### Implementation Phases

#### Phase 1: Basic Map Infrastructure (Week 1-2)
- [ ] Create map component structure
- [ ] Implement basic Leaflet integration
- [ ] Add base map layers (OSM, satellite)
- [ ] Create map routing and navigation
- [ ] Implement basic map controls (zoom, pan, layer switcher)

#### Phase 2: WMS Integration (Week 2-3)
- [ ] Research and document Tasmania WMS endpoints
- [ ] Implement WMS layer service
- [ ] Create layer management interface
- [ ] Add layer opacity and visibility controls
- [ ] Test with LIST and MRT services

#### Phase 3: Annotation System (Week 3-4)
- [ ] Design annotation database schema
- [ ] Implement drawing tools (point, line, polygon)
- [ ] Create annotation editing interface
- [ ] Add labeling and styling options
- [ ] Implement measurement tools

#### Phase 4: Photo Integration (Week 4-5)
- [ ] Extend photo service for spatial features
- [ ] Implement EXIF metadata extraction
- [ ] Create photo marker system
- [ ] Add manual photo placement
- [ ] Implement photo clustering

#### Phase 5: Advanced Features (Week 5-6)
- [ ] Add offline map caching
- [ ] Implement real-time collaboration
- [ ] Create import/export functionality
- [ ] Add advanced styling options
- [ ] Performance optimization

#### Phase 6: Testing and Refinement (Week 6-7)
- [ ] Comprehensive testing on mobile devices
- [ ] Performance testing with large datasets
- [ ] User acceptance testing
- [ ] Bug fixes and optimizations
- [ ] Documentation completion

### Technical Considerations

#### Performance Optimization
- **Vector Tile Caching**: Cache WMS layers as vector tiles for faster loading
- **Annotation Clustering**: Group nearby annotations to improve render performance
- **Photo Lazy Loading**: Load photo thumbnails on demand
- **Map Viewport Management**: Only load annotations/photos in visible area
- **Service Worker Caching**: Cache map tiles and annotations for offline use

#### Mobile Responsiveness
- **Touch-Friendly Controls**: Large touch targets for drawing tools
- **Responsive Layout**: Collapsible sidebars and adaptive UI
- **Gesture Support**: Pinch-to-zoom, touch drawing
- **Orientation Handling**: Adapt to landscape/portrait modes
- **Reduced Data Usage**: Optimize for mobile data connections

#### Security and Privacy
- **Data Validation**: Validate all GeoJSON inputs
- **Access Control**: Project-based annotation permissions
- **Photo Privacy**: Secure photo storage and access
- **WMS Authentication**: Support for authenticated WMS services
- **Input Sanitization**: Prevent XSS in annotation labels

#### Offline Capabilities
- **Map Tile Caching**: Download map tiles for offline viewing
- **Annotation Sync**: Queue annotation changes for later sync
- **Photo Caching**: Store compressed photos locally
- **Conflict Resolution**: Handle offline-to-online sync conflicts
- **Progressive Web App**: Enable offline functionality through service workers

### Dependencies and Integrations

#### Additional NPM Packages Required
```json
{
  "leaflet-draw": "^1.0.4",
  "leaflet.markercluster": "^1.5.3",
  "exifreader": "^4.15.0",
  "@turf/turf": "^6.5.0",
  "proj4": "^2.9.0"
}
```

#### Leaflet Plugins
- **Leaflet.draw**: Drawing and editing tools
- **Leaflet.markercluster**: Photo marker clustering
- **Leaflet.Control.Layers**: Enhanced layer control
- **Leaflet.measure**: Distance and area measurement
- **Leaflet.offline**: Offline map functionality

### Testing Strategy

#### Unit Testing
- Map service CRUD operations
- Annotation geometry validation
- Photo metadata extraction
- WMS layer configuration

#### Integration Testing
- Map component interaction
- Database annotation persistence
- Photo-map integration
- WMS layer loading

#### End-to-End Testing
- Complete map workflow testing
- Mobile device testing
- Offline functionality testing
- Performance testing with large datasets

### Success Metrics
- Map loads within 3 seconds on mobile
- Supports 1000+ annotations per project
- 99% uptime for WMS layer access
- Offline functionality works for 24+ hours
- Mobile-responsive design passes accessibility standards

### Future Enhancements
- **3D Visualization**: Integrate terrain and building models
- **Time-Series Data**: Animated layer changes over time
- **Advanced Analytics**: Spatial analysis tools
- **AR Integration**: Augmented reality field viewing
- **Custom Symbology**: Advanced styling and cartographic options

This implementation plan provides a comprehensive roadmap for developing a robust, feature-rich mapping solution tailored to the needs of Tasmanian land surveyors working in field conditions.