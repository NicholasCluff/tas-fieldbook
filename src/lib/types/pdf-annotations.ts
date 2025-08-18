/**
 * Comprehensive PDF annotation types for TasFieldbook
 * Supporting all annotation features needed for surveying fieldwork
 */

// Base annotation interface
export interface PdfAnnotation {
  id: string
  type: AnnotationType
  pageNumber: number
  coordinates: AnnotationCoordinates
  properties: AnnotationProperties
  metadata: AnnotationMetadata
  created_at: string
  updated_at: string
  user_id: string
  project_id: string
}

// Annotation types supported
export type AnnotationType = 
  | 'freehand' 
  | 'text' 
  | 'highlight' 
  | 'rectangle' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'measurement' 
  | 'stamp' 
  | 'signature'

// Coordinate systems and geometry
export interface AnnotationCoordinates {
  // PDF coordinate system (bottom-left origin, points)
  pdfCoords: PdfCoordinates
  // Canvas coordinate system (top-left origin, pixels)
  canvasCoords: CanvasCoordinates
  // Page dimensions at time of creation
  pageWidth: number
  pageHeight: number
  scale: number
}

export interface PdfCoordinates {
  x: number
  y: number
  width?: number
  height?: number
  // For complex shapes (freehand, polygons)
  path?: PdfPoint[]
}

export interface CanvasCoordinates {
  x: number
  y: number
  width?: number
  height?: number
  // For complex shapes
  path?: CanvasPoint[]
}

export interface PdfPoint {
  x: number
  y: number
  pressure?: number // For stylus/touch input
}

export interface CanvasPoint {
  x: number
  y: number
  pressure?: number
}

// Visual properties
export interface AnnotationProperties {
  // Style properties
  strokeColor: string
  fillColor?: string
  strokeWidth: number
  opacity: number
  fillOpacity?: number
  
  // Text properties
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  
  // Content properties
  text?: string
  content?: string
  
  // Drawing properties
  lineCap?: 'butt' | 'round' | 'square'
  lineJoin?: 'bevel' | 'round' | 'miter'
  lineDash?: number[]
  
  // Measurement properties
  measurementValue?: number
  measurementUnit?: 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft'
  measurementType?: 'distance' | 'area' | 'angle'
  
  // Visibility
  visible: boolean
  locked: boolean
}

// Metadata and workflow
export interface AnnotationMetadata {
  // Content metadata
  title?: string
  description?: string
  tags?: string[]
  
  // Workflow metadata
  status?: 'draft' | 'review' | 'approved' | 'rejected'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  
  // Collaboration metadata
  comments?: AnnotationComment[]
  reviewedBy?: string
  approvedBy?: string
  
  // Survey-specific metadata
  surveyPoint?: string
  planReference?: string
  coordinates?: {
    latitude?: number
    longitude?: number
    elevation?: number
  }
  
  // Version control
  version: number
  parentId?: string
  revisions?: string[]
}

export interface AnnotationComment {
  id: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
}

// Drawing state and tools
export interface DrawingState {
  activeTool: AnnotationType | 'select' | 'pan' | 'zoom'
  isDrawing: boolean
  currentAnnotation?: Partial<PdfAnnotation>
  selectedAnnotations: string[]
  clipboard: PdfAnnotation[]
  
  // Drawing options
  currentProperties: Partial<AnnotationProperties>
  snapToGrid: boolean
  gridSize: number
  showGrid: boolean
  
  // View state
  zoom: number
  pan: { x: number; y: number }
  rotation: number
}

// Toolbar and UI state
export interface ToolbarState {
  activePanel: 'tools' | 'properties' | 'annotations' | 'layers' | null
  showThumbnails: boolean
  showMeasurements: boolean
  showComments: boolean
  
  // Tool groups
  drawingTools: AnnotationType[]
  selectionTools: ('select' | 'pan' | 'zoom')[]
  
  // Recent colors and styles
  recentColors: string[]
  recentStrokeWidths: number[]
}

// Layer management
export interface AnnotationLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  annotations: string[] // annotation IDs
  color: string
  order: number
}

// Export/Import formats
export interface AnnotationExport {
  format: 'json' | 'xfdf' | 'pdf' | 'fdf'
  includeComments: boolean
  includeMetadata: boolean
  flattened: boolean // Embed permanently in PDF
}

export interface AnnotationImport {
  format: 'json' | 'xfdf' | 'fdf'
  data: string | ArrayBuffer
  mergeStrategy: 'replace' | 'merge' | 'append'
}

// Viewer configuration
export interface PdfViewerConfig {
  // Display options
  enableThumbnails: boolean
  enableLayers: boolean
  enableMeasurements: boolean
  enableComments: boolean
  enableExport: boolean
  
  // Interaction options
  enableTouch: boolean
  enableKeyboardShortcuts: boolean
  enableContextMenu: boolean
  enableCollaboration: boolean
  
  // Performance options
  maxZoom: number
  minZoom: number
  renderAhead: number // Pages to pre-render
  cacheSize: number // Max annotations to cache
  
  // Survey-specific features
  enableCoordinateLinking: boolean
  enableMapIntegration: boolean
  enablePhotoOverlay: boolean
  defaultMeasurementUnit: 'mm' | 'cm' | 'm' | 'km'
  
  // Permissions
  readonly: boolean
  allowedTools: AnnotationType[]
  requireApproval: boolean
}

// Events
export interface AnnotationEvent {
  type: 'create' | 'update' | 'delete' | 'select' | 'deselect'
  annotation: PdfAnnotation
  previousState?: Partial<PdfAnnotation>
  user_id: string
  timestamp: string
}

export interface ViewerEvent {
  type: 'zoom' | 'pan' | 'page-change' | 'tool-change' | 'export' | 'import'
  data: any
  timestamp: string
}

// Measurement utilities
export interface MeasurementResult {
  value: number
  unit: string
  type: 'distance' | 'area' | 'angle'
  precision: number
  coordinates: PdfPoint[]
}

// Collaboration features
export interface CollaborationState {
  activeUsers: CollaborationUser[]
  cursors: UserCursor[]
  selections: UserSelection[]
  liveAnnotations: LiveAnnotation[]
}

export interface CollaborationUser {
  id: string
  name: string
  color: string
  isOnline: boolean
  lastSeen: string
}

export interface UserCursor {
  userId: string
  pageNumber: number
  coordinates: CanvasPoint
  color: string
}

export interface UserSelection {
  userId: string
  annotationIds: string[]
  color: string
}

export interface LiveAnnotation {
  userId: string
  annotation: Partial<PdfAnnotation>
  isTemporary: boolean
}

// Utility types
export type AnnotationFilter = {
  type?: AnnotationType[]
  user?: string[]
  dateRange?: { start: string; end: string }
  status?: ('draft' | 'review' | 'approved' | 'rejected')[]
  tags?: string[]
  layer?: string[]
}

export type AnnotationSort = {
  field: 'created_at' | 'updated_at' | 'type' | 'user' | 'page'
  direction: 'asc' | 'desc'
}