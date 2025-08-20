import { supabase } from '$lib/utils/supabase.js'
import type { 
  Project, 
  ProjectInsert, 
  ProjectPermission, 
  ProjectWithOrganization,
  ServiceResult 
} from '$lib/types/database.js'

export class ProjectsService {
  // Get all projects for the current user (including organization projects)
  async getUserProjects(userId?: string): Promise<ServiceResult<ProjectWithOrganization[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get user's organization memberships
      const { data: memberships } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .eq('user_id', targetUserId)
        .eq('status', 'active')

      const organizationIds = memberships?.map(m => m.organization_id) || []

      // Build the base query - the RLS policies will handle access control
      let query = supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(*),
          permissions:project_permissions(role, can_edit, can_approve, can_invite),
          supervisors:project_supervisors(*)
        `)
        .order('updated_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get a single project by ID with organization info
  async getProject(projectId: string): Promise<ServiceResult<ProjectWithOrganization>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(*),
          supervisors:project_supervisors(*),
          permissions:project_permissions(*)
        `)
        .eq('id', projectId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Check if user has access to this project
      const hasAccess = 
        data.owner_id === user.id ||
        data.permissions?.some(p => p.user_id === user.id) ||
        (data.organization_id && await this.checkOrganizationAccess(user.id, data.organization_id)) ||
        (data.visibility === 'public' && data.allow_external_supervision)

      if (!hasAccess) {
        return { success: false, error: 'Access denied' }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Helper method to check organization access
  private async checkOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    const { data } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    return !!data
  }

  // Create a new project
  async createProject(project: ProjectInsert): Promise<ServiceResult<Project>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Set defaults for new organization model
      const projectData: ProjectInsert = {
        ...project,
        owner_id: user.id,
        visibility: project.visibility || 'private',
        allow_external_supervision: project.allow_external_supervision || false
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Create default permissions for the owner
      await supabase
        .from('project_permissions')
        .insert({
          project_id: data.id,
          user_id: user.id,
          role: 'owner',
          can_edit: true,
          can_approve: true,
          can_invite: true
        })

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Update a project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<ServiceResult<Project>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has edit permissions
      const hasPermission = await this.checkEditPermission(projectId, user.id)
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions' }
      }

      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select('*')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Delete a project
  async deleteProject(projectId: string): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Only project owner can delete
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (!project || project.owner_id !== user.id) {
        return { success: false, error: 'Only project owner can delete projects' }
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Check if user has edit permission for a project
  private async checkEditPermission(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id, organization_id')
      .eq('id', projectId)
      .single()

    if (!project) return false

    // Owner always has edit permission
    if (project.owner_id === userId) return true

    // Check explicit permissions
    const { data: permission } = await supabase
      .from('project_permissions')
      .select('can_edit')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (permission?.can_edit) return true

    // Check organization membership for organization projects
    if (project.organization_id) {
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', project.organization_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      // Organization admins and owners can edit organization projects
      return membership && ['owner', 'admin'].includes(membership.role)
    }

    return false
  }

  // Get project permissions for a user
  async getUserProjectPermissions(projectId: string, userId?: string): Promise<ServiceResult<ProjectPermission | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('project_permissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { success: false, error: error.message }
      }

      return { success: true, data: data || null }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Update project phase
  async updateProjectPhase(projectId: string, phase: 'setup' | 'fieldwork' | 'review') {
    return this.updateProject(projectId, { phase })
  }

  // Update project status
  async updateProjectStatus(projectId: string, status: 'active' | 'completed' | 'archived') {
    return this.updateProject(projectId, { status })
  }

  // Request supervision for a project (using new supervision model)
  async requestSupervision(
    projectId: string, 
    supervisorId: string, 
    supervisionType: 'full' | 'review_only' | 'advisory' = 'full',
    notes?: string
  ): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has permission to request supervision
      const hasPermission = await this.checkEditPermission(projectId, user.id)
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Check if supervision already exists
      const { data: existingSupervision } = await supabase
        .from('project_supervisors')
        .select('id')
        .eq('project_id', projectId)
        .eq('supervisor_id', supervisorId)
        .eq('supervised_user_id', user.id)
        .eq('status', 'active')
        .single()

      if (existingSupervision) {
        return { success: false, error: 'Supervision already exists' }
      }

      // Create supervision record
      const { error } = await supabase
        .from('project_supervisors')
        .insert({
          project_id: projectId,
          supervisor_id: supervisorId,
          supervised_user_id: user.id,
          supervision_type: supervisionType,
          status: 'active',
          notes,
          requested_by: user.id
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Update project to reflect supervision
      await supabase
        .from('projects')
        .update({
          supervision_required: true,
          supervision_requested: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Remove supervision from a project
  async removeSupervision(projectId: string, supervisorId: string): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has permission (either the supervised user or the supervisor)
      const { data: supervision } = await supabase
        .from('project_supervisors')
        .select('*')
        .eq('project_id', projectId)
        .eq('supervisor_id', supervisorId)
        .eq('supervised_user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!supervision) {
        return { success: false, error: 'Supervision relationship not found' }
      }

      if (supervision.supervised_user_id !== user.id && supervision.supervisor_id !== user.id) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // End supervision
      const { error } = await supabase
        .from('project_supervisors')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', supervision.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Check if there are any other active supervisions for this project
      const { data: activeSupervisors } = await supabase
        .from('project_supervisors')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'active')

      // If no active supervisors, update project
      if (!activeSupervisors || activeSupervisors.length === 0) {
        await supabase
          .from('projects')
          .update({
            supervision_required: false,
            supervision_requested: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
      }

      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Search for potential supervisors (no longer limited by role)
  async searchSupervisors(searchTerm: string = '', organizationId?: string): Promise<ServiceResult<any[]>> {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          email,
          primary_organization_id,
          organization:organizations(name)
        `)

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        )
      }

      if (organizationId) {
        // Prioritize users from the same organization
        query = query.eq('primary_organization_id', organizationId)
      }

      const { data, error } = await query.limit(10)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get projects where user is supervisor (using new supervision model)
  async getSupervisedProjects(userId?: string): Promise<ServiceResult<ProjectWithOrganization[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get supervision relationships first
      const { data: supervisionData, error: supervisionError } = await supabase
        .from('project_supervisors')
        .select('project_id, started_at')
        .eq('supervisor_id', targetUserId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })

      if (supervisionError) {
        return { success: false, error: supervisionError.message }
      }

      if (!supervisionData || supervisionData.length === 0) {
        return { success: true, data: [] }
      }

      // Get the actual projects
      const projectIds = supervisionData.map(s => s.project_id)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          organization:organizations(*),
          permissions:project_permissions(role, can_edit, can_approve, can_invite),
          supervisors:project_supervisors(*)
        `)
        .in('id', projectIds)

      if (projectsError) {
        return { success: false, error: projectsError.message }
      }

      return { success: true, data: projects || [] }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get project statistics for dashboard (updated for organization model)
  async getProjectStats(userId?: string): Promise<ServiceResult<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get all accessible projects through RLS
      const { data: allProjects, error: allProjectsError } = await supabase
        .from('projects')
        .select('status, phase, owner_id')

      if (allProjectsError) {
        return { success: false, error: allProjectsError.message }
      }

      // Get supervised projects through the new supervision model
      const { data: supervisedData, error: supervisedError } = await supabase
        .from('project_supervisors')
        .select('project_id')
        .eq('supervisor_id', targetUserId)
        .eq('status', 'active')

      if (supervisedError) {
        return { success: false, error: supervisedError.message }
      }

      const supervisedProjectIds = new Set(supervisedData?.map(s => s.project_id) || [])
      const projects = allProjects || []
      const ownedProjects = projects.filter(p => p.owner_id === targetUserId)
      const supervisedProjects = projects.filter(p => supervisedProjectIds.has(p.id))

      const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        archived: projects.filter(p => p.status === 'archived').length,
        setup: projects.filter(p => p.phase === 'setup').length,
        fieldwork: projects.filter(p => p.phase === 'fieldwork').length,
        review: projects.filter(p => p.phase === 'review').length,
        owned: ownedProjects.length,
        supervised: supervisedProjects.length
      }

      return { success: true, data: stats }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }
}

export const projectsService = new ProjectsService()