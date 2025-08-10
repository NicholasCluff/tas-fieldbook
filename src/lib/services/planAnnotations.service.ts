import { supabase } from '$lib/utils/supabase.js'
import type { 
  PlanAnnotation, 
  PlanAnnotationInsert, 
  PlanAnnotationUpdate,
  AnnotationCoordinates,
  AnnotationStyle,
  ServiceResult 
} from '$lib/types/database.js'

interface CreateAnnotationRequest {
  planId: string
  annotationType: PlanAnnotation['annotation_type']
  pageNumber: number
  coordinates: AnnotationCoordinates
  content?: string
  style?: AnnotationStyle
}

class PlanAnnotationsService {
  /**
   * Get all annotations for a plan
   */
  async getAnnotations(
    planId: string, 
    pageNumber?: number
  ): Promise<ServiceResult<PlanAnnotation[]>> {
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

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get a single annotation by ID
   */
  async getAnnotation(annotationId: string): Promise<ServiceResult<PlanAnnotation>> {
    try {
      const { data, error } = await supabase
        .from('plan_annotations')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('id', annotationId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create a new annotation
   */
  async createAnnotation(
    annotationData: CreateAnnotationRequest
  ): Promise<ServiceResult<PlanAnnotation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const insertData: PlanAnnotationInsert = {
        plan_id: annotationData.planId,
        user_id: user.id,
        annotation_type: annotationData.annotationType,
        page_number: annotationData.pageNumber,
        coordinates: annotationData.coordinates as any, // JSONB
        content: annotationData.content,
        style: annotationData.style as any // JSONB
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

      return { success: true, data }
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
    updates: Partial<CreateAnnotationRequest>
  ): Promise<ServiceResult<PlanAnnotation>> {
    try {
      const updateData: PlanAnnotationUpdate = {}

      if (updates.annotationType) updateData.annotation_type = updates.annotationType
      if (updates.pageNumber !== undefined) updateData.page_number = updates.pageNumber
      if (updates.coordinates) updateData.coordinates = updates.coordinates as any
      if (updates.content !== undefined) updateData.content = updates.content
      if (updates.style) updateData.style = updates.style as any

      const { data, error } = await supabase
        .from('plan_annotations')
        .update(updateData)
        .eq('id', annotationId)
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
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
      const { error } = await supabase
        .from('plan_annotations')
        .delete()
        .eq('id', annotationId)

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
   * Bulk create annotations (for importing or copying)
   */
  async createBulkAnnotations(
    annotations: CreateAnnotationRequest[]
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const insertData: PlanAnnotationInsert[] = annotations.map(annotation => ({
        plan_id: annotation.planId,
        user_id: user.id,
        annotation_type: annotation.annotationType,
        page_number: annotation.pageNumber,
        coordinates: annotation.coordinates as any,
        content: annotation.content,
        style: annotation.style as any
      }))

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

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Delete all annotations for a plan
   */
  async deleteAllPlanAnnotations(planId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('plan_annotations')
        .delete()
        .eq('plan_id', planId)

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
   * Copy annotations from one plan to another
   */
  async copyAnnotations(
    sourcePlanId: string, 
    targetPlanId: string
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get source annotations
      const sourceResult = await this.getAnnotations(sourcePlanId)
      if (!sourceResult.success || !sourceResult.data) {
        return { success: false, error: 'Failed to fetch source annotations' }
      }

      // Create copies for target plan
      const copyData: CreateAnnotationRequest[] = sourceResult.data.map(annotation => ({
        planId: targetPlanId,
        annotationType: annotation.annotation_type,
        pageNumber: annotation.page_number,
        coordinates: annotation.coordinates as AnnotationCoordinates,
        content: annotation.content,
        style: annotation.style as AnnotationStyle
      }))

      return await this.createBulkAnnotations(copyData)
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
    by_user: Record<string, { name: string; count: number }>
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_plan_annotation_stats', { plan_uuid: planId })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || {
        total_annotations: 0,
        by_type: {},
        by_page: {},
        by_user: {}
      }}
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Search annotations by content
   */
  async searchAnnotations(
    planId: string, 
    searchTerm: string
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_annotations')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('plan_id', planId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get annotations by user
   */
  async getUserAnnotations(
    planId: string, 
    userId: string
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_annotations')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('plan_id', planId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get annotations by type
   */
  async getAnnotationsByType(
    planId: string, 
    annotationType: PlanAnnotation['annotation_type']
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_annotations')
        .select(`
          *,
          user:profiles(first_name, last_name)
        `)
        .eq('plan_id', planId)
        .eq('annotation_type', annotationType)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Export annotations as JSON
   */
  async exportAnnotations(planId: string): Promise<ServiceResult<string>> {
    try {
      const result = await this.getAnnotations(planId)
      if (!result.success || !result.data) {
        return { success: false, error: 'Failed to fetch annotations' }
      }

      const exportData = {
        plan_id: planId,
        exported_at: new Date().toISOString(),
        annotations: result.data.map(annotation => ({
          id: annotation.id,
          type: annotation.annotation_type,
          page: annotation.page_number,
          coordinates: annotation.coordinates,
          content: annotation.content,
          style: annotation.style,
          created_at: annotation.created_at,
          user: annotation.user
        }))
      }

      return { success: true, data: JSON.stringify(exportData, null, 2) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Import annotations from JSON
   */
  async importAnnotations(
    planId: string, 
    jsonData: string
  ): Promise<ServiceResult<PlanAnnotation[]>> {
    try {
      const importData = JSON.parse(jsonData)
      
      if (!importData.annotations || !Array.isArray(importData.annotations)) {
        return { success: false, error: 'Invalid import data format' }
      }

      const annotations: CreateAnnotationRequest[] = importData.annotations.map((annotation: any) => ({
        planId,
        annotationType: annotation.type,
        pageNumber: annotation.page,
        coordinates: annotation.coordinates,
        content: annotation.content,
        style: annotation.style
      }))

      return await this.createBulkAnnotations(annotations)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse import data' 
      }
    }
  }

  /**
   * Check if user can edit annotations on a plan
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
}

// Export singleton instance
export const planAnnotationsService = new PlanAnnotationsService()
export default planAnnotationsService