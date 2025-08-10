import { supabase } from '$lib/utils/supabase.js'
import type { 
  PlanTag, 
  PlanTagInsert, 
  PlanTagUpdate,
  PlanTagAssignment,
  PlanTagAssignmentInsert,
  PlanTagWithAssignment,
  ServiceResult 
} from '$lib/types/database.js'

class PlanTagsService {
  /**
   * Get all tags for a project
   */
  async getProjectTags(projectId: string): Promise<ServiceResult<PlanTag[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_tags')
        .select('*')
        .eq('project_id', projectId)
        .order('name')

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
   * Create a new tag for a project
   */
  async createTag(tagData: PlanTagInsert): Promise<ServiceResult<PlanTag>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('plan_tags')
        .insert({
          ...tagData,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'A tag with this name already exists in this project' }
        }
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
   * Update a tag
   */
  async updateTag(tagId: string, updates: PlanTagUpdate): Promise<ServiceResult<PlanTag>> {
    try {
      const { data, error } = await supabase
        .from('plan_tags')
        .update(updates)
        .eq('id', tagId)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'A tag with this name already exists in this project' }
        }
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
   * Delete a tag (this will remove all assignments)
   */
  async deleteTag(tagId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('plan_tags')
        .delete()
        .eq('id', tagId)

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
   * Get tags assigned to a specific plan
   */
  async getPlanTags(planId: string): Promise<ServiceResult<PlanTagWithAssignment[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_tag_assignments')
        .select(`
          assigned_at,
          assigned_by,
          tag:plan_tags(*)
        `)
        .eq('plan_id', planId)

      if (error) {
        return { success: false, error: error.message }
      }

      const tags: PlanTagWithAssignment[] = (data || []).map(assignment => ({
        ...assignment.tag,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by
      }))

      return { success: true, data: tags }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Assign tags to a plan
   */
  async assignTagsToPlan(planId: string, tagIds: string[]): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const assignments: PlanTagAssignmentInsert[] = tagIds.map(tagId => ({
        plan_id: planId,
        tag_id: tagId,
        assigned_by: user.id
      }))

      const { error } = await supabase
        .from('plan_tag_assignments')
        .upsert(assignments, { 
          onConflict: 'plan_id,tag_id',
          ignoreDuplicates: true 
        })

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
   * Remove tags from a plan
   */
  async removeTagsFromPlan(planId: string, tagIds: string[]): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('plan_tag_assignments')
        .delete()
        .eq('plan_id', planId)
        .in('tag_id', tagIds)

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
   * Replace all tags for a plan
   */
  async setPlanTags(planId: string, tagIds: string[]): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Start a transaction by removing all existing tags first
      const { error: deleteError } = await supabase
        .from('plan_tag_assignments')
        .delete()
        .eq('plan_id', planId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Then add the new tags if any
      if (tagIds.length > 0) {
        const assignments: PlanTagAssignmentInsert[] = tagIds.map(tagId => ({
          plan_id: planId,
          tag_id: tagId,
          assigned_by: user.id
        }))

        const { error: insertError } = await supabase
          .from('plan_tag_assignments')
          .insert(assignments)

        if (insertError) {
          return { success: false, error: insertError.message }
        }
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
   * Get all plans that have a specific tag
   */
  async getPlansByTag(tagId: string): Promise<ServiceResult<Array<{
    id: string
    reference_number: string
    title: string | null
    assigned_at: string
  }>>> {
    try {
      const { data, error } = await supabase
        .from('plan_tag_assignments')
        .select(`
          assigned_at,
          plan:survey_plans(id, reference_number, title)
        `)
        .eq('tag_id', tagId)
        .order('assigned_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const plans = (data || []).map(assignment => ({
        id: assignment.plan.id,
        reference_number: assignment.plan.reference_number,
        title: assignment.plan.title,
        assigned_at: assignment.assigned_at
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
   * Get tag usage statistics for a project
   */
  async getTagStats(projectId: string): Promise<ServiceResult<Array<{
    tag_id: string
    tag_name: string
    tag_color: string
    usage_count: number
    last_used: string | null
  }>>> {
    try {
      const { data, error } = await supabase
        .rpc('get_tag_usage_stats', { project_uuid: projectId })

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
   * Bulk create tags from an array of names
   */
  async createBulkTags(
    projectId: string, 
    tagNames: string[], 
    defaultColor: string = '#3B82F6'
  ): Promise<ServiceResult<PlanTag[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get existing tags to avoid duplicates
      const { data: existingTags } = await supabase
        .from('plan_tags')
        .select('name')
        .eq('project_id', projectId)
        .in('name', tagNames)

      const existingNames = new Set(existingTags?.map(tag => tag.name) || [])
      const newTagNames = tagNames.filter(name => !existingNames.has(name))

      if (newTagNames.length === 0) {
        return { success: true, data: [] }
      }

      const tagData: PlanTagInsert[] = newTagNames.map(name => ({
        project_id: projectId,
        name,
        color: defaultColor,
        created_by: user.id
      }))

      const { data, error } = await supabase
        .from('plan_tags')
        .insert(tagData)
        .select()

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
   * Merge two tags (move all assignments from source to target, then delete source)
   */
  async mergeTags(sourceTagId: string, targetTagId: string): Promise<ServiceResult<void>> {
    try {
      // Update all assignments from source to target
      const { error: updateError } = await supabase
        .from('plan_tag_assignments')
        .update({ tag_id: targetTagId })
        .eq('tag_id', sourceTagId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Delete the source tag
      const { error: deleteError } = await supabase
        .from('plan_tags')
        .delete()
        .eq('id', sourceTagId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
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
   * Search tags by name
   */
  async searchTags(projectId: string, searchTerm: string): Promise<ServiceResult<PlanTag[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_tags')
        .select('*')
        .eq('project_id', projectId)
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(20)

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
   * Get suggested tags based on plan content (returns commonly used tags)
   */
  async getSuggestedTags(projectId: string, limit: number = 10): Promise<ServiceResult<PlanTag[]>> {
    try {
      const { data, error } = await supabase
        .from('plan_tags')
        .select(`
          *,
          usage_count:plan_tag_assignments(count)
        `)
        .eq('project_id', projectId)
        .order('usage_count', { ascending: false })
        .limit(limit)

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
}

// Export singleton instance
export const planTagsService = new PlanTagsService()
export default planTagsService