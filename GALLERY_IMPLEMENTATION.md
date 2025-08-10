# Photo Gallery Implementation Plan

## Overview

This document outlines the implementation plan for the photo gallery feature in TasFieldbook. The gallery will provide quick camera access, photo upload capabilities, metadata management, and map integration for land surveyors working in the field.

## Current State Analysis

### Existing Components
- **PhotoOverlay.svelte**: Basic photo management UI with filtering, clustering, and viewer modal
- **Database Schema**: `photos` table with location, metadata, and project associations
- **Types**: Photo type defined in `database.ts` 
- **Architecture**: SvelteKit + Supabase + PWA with offline-first design

### Missing Components
- Camera access functionality
- File upload mechanisms
- Supabase storage integration
- EXIF metadata extraction
- Offline storage and sync
- Photos route structure

## Implementation Architecture

### 1. Technical Stack

#### Core APIs
- **Camera Access**: getUserMedia API with fallback to file input
- **File Handling**: File API + drag-and-drop for existing photos
- **Location Services**: Geolocation API for GPS coordinates
- **Metadata Extraction**: EXIF.js library for image metadata
- **Offline Storage**: IndexedDB for local photo cache
- **File Storage**: Supabase Storage for cloud hosting

#### Libraries Required
```bash
npm install exif-js idb
npm install @types/exif-js --save-dev
```

### 2. Folder Structure

```
src/
├── routes/(app)/projects/[id]/
│   └── photos/
│       ├── +page.svelte              # Main photo gallery interface
│       ├── +layout.svelte            # Photos layout with navigation
│       ├── new/
│       │   └── +page.svelte          # Camera capture interface
│       ├── upload/
│       │   └── +page.svelte          # File upload interface
│       └── [photoId]/
│           ├── +page.svelte          # Individual photo view/edit
│           └── edit/
│               └── +page.svelte      # Photo metadata editing
├── lib/
│   ├── components/photos/
│   │   ├── CameraCapture.svelte      # Camera interface component
│   │   ├── PhotoUpload.svelte        # File upload component
│   │   ├── PhotoGrid.svelte          # Grid view for photos
│   │   ├── PhotoCard.svelte          # Individual photo card
│   │   ├── PhotoEditor.svelte        # Metadata editing form
│   │   ├── PhotoViewer.svelte        # Full-screen photo viewer
│   │   └── LocationPicker.svelte     # Manual location setting
│   ├── services/
│   │   ├── photos.service.ts         # Photo CRUD operations
│   │   ├── camera.service.ts         # Camera access utilities
│   │   ├── metadata.service.ts       # EXIF extraction utilities
│   │   └── offline.service.ts        # Offline sync management
│   └── utils/
│       ├── imageUtils.ts             # Image processing utilities
│       ├── locationUtils.ts          # GPS/location helpers
│       └── storageUtils.ts           # IndexedDB helpers
```

## 3. Core Implementation Details

### 3.1 Camera Service

```typescript
// lib/services/camera.service.ts
export class CameraService {
  async requestCameraAccess(): Promise<MediaStream | null>
  async capturePhoto(stream: MediaStream): Promise<Blob>
  async stopCamera(stream: MediaStream): void
  getSupportedConstraints(): MediaTrackConstraints
}
```

**Features:**
- Progressive enhancement (camera → file input fallback)
- Multiple camera support (front/back on mobile)
- Photo resolution optimization for field use
- Error handling for permission denials

### 3.2 Photos Service

```typescript
// lib/services/photos.service.ts
export class PhotosService {
  // CRUD Operations
  async getProjectPhotos(projectId: string): Promise<Photo[]>
  async uploadPhoto(file: File, metadata: PhotoMetadata): Promise<Photo>
  async updatePhoto(photoId: string, updates: Partial<Photo>): Promise<Photo>
  async deletePhoto(photoId: string): Promise<void>
  
  // Storage Management
  async uploadToSupabase(file: File, path: string): Promise<string>
  async downloadFromSupabase(path: string): Promise<Blob>
  
  // Offline Support
  async saveToIndexedDB(photo: Photo, blob: Blob): Promise<void>
  async syncOfflinePhotos(): Promise<void>
  async getOfflinePhotos(): Promise<Photo[]>
}
```

### 3.3 Metadata Service

```typescript
// lib/services/metadata.service.ts
export class MetadataService {
  async extractEXIF(file: File): Promise<PhotoMetadata>
  async getCurrentLocation(): Promise<Coordinates | null>
  async enrichPhotoData(file: File): Promise<PhotoWithMetadata>
  parseGPSData(exifData: any): Coordinates | null
}
```

**Metadata Extraction:**
- GPS coordinates from EXIF (if available)
- Camera make/model, exposure settings
- Timestamp from EXIF or file metadata
- Image dimensions and file size
- Manual location override capability

### 3.4 Offline Storage Strategy

#### IndexedDB Schema
```typescript
// Database: fieldbook-photos
// Store: photos
interface OfflinePhoto {
  id: string
  projectId: string
  blob: Blob
  metadata: PhotoMetadata
  syncStatus: 'pending' | 'synced' | 'error'
  createdAt: Date
  lastSyncAttempt?: Date
}
```

#### Sync Strategy
1. **Immediate Upload**: When online, upload directly to Supabase
2. **Offline Queue**: Store in IndexedDB when offline
3. **Background Sync**: Service worker handles retry logic
4. **Conflict Resolution**: Last-write-wins for metadata updates

## 4. User Interface Design

### 4.1 Main Photos Route (`/projects/[id]/photos`)

**Layout:**
- Header with camera/upload buttons
- Filter controls (location, date, user)
- Grid/list view toggle
- Photo count and storage usage

**Components:**
- PhotoGrid: Responsive grid with thumbnails
- Quick actions: View, edit, delete, set location
- Infinite scroll for large galleries

### 4.2 Camera Capture (`/projects/[id]/photos/new`)

**Features:**
- Live camera preview
- Capture button with feedback
- Front/back camera toggle (mobile)
- Flash control
- Grid overlay for composition
- Immediate location capture
- Quick retake/accept workflow

### 4.3 File Upload (`/projects/[id]/photos/upload`)

**Features:**
- Drag-and-drop interface
- Multiple file selection
- Progress indicators
- EXIF metadata preview
- Batch location setting
- Upload queue management

### 4.4 Photo Editor (`/projects/[id]/photos/[photoId]/edit`)

**Features:**
- Title and description editing
- Location picker (map integration)
- Manual GPS coordinate entry
- EXIF metadata display
- Timestamp editing
- Delete confirmation

## 5. Map Integration

### 5.1 Photo Markers
- Cluster photos within 50m radius
- Color-coded by date/user
- Popup preview on hover
- Click to open photo viewer

### 5.2 Location Setting
- Drag markers to update photo location
- Crosshair tool for precise positioning
- Batch location assignment
- GPS accuracy indicators

## 6. Mobile Optimization

### 6.1 Touch Interface
- Large touch targets for field use
- Swipe gestures in photo viewer
- Pull-to-refresh for sync
- Haptic feedback for actions

### 6.2 Performance
- Image compression for mobile upload
- Progressive JPEG loading
- Thumbnail generation
- Memory management for large galleries

### 6.3 Offline Considerations
- Clear offline status indicators
- Sync progress feedback
- Storage quota management
- Low storage warnings

## 7. Security & Privacy

### 7.1 Permissions
- Camera permission request flow
- Location permission handling
- File access permissions
- Clear permission explanations

### 7.2 Data Protection
- EXIF stripping for sensitive data
- Location data encryption
- Secure Supabase storage
- RLS policy enforcement

## 8. Implementation Phases

### Phase 1: Basic Photo Management (Week 1-2)
- [ ] Create photos route structure
- [ ] Implement PhotosService with Supabase integration
- [ ] Build basic PhotoGrid and PhotoCard components
- [ ] Add file upload functionality
- [ ] Implement EXIF metadata extraction

### Phase 2: Camera Integration (Week 2-3)
- [ ] Implement CameraService
- [ ] Build CameraCapture component
- [ ] Add photo capture functionality
- [ ] Implement progressive enhancement fallbacks
- [ ] Add location capture during photo taking

### Phase 3: Offline Support (Week 3-4)
- [ ] Implement IndexedDB storage
- [ ] Add offline sync service
- [ ] Build service worker for background sync
- [ ] Add offline status indicators
- [ ] Implement conflict resolution

### Phase 4: Map Integration (Week 4-5)
- [ ] Integrate photos with existing map component
- [ ] Add photo clustering on map
- [ ] Implement location picker
- [ ] Add drag-to-reposition functionality
- [ ] Build batch location assignment

### Phase 5: Enhanced Features (Week 5-6)
- [ ] Build photo editor interface
- [ ] Add batch operations
- [ ] Implement search and filtering
- [ ] Add photo analytics
- [ ] Performance optimization

### Phase 6: Polish & Testing (Week 6-7)
- [ ] Mobile optimization
- [ ] Cross-browser testing
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation updates

## 9. Testing Strategy

### 9.1 Unit Tests
- Service layer testing
- Metadata extraction validation
- Offline sync logic
- Image processing utilities

### 9.2 Integration Tests
- Camera API integration
- Supabase storage operations
- Map component integration
- Cross-component data flow

### 9.3 E2E Tests
- Complete photo capture workflow
- Upload and metadata editing
- Offline/online sync scenarios
- Mobile device testing

### 9.4 Performance Tests
- Large gallery loading
- Image compression efficiency
- Memory usage monitoring
- Network bandwidth optimization

## 10. Success Metrics

### 10.1 Functional Metrics
- Photo upload success rate > 95%
- Camera access success rate > 90%
- Metadata extraction accuracy > 98%
- Offline sync reliability > 95%

### 10.2 Performance Metrics
- Photo capture time < 3 seconds
- Upload time < 10 seconds per photo
- Gallery load time < 2 seconds
- Map integration response < 1 second

### 10.3 User Experience Metrics
- Task completion rate for photo workflow
- User satisfaction scores
- Error rate reduction
- Feature adoption rates

## 11. Future Enhancements

### 11.1 Advanced Features
- Photo annotations and markup
- AR location overlay
- Voice notes attached to photos
- Photo comparison tools
- Automated backup scheduling

### 11.2 Integration Opportunities
- Diary entry photo embedding
- Survey document photo attachment
- Photo-based measurement tools
- AI-powered image analysis
- Team photo sharing workflows

## Conclusion

This implementation plan provides a comprehensive roadmap for building a robust, offline-first photo gallery feature that meets the specific needs of land surveyors working in the field. The phased approach ensures progressive delivery of value while maintaining system stability and user experience quality.