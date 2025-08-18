import { supabase } from '$lib/utils/supabase.js'
import type { 
  PlanAnnotation, 
  PlanAnnotationInsert, 
  PlanAnnotationUpdate,
  ServiceResult 
} from '$lib/types/database.js'
import type {
  PdfAnnotation,
  AnnotationType,
  AnnotationCoordinates,
  AnnotationProperties
} from '$lib/types/pdf-annotations.js'

interface CreatePdfAnnotationRequest {
  planId: string
  projectId: string
  annotation: PdfAnnotation
}

interface PdfAnnotationDbFormat {
  id?: string
  plan_id: string
  user_id: string
  annotation_type: PlanAnnotation['annotation_type']
  page_number: number
  coordinates: any // JSONB - store full coordinate system data
  content?: string
  style: any // JSONB - store full style properties
}

class PdfAnnotationsService {
  /**
   * Convert PDF annotation type to database annotation type
   */
  private mapAnnotationType(pdfType: AnnotationType): PlanAnnotation['annotation_type'] {
    const typeMap: Record<AnnotationType, PlanAnnotation['annotation_type']> = {
      'freehand': 'freehand',
      'text': 'text', 
      'highlight': 'highlight',
      'rectangle': 'rectangle',
      'circle': 'circle',
      'arrow': 'arrow',
      'line': 'markup', // Map line to markup for database compatibility
      'measurement': 'markup', // Map measurement to markup
      'stamp': 'markup', // Map stamp to markup
      'signature': 'markup' // Map signature to markup
    }
    return typeMap[pdfType] || 'markup'
  }

  /**
   * Convert PDF annotation to database format
   */
  private pdfAnnotationToDb(annotation: PdfAnnotation, planId: string, userId: string): PdfAnnotationDbFormat {
    return {
      id: annotation.id,
      plan_id: planId,
      user_id: userId,
      annotation_type: this.mapAnnotationType(annotation.type),
      page_number: annotation.pageNumber,
      coordinates: {
        // Store the full coordinate system data from PDF annotation
        pdfCoords: annotation.coordinates.pdfCoords,
        canvasCoords: annotation.coordinates.canvasCoords,
        pageWidth: annotation.coordinates.pageWidth,
        pageHeight: annotation.coordinates.pageHeight,
        scale: annotation.coordinates.scale
      },
      content: annotation.properties.text || annotation.properties.content,
      style: {
        // Store full style properties
        strokeColor: annotation.properties.strokeColor,
        fillColor: annotation.properties.fillColor,
        strokeWidth: annotation.properties.strokeWidth,
        opacity: annotation.properties.opacity,
        fillOpacity: annotation.properties.fillOpacity,
        fontSize: annotation.properties.fontSize,
        fontFamily: annotation.properties.fontFamily,
        fontWeight: annotation.properties.fontWeight,
        fontStyle: annotation.properties.fontStyle,
        textAlign: annotation.properties.textAlign,
        lineCap: annotation.properties.lineCap,
        lineJoin: annotation.properties.lineJoin,
        lineDash: annotation.properties.lineDash,
        measurementValue: annotation.properties.measurementValue,
        measurementUnit: annotation.properties.measurementUnit,
        measurementType: annotation.properties.measurementType,
        visible: annotation.properties.visible,
        locked: annotation.properties.locked
      }
    }
  }

  /**
   * Convert database annotation to PDF annotation format
   */
  private dbAnnotationToPdf(dbAnnotation: PlanAnnotation): PdfAnnotation {
    const coordinates = dbAnnotation.coordinates as any
    const style = dbAnnotation.style as any

    return {
      id: dbAnnotation.id,
      type: this.mapDbTypeToAnnotationType(dbAnnotation.annotation_type),
      pageNumber: dbAnnotation.page_number,
      coordinates: {
        pdfCoords: coordinates.pdfCoords || { x: 0, y: 0 },
        canvasCoords: coordinates.canvasCoords || { x: 0, y: 0 },
        pageWidth: coordinates.pageWidth || 800,
        pageHeight: coordinates.pageHeight || 600,
        scale: coordinates.scale || 1
      },
      properties: {
        strokeColor: style?.strokeColor || '#3B82F6',
        fillColor: style?.fillColor,
        strokeWidth: style?.strokeWidth || 2,
        opacity: style?.opacity || 1,
        fillOpacity: style?.fillOpacity,
        fontSize: style?.fontSize,
        fontFamily: style?.fontFamily,
        fontWeight: style?.fontWeight,
        fontStyle: style?.fontStyle,
        textAlign: style?.textAlign,
        text: dbAnnotation.content,
        content: dbAnnotation.content,
        lineCap: style?.lineCap,
        lineJoin: style?.lineJoin,
        lineDash: style?.lineDash,
        measurementValue: style?.measurementValue,
        measurementUnit: style?.measurementUnit,
        measurementType: style?.measurementType,
        visible: style?.visible !== false,
        locked: style?.locked || false
      },
      metadata: {
        title: '',
        description: '',
        tags: [],
        version: 1
      },
      created_at: dbAnnotation.created_at,
      updated_at: dbAnnotation.updated_at,
      user_id: dbAnnotation.user_id,
      project_id: '' // Will be filled from plan context
    }
  }

  /**
   * Map database annotation type back to PDF annotation type
   */
  private mapDbTypeToAnnotationType(dbType: PlanAnnotation['annotation_type']): AnnotationType {
    const typeMap: Record<PlanAnnotation['annotation_type'], AnnotationType> = {
      'freehand': 'freehand',
      'text': 'text',
      'highlight': 'highlight',
      'rectangle': 'rectangle', 
      'circle': 'circle',
      'arrow': 'arrow',
      'markup': 'freehand' // Default markup to freehand
    }
    return typeMap[dbType] || 'freehand'
  }

  /**
   * Get all annotations for a plan page
   */
  async getAnnotations(
    planId: string, 
    pageNumber?: number
  ): Promise<ServiceResult<PdfAnnotation[]>> {
    try {
      let query = supabase
        .from('plan_annotations')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('plan_id', planId)
        .order('created_at', { ascending: true })

      if (pageNumber !== undefined) {
        query = query.eq('page_number', pageNumber)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      const pdfAnnotations = (data || []).map(dbAnnotation => 
        this.dbAnnotationToPdf(dbAnnotation)
      )

      return { success: true, data: pdfAnnotations }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create a new PDF annotation
   */
  async createAnnotation(
    request: CreatePdfAnnotationRequest
  ): Promise<ServiceResult<PdfAnnotation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const dbFormat = this.pdfAnnotationToDb(request.annotation, request.planId, user.id)
      
      const insertData: PlanAnnotationInsert = {
        // Let database generate the UUID instead of using provided ID
        plan_id: dbFormat.plan_id,
        user_id: dbFormat.user_id,
        annotation_type: dbFormat.annotation_type,
        page_number: dbFormat.page_number,
        coordinates: dbFormat.coordinates,
        content: dbFormat.content,
        style: dbFormat.style
      }

      const { data, error } = await supabase
        .from('plan_annotations')
        .insert(insertData)
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const pdfAnnotation = this.dbAnnotationToPdf(data)
      pdfAnnotation.project_id = request.projectId

      return { success: true, data: pdfAnnotation }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(
    annotationId: string,
    annotation: PdfAnnotation,
    planId: string
  ): Promise<ServiceResult<PdfAnnotation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const dbFormat = this.pdfAnnotationToDb(annotation, planId, user.id)
      
      const updateData: PlanAnnotationUpdate = {
        annotation_type: dbFormat.annotation_type,
        page_number: dbFormat.page_number,
        coordinates: dbFormat.coordinates,
        content: dbFormat.content,
        style: dbFormat.style
      }

      const { data, error } = await supabase
        .from('plan_annotations')
        .update(updateData)
        .eq('id', annotationId)
        .eq('user_id', user.id) // Ensure user can only update their own annotations
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const pdfAnnotation = this.dbAnnotationToPdf(data)
      return { success: true, data: pdfAnnotation }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: string): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('plan_annotations')
        .delete()
        .eq('id', annotationId)
        .eq('user_id', user.id) // Ensure user can only delete their own annotations

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Bulk create annotations (for importing)
   */
  async createBulkAnnotations(
    planId: string,
    projectId: string,
    annotations: PdfAnnotation[]
  ): Promise<ServiceResult<PdfAnnotation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const insertData: PlanAnnotationInsert[] = annotations.map(annotation => {
        const dbFormat = this.pdfAnnotationToDb(annotation, planId, user.id)
        return {
          // Let database generate the UUID instead of using provided ID
          plan_id: dbFormat.plan_id,
          user_id: dbFormat.user_id,
          annotation_type: dbFormat.annotation_type,
          page_number: dbFormat.page_number,
          coordinates: dbFormat.coordinates,
          content: dbFormat.content,
          style: dbFormat.style
        }
      })

      const { data, error } = await supabase
        .from('plan_annotations')
        .insert(insertData)
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)

      if (error) {
        return { success: false, error: error.message }
      }

      const pdfAnnotations = (data || []).map(dbAnnotation => {
        const pdfAnnotation = this.dbAnnotationToPdf(dbAnnotation)
        pdfAnnotation.project_id = projectId
        return pdfAnnotation
      })

      return { success: true, data: pdfAnnotations }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Check if user can edit annotations for a plan
   */
  async canEditAnnotations(planId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has access to the project containing this plan
      const { data, error } = await supabase
        .from('survey_plans')
        .select(`
          project:projects(owner_id, supervisor_id)
        `)
        .eq('id', planId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const canEdit = data.project.owner_id === user.id || data.project.supervisor_id === user.id
      return { success: true, data: canEdit }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get annotation statistics for a plan
   */
  async getAnnotationStats(planId: string): Promise<ServiceResult<{
    total_annotations: number
    by_type: Record<string, number>
    by_page: Record<number, number>
  }>> {
    try {
      const { data, error } = await supabase
        .from('plan_annotations')
        .select('annotation_type, page_number')
        .eq('plan_id', planId)

      if (error) {
        return { success: false, error: error.message }
      }

      const stats = {
        total_annotations: data.length,
        by_type: {} as Record<string, number>,
        by_page: {} as Record<number, number>
      }

      data.forEach(annotation => {
        // Count by type
        stats.by_type[annotation.annotation_type] = (stats.by_type[annotation.annotation_type] || 0) + 1
        
        // Count by page
        stats.by_page[annotation.page_number] = (stats.by_page[annotation.page_number] || 0) + 1
      })

      return { success: true, data: stats }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

// Export singleton instance
export const pdfAnnotationsService = new PdfAnnotationsService()
export default pdfAnnotationsService