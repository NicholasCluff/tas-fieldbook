import { supabase } from '$lib/utils/supabase.js'
import type { 
  PlanRelationship, 
  PlanRelationshipInsert, 
  PlanRelationshipUpdate,
  ServiceResult 
} from '$lib/types/database.js'

interface RelationshipWithPlans extends PlanRelationship {
  parent_plan: {
    id: string
    reference_number: string
    title: string | null
  }
  child_plan: {
    id: string
    reference_number: string
    title: string | null
  }
}

class PlanRelationshipsService {
  /**
   * Get all relationships for a plan (both as parent and child)
   */
  async getPlanRelationships(planId: string): Promise<ServiceResult<{
    as_parent: RelationshipWithPlans[]
    as_child: RelationshipWithPlans[]
  }>> {
    try {
      // Get relationships where this plan is the parent
      const { data: asParent, error: parentError } = await supabase
        .from('plan_relationships')
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title
          )
        `)
        .eq('parent_plan_id', planId)
        .order('created_at', { ascending: true })

      if (parentError) {
        return { success: false, error: parentError.message }
      }

      // Get relationships where this plan is the child
      const { data: asChild, error: childError } = await supabase
        .from('plan_relationships')
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title
          )
        `)
        .eq('child_plan_id', planId)
        .order('created_at', { ascending: true })

      if (childError) {
        return { success: false, error: childError.message }
      }

      return { 
        success: true, 
        data: { 
          as_parent: asParent || [], 
          as_child: asChild || [] 
        } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create a new relationship between two plans
   */
  async createRelationship(
    parentPlanId: string,
    childPlanId: string,
    relationshipType: PlanRelationship['relationship_type'] = 'related',
    notes?: string
  ): Promise<ServiceResult<RelationshipWithPlans>> {
    try {
      if (parentPlanId === childPlanId) {
        return { success: false, error: 'A plan cannot have a relationship with itself' }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const relationshipData: PlanRelationshipInsert = {
        parent_plan_id: parentPlanId,
        child_plan_id: childPlanId,
        relationship_type: relationshipType,
        notes,
        created_by: user.id
      }

      const { data, error } = await supabase
        .from('plan_relationships')
        .insert(relationshipData)
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title
          )
        `)
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'This relationship already exists' }
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
   * Update an existing relationship
   */
  async updateRelationship(
    relationshipId: string,
    updates: PlanRelationshipUpdate
  ): Promise<ServiceResult<RelationshipWithPlans>> {
    try {
      const { data, error } = await supabase
        .from('plan_relationships')
        .update(updates)
        .eq('id', relationshipId)
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title
          )
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
   * Delete a relationship
   */
  async deleteRelationship(relationshipId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('plan_relationships')
        .delete()
        .eq('id', relationshipId)

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
   * Get relationship hierarchy for a plan (using basic relationships)
   * This builds a simplified hierarchy from the direct relationships
   */
  async getPlanHierarchy(planId: string, maxDepth: number = 5): Promise<ServiceResult<{
    plan: {
      id: string
      reference_number: string
      title: string | null
    }
    parents: any[]
    children: any[]
  }>> {
    try {
      // Get the basic relationships for this plan
      const relationshipsResult = await this.getPlanRelationships(planId)
      
      if (!relationshipsResult.success) {
        return { success: false, error: relationshipsResult.error }
      }

      const relationships = relationshipsResult.data
      if (!relationships) {
        return { success: false, error: 'No relationship data found' }
      }

      // Get plan details from the first relationship or use planId
      let currentPlan = null
      if (relationships.as_parent.length > 0) {
        // Use parent relationship to get current plan details
        const parentRel = relationships.as_parent[0]
        currentPlan = {
          id: planId,
          reference_number: 'Current Plan', // Would need to fetch actual plan details
          title: null
        }
      } else if (relationships.as_child.length > 0) {
        // Use child relationship to get current plan details  
        const childRel = relationships.as_child[0]
        currentPlan = {
          id: planId,
          reference_number: 'Current Plan', // Would need to fetch actual plan details
          title: null
        }
      } else {
        currentPlan = {
          id: planId,
          reference_number: 'Current Plan',
          title: null
        }
      }

      // Convert relationships to hierarchy format
      const parents = relationships.as_child.map(rel => ({
        plan: {
          id: rel.parent_plan.id,
          reference_number: rel.parent_plan.reference_number,
          title: rel.parent_plan.title
        },
        relationship_type: rel.relationship_type
      }))

      const children = relationships.as_parent.map(rel => ({
        plan: {
          id: rel.child_plan.id,
          reference_number: rel.child_plan.reference_number,
          title: rel.child_plan.title
        },
        relationship_type: rel.relationship_type
      }))

      return { 
        success: true, 
        data: { 
          plan: currentPlan,
          parents,
          children 
        } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get all relationships of a specific type
   */
  async getRelationshipsByType(
    relationshipType: PlanRelationship['relationship_type'],
    projectId?: string
  ): Promise<ServiceResult<RelationshipWithPlans[]>> {
    try {
      let query = supabase
        .from('plan_relationships')
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title, project_id
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title, project_id
          )
        `)
        .eq('relationship_type', relationshipType)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      let relationships = data || []

      // Filter by project if specified
      if (projectId) {
        relationships = relationships.filter(rel => 
          rel.parent_plan.project_id === projectId || rel.child_plan.project_id === projectId
        )
      }

      return { success: true, data: relationships }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Find circular relationships (to prevent infinite loops)
   */
  async findCircularRelationships(projectId: string): Promise<ServiceResult<RelationshipWithPlans[]>> {
    try {
      const { data, error } = await supabase
        .rpc('find_circular_relationships', { project_uuid: projectId })

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
   * Bulk create relationships from a mapping
   */
  async createBulkRelationships(
    relationships: Array<{
      parentPlanId: string
      childPlanId: string
      relationshipType?: PlanRelationship['relationship_type']
      notes?: string
    }>
  ): Promise<ServiceResult<RelationshipWithPlans[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Validate no self-references
      const selfReferences = relationships.filter(rel => rel.parentPlanId === rel.childPlanId)
      if (selfReferences.length > 0) {
        return { success: false, error: 'Plans cannot have relationships with themselves' }
      }

      const insertData: PlanRelationshipInsert[] = relationships.map(rel => ({
        parent_plan_id: rel.parentPlanId,
        child_plan_id: rel.childPlanId,
        relationship_type: rel.relationshipType || 'related',
        notes: rel.notes,
        created_by: user.id
      }))

      const { data, error } = await supabase
        .from('plan_relationships')
        .insert(insertData)
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title
          )
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
   * Delete all relationships for a plan
   */
  async deleteAllPlanRelationships(planId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('plan_relationships')
        .delete()
        .or(`parent_plan_id.eq.${planId},child_plan_id.eq.${planId}`)

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
   * Get relationship statistics for a project
   */
  async getRelationshipStats(projectId: string): Promise<ServiceResult<{
    total_relationships: number
    by_type: Record<string, number>
    most_connected_plans: Array<{
      plan_id: string
      reference_number: string
      title: string | null
      connection_count: number
    }>
    orphaned_plans: Array<{
      plan_id: string
      reference_number: string
      title: string | null
    }>
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_relationship_stats', { project_uuid: projectId })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || {
        total_relationships: 0,
        by_type: {},
        most_connected_plans: [],
        orphaned_plans: []
      }}
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Suggest potential relationships based on plan metadata
   */
  async suggestRelationships(planId: string): Promise<ServiceResult<Array<{
    suggested_plan: {
      id: string
      reference_number: string
      title: string | null
    }
    similarity_score: number
    suggested_type: PlanRelationship['relationship_type']
    reason: string
  }>>> {
    try {
      const { data, error } = await supabase
        .rpc('suggest_plan_relationships', { plan_uuid: planId })

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
   * Export relationship data as JSON for backup/transfer
   */
  async exportRelationships(projectId: string): Promise<ServiceResult<string>> {
    try {
      const { data, error } = await supabase
        .from('plan_relationships')
        .select(`
          *,
          parent_plan:survey_plans!plan_relationships_parent_plan_id_fkey(
            id, reference_number, title, project_id
          ),
          child_plan:survey_plans!plan_relationships_child_plan_id_fkey(
            id, reference_number, title, project_id
          )
        `)
        .or(`parent_plan.project_id.eq.${projectId},child_plan.project_id.eq.${projectId}`)

      if (error) {
        return { success: false, error: error.message }
      }

      const exportData = {
        project_id: projectId,
        exported_at: new Date().toISOString(),
        relationships: data?.map(rel => ({
          parent_plan: {
            id: rel.parent_plan.id,
            reference_number: rel.parent_plan.reference_number,
            title: rel.parent_plan.title
          },
          child_plan: {
            id: rel.child_plan.id,
            reference_number: rel.child_plan.reference_number,
            title: rel.child_plan.title
          },
          relationship_type: rel.relationship_type,
          notes: rel.notes,
          created_at: rel.created_at
        })) || []
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
   * Check if creating a relationship would create a circular reference
   */
  async wouldCreateCircular(
    parentPlanId: string, 
    childPlanId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await supabase
        .rpc('would_create_circular_relationship', { 
          parent_plan_uuid: parentPlanId,
          child_plan_uuid: childPlanId
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || false }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

// Export singleton instance
export const planRelationshipsService = new PlanRelationshipsService()
export default planRelationshipsService