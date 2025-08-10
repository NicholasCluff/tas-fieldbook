import { supabase } from '$lib/utils/supabase.js'
import type { Project, ProjectInsert, ProjectPermission } from '$lib/types/database.js'

export class ProjectsService {
  // Get all projects for the current user
  async getUserProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`owner_id.eq.${userId},supervisor_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (error) {
      // Error fetching user projects
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Get a single project by ID
  async getProject(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      // Error fetching project
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Create a new project
  async createProject(project: ProjectInsert) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select('*')
      .single()

    if (error) {
      // Error creating project
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Update a project
  async updateProject(projectId: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select('*')
      .single()

    if (error) {
      // Error updating project
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Delete a project
  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      // Error deleting project
      return { success: false, error }
    }

    return { success: true, error: null }
  }

  // Get project permissions for a user
  async getUserProjectPermissions(projectId: string, userId: string) {
    const { data, error } = await supabase
      .from('project_permissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      // Error fetching project permissions
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Update project phase
  async updateProjectPhase(projectId: string, phase: 'setup' | 'fieldwork' | 'review') {
    return this.updateProject(projectId, { phase })
  }

  // Update project status
  async updateProjectStatus(projectId: string, status: 'active' | 'completed' | 'archived') {
    return this.updateProject(projectId, { status })
  }

  // Request supervision for a project
  async requestSupervision(projectId: string, supervisorId: string) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        supervisor_id: supervisorId,
        supervision_requested: true,
        supervision_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      // Error requesting supervision
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Remove supervision from a project
  async removeSupervision(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        supervisor_id: null,
        supervision_requested: false,
        supervision_required: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      // Error removing supervision
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Search for potential supervisors
  async searchSupervisors(searchTerm: string = '') {
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'supervisor')

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
    }

    const { data, error } = await query.limit(10)

    if (error) {
      // Error searching supervisors
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Get projects where user is supervisor
  async getSupervisedProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('supervisor_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      // Error fetching supervised projects
      return { data: null, error }
    }

    return { data, error: null }
  }

  // Get project statistics for dashboard
  async getProjectStats(userId: string) {
    // Get owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('status, phase')
      .eq('owner_id', userId)

    // Get supervised projects
    const { data: supervisedProjects, error: supervisedError } = await supabase
      .from('projects')
      .select('status, phase')
      .eq('supervisor_id', userId)

    if (ownedError || supervisedError) {
      // Error fetching project stats
      return {
        data: null,
        error: ownedError || supervisedError
      }
    }

    const allProjects = [...(ownedProjects || []), ...(supervisedProjects || [])]

    const stats = {
      total: allProjects.length,
      active: allProjects.filter(p => p.status === 'active').length,
      completed: allProjects.filter(p => p.status === 'completed').length,
      archived: allProjects.filter(p => p.status === 'archived').length,
      setup: allProjects.filter(p => p.phase === 'setup').length,
      fieldwork: allProjects.filter(p => p.phase === 'fieldwork').length,
      review: allProjects.filter(p => p.phase === 'review').length,
      owned: ownedProjects?.length || 0,
      supervised: supervisedProjects?.length || 0
    }

    return { data: stats, error: null }
  }
}

export const projectsService = new ProjectsService()