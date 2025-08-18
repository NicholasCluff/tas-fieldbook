import { supabase } from '$lib/utils/supabase.js'
import type { 
  SurveyPlan, 
  SurveyPlanInsert, 
  SurveyPlanUpdate,
  SurveyPlanWithDetails,
  SurveyPlanWithTags,
  PlanFilters,
  ServiceResult 
} from '$lib/types/database.js'

class SurveyPlansService {
  /**
   * Get all survey plans for a project with optional filtering
   */
  async listPlans(
    projectId: string, 
    filters?: PlanFilters
  ): Promise<ServiceResult<SurveyPlanWithDetails[]>> {
    try {
      let query = supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          search_document:search_documents(title, status),
          annotations_count:plan_annotations(count)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')

      // Apply filters
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`)
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.starred_only) {
        query = query.eq('is_starred', true)
      }

      // Apply sorting with special handling for starred plans
      const sortBy = filters?.sort_by || 'created_at'
      const sortOrder = filters?.sort_order || 'desc'
      
      // Always prioritize starred plans first, then apply secondary sort
      if (sortBy === 'is_starred') {
        query = query.order('is_starred', { ascending: false })
        query = query.order('created_at', { ascending: sortOrder === 'asc' })
      } else {
        query = query.order('is_starred', { ascending: false })
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      // Get relationship counts for all plans
      const relationshipCounts = await this.getRelationshipCounts(projectId)

      // Process the data to match our expected format
      const plans: SurveyPlanWithDetails[] = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        annotations_count: plan.annotations_count?.[0]?.count || 0,
        relationships_count: relationshipCounts[plan.id] || 0
      }))

      // Filter by tags if specified
      let filteredPlans = plans
      if (filters?.tags && filters.tags.length > 0) {
        filteredPlans = plans.filter(plan => 
          plan.tags?.some(tag => filters.tags!.includes(tag.id))
        )
      }

      return { success: true, data: filteredPlans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get a single survey plan with all its details
   */
  async getPlan(planId: string): Promise<ServiceResult<SurveyPlanWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          search_document:search_documents(title, status, file_path),
          annotations_count:plan_annotations(count)
        `)
        .eq('id', planId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Get relationship count for this specific plan
      const relationshipCount = await this.getPlanRelationshipCount(planId)

      const plan: SurveyPlanWithDetails = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        annotations_count: data.annotations_count?.[0]?.count || 0,
        relationships_count: relationshipCount
      }

      return { success: true, data: plan }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create a new survey plan
   */
  async createPlan(planData: SurveyPlanInsert): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('survey_plans')
        .insert({
          ...planData,
          created_by: user.id
        })
        .select()
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
   * Update a survey plan
   */
  async updatePlan(
    planId: string, 
    updates: SurveyPlanUpdate
  ): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans')
        .update(updates)
        .eq('id', planId)
        .select()
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
   * Delete a survey plan (soft delete by setting status to 'deleted')
   */
  async deletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('survey_plans')
        .update({ status: 'deleted' })
        .eq('id', planId)

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
   * Permanently delete a survey plan and its file
   */
  async permanentlyDeletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      // First get the plan to find the file path
      const { data: plan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('file_path')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Delete from database (this will cascade to annotations, relationships, etc.)
      const { error: deleteError } = await supabase
        .from('survey_plans')
        .delete()
        .eq('id', planId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Delete file from storage
      if (plan.file_path) {
        await supabase.storage
          .from('project-files')
          .remove([plan.file_path])
        // Note: We don't fail if file deletion fails
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
   * Get plans by search document ID
   */
  async getPlansByDocument(documentId: string): Promise<ServiceResult<SurveyPlanWithTags[]>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans_with_tags')
        .select('*')
        .eq('search_document_id', documentId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      const plans = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : []
      }))

      return { success: true, data: plans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Update plan sort order (for drag-and-drop reordering)
   */
  async updatePlanOrder(planIds: string[]): Promise<ServiceResult<void>> {
    try {
      const updates = planIds.map((id, index) => ({
        id,
        sort_order: index
      }))

      const { error } = await supabase
        .from('survey_plans')
        .upsert(updates, { onConflict: 'id' })

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
   * Duplicate a survey plan
   */
  async duplicatePlan(
    planId: string, 
    newReferenceNumber?: string
  ): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data: originalPlan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Create new plan data (exclude id, created_at, updated_at)
      const { id, created_at, updated_at, ...planData } = originalPlan
      const duplicateData: SurveyPlanInsert = {
        ...planData,
        reference_number: newReferenceNumber || `${originalPlan.reference_number}-copy`,
        title: `${originalPlan.title} (Copy)`,
        created_by: user.id
      }

      const { data, error } = await supabase
        .from('survey_plans')
        .insert(duplicateData)
        .select()
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
   * Archive/unarchive a plan
   */
  async toggleArchivePlan(planId: string): Promise<ServiceResult<SurveyPlan>> {
    try {
      // First get current status
      const { data: currentPlan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('status')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const newStatus = currentPlan.status === 'archived' ? 'active' : 'archived'

      const { data, error } = await supabase
        .from('survey_plans')
        .update({ status: newStatus })
        .eq('id', planId)
        .select()
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
   * Get plan statistics for a project
   */
  async getPlanStats(projectId: string): Promise<ServiceResult<{
    total_plans: number
    active_plans: number
    archived_plans: number
    total_annotations: number
    plans_by_tag: Record<string, number>
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_survey_plan_stats', { project_uuid: projectId })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || {
        total_plans: 0,
        active_plans: 0,
        archived_plans: 0,
        total_annotations: 0,
        plans_by_tag: {}
      }}
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Search plans across multiple projects (for global search)
   */
  async searchPlans(
    searchTerm: string,
    projectIds?: string[]
  ): Promise<ServiceResult<SurveyPlanWithDetails[]>> {
    try {
      let query = supabase
        .from('survey_plans_with_tags')
        .select(`
          *,
          project:projects(title),
          search_document:search_documents(title)
        `)
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

      if (projectIds && projectIds.length > 0) {
        query = query.in('project_id', projectIds)
      }

      query = query.order('updated_at', { ascending: false }).limit(50)

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      const plans = (data || []).map(plan => ({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        annotations_count: 0,
        relationships_count: 0 // Note: This is a global search, relationship counts not critical here
      }))

      return { success: true, data: plans }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Fix plan file paths that contain 'undefined'
   * This is a utility method to fix data corruption from earlier uploads
   */
  async fixPlanFilePaths(projectId: string): Promise<ServiceResult<number>> {
    try {
      console.log('[SurveyPlans] Starting file path fix for project:', projectId)
      
      // Get all plans with undefined file paths
      const { data: brokenPlans, error: fetchError } = await supabase
        .from('survey_plans')
        .select('id, reference_number, file_path, created_at')
        .eq('project_id', projectId)
        .like('file_path', '%undefined%')

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      if (!brokenPlans || brokenPlans.length === 0) {
        console.log('[SurveyPlans] No broken file paths found')
        return { success: true, data: 0 }
      }

      console.log(`[SurveyPlans] Found ${brokenPlans.length} plans with broken file paths`)

      let fixedCount = 0
      for (const plan of brokenPlans) {
        // Generate a proper file name
        const timestamp = new Date(plan.created_at).toISOString().replace(/[:.]/g, '-').split('T')[0]
        const cleanRef = plan.reference_number.replace(/[^a-zA-Z0-9-]/g, '_')
        const newFileName = `plan_${cleanRef}_${timestamp}.pdf`
        const newFilePath = `projects/${projectId}/plans/${newFileName}`
        
        console.log(`[SurveyPlans] Fixing plan ${plan.reference_number}: ${plan.file_path} → ${newFilePath}`)
        
        // Update the plan's file path
        const { error: updateError } = await supabase
          .from('survey_plans')
          .update({ file_path: newFilePath })
          .eq('id', plan.id)

        if (updateError) {
          console.error(`[SurveyPlans] Failed to fix plan ${plan.id}:`, updateError)
        } else {
          fixedCount++
        }
      }

      console.log(`[SurveyPlans] Fixed ${fixedCount} out of ${brokenPlans.length} plans`)
      return { success: true, data: fixedCount }
    } catch (error) {
      console.error('[SurveyPlans] Error fixing file paths:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get relationship counts for all plans in a project
   */
  async getRelationshipCounts(projectId: string): Promise<Record<string, number>> {
    try {
      // First get all plans in the project
      const { data: projectPlans, error: plansError } = await supabase
        .from('survey_plans')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'active')

      if (plansError) {
        console.error('Error fetching project plans:', plansError)
        return {}
      }

      if (!projectPlans || projectPlans.length === 0) {
        return {}
      }

      const planIds = projectPlans.map(p => p.id)

      // Get all relationships where either parent or child is in this project
      const { data, error } = await supabase
        .from('plan_relationships')
        .select('parent_plan_id, child_plan_id')
        .or(`parent_plan_id.in.(${planIds.join(',')}),child_plan_id.in.(${planIds.join(',')})`)

      if (error) {
        console.error('Error fetching relationship counts:', error)
        return {}
      }

      const counts: Record<string, number> = {}

      // Count relationships for each plan
      data?.forEach(rel => {
        // Count as parent (if parent is in this project)
        if (planIds.includes(rel.parent_plan_id)) {
          counts[rel.parent_plan_id] = (counts[rel.parent_plan_id] || 0) + 1
        }
        // Count as child (if child is in this project)
        if (planIds.includes(rel.child_plan_id)) {
          counts[rel.child_plan_id] = (counts[rel.child_plan_id] || 0) + 1
        }
      })

      return counts
    } catch (error) {
      console.error('Error getting relationship counts:', error)
      return {}
    }
  }

  /**
   * Get relationship count for a specific plan
   */
  async getPlanRelationshipCount(planId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('plan_relationships')
        .select('*', { count: 'exact' })
        .or(`parent_plan_id.eq.${planId},child_plan_id.eq.${planId}`)

      if (error) {
        console.error('Error fetching plan relationship count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting plan relationship count:', error)
      return 0
    }
  }

  /**
   * Get a signed URL for downloading a plan PDF
   */
  async getDownloadUrl(filePath: string): Promise<ServiceResult<string>> {
    try {
      console.log('[SurveyPlans] Getting download URL for:', filePath)
      
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      console.log('[SurveyPlans] Signed URL response:', { data, error })

      if (error) {
        console.error('[SurveyPlans] Signed URL error:', error)
        return { success: false, error: error.message }
      }

      console.log('[SurveyPlans] Generated signed URL:', data.signedUrl)
      return { success: true, data: data.signedUrl }
    } catch (error) {
      console.error('[SurveyPlans] Unexpected error generating signed URL:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Toggle star status for a plan
   */
  async toggleStarPlan(planId: string): Promise<ServiceResult<SurveyPlan>> {
    try {
      // First get current star status
      const { data: currentPlan, error: fetchError } = await supabase
        .from('survey_plans')
        .select('is_starred')
        .eq('id', planId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      const newStarStatus = !currentPlan.is_starred

      const { data, error } = await supabase
        .from('survey_plans')
        .update({ is_starred: newStarStatus })
        .eq('id', planId)
        .select()
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
   * Update plan year
   */
  async updatePlanYear(planId: string, year: number | null): Promise<ServiceResult<SurveyPlan>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans')
        .update({ plan_year: year })
        .eq('id', planId)
        .select()
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
   * Get starred plans for a project
   */
  async getStarredPlans(projectId: string): Promise<ServiceResult<SurveyPlanWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('survey_plans_with_tags')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_starred', true)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      // Get relationship counts for each plan
      const plansWithCounts = await Promise.all(
        (data || []).map(async (plan) => {
          const relationshipCount = await this.getRelationshipCount(plan.id)
          return {
            ...plan,
            tags: Array.isArray(plan.tags) ? plan.tags : [],
            annotations_count: plan.annotations_count?.[0]?.count || 0,
            relationships_count: relationshipCount
          } as SurveyPlanWithDetails
        })
      )

      return { success: true, data: plansWithCounts }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

// Export singleton instance
export const surveyPlansService = new SurveyPlansService()
export default surveyPlansService