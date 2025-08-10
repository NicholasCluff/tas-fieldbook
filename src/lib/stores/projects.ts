import { writable } from 'svelte/store'
import { projectsService } from '$lib/services/projects.service.js'
import type { Project } from '$lib/types/database.js'
import { showError } from './toast.js'

interface ProjectsState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  stats: {
    total: number
    active: number
    completed: number
    archived: number
    setup: number
    fieldwork: number
    review: number
    owned: number
    supervised: number
  } | null
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  stats: null
}

export const projectsStore = writable<ProjectsState>(initialState)

class ProjectsManager {
  private lastLoadedUserId: string | null = null
  private lastLoadTime: number = 0
  private readonly CACHE_DURATION = 30000 // 30 seconds cache

  // Load user's projects
  async loadUserProjects(userId: string, retryCount = 0, force = false) {
    // Skip if we recently loaded projects for this user and it's not forced
    const now = Date.now()
    if (!force && 
        this.lastLoadedUserId === userId && 
        (now - this.lastLoadTime) < this.CACHE_DURATION) {
      // Using cached projects, skipping reload
      return { success: true, data: null }
    }

    const maxRetries = 2
    projectsStore.update(state => ({ ...state, loading: true, error: null }))

    // Shorter timeout for better UX
    const timeoutId = setTimeout(() => {
      if (retryCount < maxRetries) {
        // Projects loading timeout, retrying
        clearTimeout(timeoutId)
        this.loadUserProjects(userId, retryCount + 1, true)
      } else {
        projectsStore.update(state => ({ 
          ...state, 
          loading: false
        }))
        showError('Projects loading timed out. Please refresh the page if the issue persists.', 8000)
      }
    }, 5000) // 5 second timeout with retry

    try {
      const result = await projectsService.getUserProjects(userId)
      
      clearTimeout(timeoutId)
      
      if (result.error) {
        if (retryCount < maxRetries) {
          // Projects fetch error, retrying
          setTimeout(() => this.loadUserProjects(userId, retryCount + 1, true), 1000)
          return { success: false, error: result.error }
        }
        
        projectsStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Failed to load projects'
        }))
        return { success: false, error: result.error }
      }

      projectsStore.update(state => ({
        ...state,
        projects: result.data || [],
        loading: false
      }))

      // Update cache info
      this.lastLoadedUserId = userId
      this.lastLoadTime = Date.now()

      return { success: true, data: result.data }
    } catch (error) {
      clearTimeout(timeoutId)
      // Error loading projects
      
      if (retryCount < maxRetries) {
        // Projects fetch error, retrying
        setTimeout(() => this.loadUserProjects(userId, retryCount + 1, true), 1000)
        return { success: false, error }
      }
      
      projectsStore.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to load projects'
      }))
      return { success: false, error }
    }
  }

  // Load a specific project
  async loadProject(projectId: string) {
    projectsStore.update(state => ({ ...state, loading: true, error: null }))

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      projectsStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: 'Project loading timed out' 
      }))
    }, 10000) // 10 second timeout

    try {
      const result = await projectsService.getProject(projectId)
      
      clearTimeout(timeoutId)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Failed to load project'
        }))
        return { success: false, error: result.error }
      }

      projectsStore.update(state => ({
        ...state,
        currentProject: result.data,
        loading: false
      }))

      return { success: true, data: result.data }
    } catch (error) {
      clearTimeout(timeoutId)
      // Error loading project
      projectsStore.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to load project'
      }))
      return { success: false, error }
    }
  }

  // Create a new project
  async createProject(projectData: {
    title: string
    description?: string
    location: string
    owner_id: string
    supervisor_id?: string
    supervision_required?: boolean
    start_date?: string
    due_date?: string
  }) {
    projectsStore.update(state => ({ ...state, loading: true, error: null }))

    try {
      const result = await projectsService.createProject(projectData)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Failed to create project'
        }))
        return { success: false, error: result.error }
      }

      // Add the new project to the store
      projectsStore.update(state => ({
        ...state,
        projects: [result.data, ...state.projects],
        loading: false
      }))

      return { success: true, data: result.data }
    } catch (error) {
      // Error creating project
      projectsStore.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to create project'
      }))
      return { success: false, error }
    }
  }

  // Update a project
  async updateProject(projectId: string, updates: Partial<Project>) {
    projectsStore.update(state => ({ ...state, loading: true, error: null }))

    try {
      const result = await projectsService.updateProject(projectId, updates)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Failed to update project'
        }))
        return { success: false, error: result.error }
      }

      // Update the project in the store
      projectsStore.update(state => ({
        ...state,
        projects: state.projects.map(p => p.id === projectId ? result.data : p),
        currentProject: state.currentProject?.id === projectId ? result.data : state.currentProject,
        loading: false
      }))

      return { success: true, data: result.data }
    } catch (error) {
      // Error updating project
      projectsStore.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to update project'
      }))
      return { success: false, error }
    }
  }

  // Delete a project
  async deleteProject(projectId: string) {
    projectsStore.update(state => ({ ...state, loading: true, error: null }))

    try {
      const result = await projectsService.deleteProject(projectId)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Failed to delete project'
        }))
        return { success: false, error: result.error }
      }

      // Remove the project from the store
      projectsStore.update(state => ({
        ...state,
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        loading: false
      }))

      return { success: true }
    } catch (error) {
      // Error deleting project
      projectsStore.update(state => ({
        ...state,
        loading: false,
        error: 'Failed to delete project'
      }))
      return { success: false, error }
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

  // Request supervision
  async requestSupervision(projectId: string, supervisorId: string) {
    try {
      const result = await projectsService.requestSupervision(projectId, supervisorId)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          error: result.error?.message || 'Failed to request supervision'
        }))
        return { success: false, error: result.error }
      }

      // Update the project in the store
      projectsStore.update(state => ({
        ...state,
        projects: state.projects.map(p => p.id === projectId ? result.data : p),
        currentProject: state.currentProject?.id === projectId ? result.data : state.currentProject
      }))

      return { success: true, data: result.data }
    } catch (error) {
      // Error requesting supervision
      return { success: false, error }
    }
  }

  // Remove supervision
  async removeSupervision(projectId: string) {
    try {
      const result = await projectsService.removeSupervision(projectId)
      
      if (result.error) {
        projectsStore.update(state => ({
          ...state,
          error: result.error?.message || 'Failed to remove supervision'
        }))
        return { success: false, error: result.error }
      }

      // Update the project in the store
      projectsStore.update(state => ({
        ...state,
        projects: state.projects.map(p => p.id === projectId ? result.data : p),
        currentProject: state.currentProject?.id === projectId ? result.data : state.currentProject
      }))

      return { success: true, data: result.data }
    } catch (error) {
      // Error removing supervision
      return { success: false, error }
    }
  }

  // Load project statistics
  async loadProjectStats(userId: string) {
    try {
      const result = await projectsService.getProjectStats(userId)
      
      if (result.error) {
        // Error loading project stats
        return { success: false, error: result.error }
      }

      projectsStore.update(state => ({
        ...state,
        stats: result.data
      }))

      return { success: true, data: result.data }
    } catch (error) {
      // Error loading project stats
      return { success: false, error }
    }
  }

  // Clear error
  clearError() {
    projectsStore.update(state => ({ ...state, error: null }))
  }

  // Clear current project
  clearCurrentProject() {
    projectsStore.update(state => ({ ...state, currentProject: null }))
  }

  // Reset store
  reset() {
    projectsStore.set(initialState)
    this.lastLoadedUserId = null
    this.lastLoadTime = 0
  }

  // Force reload projects (ignores cache)
  async forceReloadProjects(userId: string) {
    return this.loadUserProjects(userId, 0, true)
  }

  // Invalidate cache
  invalidateCache() {
    this.lastLoadedUserId = null
    this.lastLoadTime = 0
  }
}

export const projectsManager = new ProjectsManager()