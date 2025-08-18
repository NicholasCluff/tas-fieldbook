<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { 
    X, 
    Plus, 
    Edit3, 
    Trash2, 
    Link, 
    ArrowRight,
    ArrowLeft,
    ArrowUpDown,
    RefreshCw,
    Search,
    ExternalLink,
    Eye,
    Network,
    List
  } from 'lucide-svelte'
  import { planRelationshipsService } from '$lib/services/planRelationships.service.js'
  import { surveyPlansService } from '$lib/services/surveyPlans.service.js'
  import type { 
    PlanRelationship, 
    SurveyPlanWithDetails,
    ServiceResult 
  } from '$lib/types/database.js'
  import LoadingSpinner from '../common/LoadingSpinner.svelte'
  import ErrorMessage from '../common/ErrorMessage.svelte'
  import RelationshipDiagram from './RelationshipDiagram.svelte'

  interface Props {
    planId: string
    projectId: string
    planTitle?: string
    planReferenceNumber?: string
  }

  let { 
    planId, 
    projectId, 
    planTitle = '', 
    planReferenceNumber = '' 
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    close: void
    'relationship-changed': void
    'navigate-to-plan': { planId: string; planTitle?: string; planReferenceNumber: string }
  }>()

  // State
  let loading = $state(true)
  let error = $state('')
  let relationships = $state<{
    as_parent: any[]
    as_child: any[]
  }>({ as_parent: [], as_child: [] })
  
  // Add relationship form state
  let showAddForm = $state(false)
  let addFormLoading = $state(false)
  let searchQuery = $state('')
  let selectedPlan = $state<SurveyPlanWithDetails | null>(null)
  let relationshipType = $state<PlanRelationship['relationship_type']>('related')
  let relationshipNotes = $state('')
  let searchResults = $state<SurveyPlanWithDetails[]>([])
  let searchLoading = $state(false)

  // Edit form state
  let editingRelationship = $state<any>(null)
  let editNotes = $state('')
  let editType = $state<PlanRelationship['relationship_type']>('related')

  // View mode state
  let viewMode = $state<'list' | 'diagram'>('list')

  onMount(() => {
    loadRelationships()
  })

  async function loadRelationships() {
    loading = true
    error = ''

    try {
      const result = await planRelationshipsService.getPlanRelationships(planId)
      
      if (result.success && result.data) {
        relationships = result.data
      } else {
        error = result.error || 'Failed to load relationships'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      loading = false
    }
  }

  async function searchPlans() {
    if (!searchQuery.trim()) {
      searchResults = []
      return
    }

    searchLoading = true
    
    try {
      const result = await surveyPlansService.listPlans(projectId, {
        search: searchQuery,
        sort_by: 'reference_number',
        sort_order: 'asc'
      })
      
      if (result.success && result.data) {
        // Filter out the current plan
        searchResults = result.data.filter(plan => plan.id !== planId)
      } else {
        searchResults = []
      }
    } catch (err) {
      console.error('Error searching plans:', err)
      searchResults = []
    } finally {
      searchLoading = false
    }
  }

  // Debounced search
  let searchTimeout: NodeJS.Timeout
  $effect(() => {
    if (searchQuery && searchQuery.trim()) {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchPlans()
      }, 300)
    } else {
      searchResults = []
    }
  })

  function selectPlan(plan: SurveyPlanWithDetails) {
    selectedPlan = plan
    searchQuery = `${plan.reference_number}${plan.title ? ' - ' + plan.title : ''}`
    searchResults = []
  }

  async function addRelationship() {
    if (!selectedPlan) return

    addFormLoading = true
    error = ''

    try {
      const result = await planRelationshipsService.createRelationship(
        planId,
        selectedPlan.id,
        relationshipType,
        relationshipNotes.trim() || undefined
      )

      if (result.success) {
        // Reset form
        showAddForm = false
        searchQuery = ''
        selectedPlan = null
        relationshipType = 'related'
        relationshipNotes = ''
        
        // Reload relationships
        await loadRelationships()
        dispatch('relationship-changed')
      } else {
        error = result.error || 'Failed to create relationship'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred'
    } finally {
      addFormLoading = false
    }
  }

  function startEdit(relationship: any) {
    editingRelationship = relationship
    editType = relationship.relationship_type
    editNotes = relationship.notes || ''
  }

  function cancelEdit() {
    editingRelationship = null
    editType = 'related'
    editNotes = ''
  }

  async function saveEdit() {
    if (!editingRelationship) return

    try {
      const result = await planRelationshipsService.updateRelationship(
        editingRelationship.id,
        {
          relationship_type: editType,
          notes: editNotes.trim() || null
        }
      )

      if (result.success) {
        cancelEdit()
        await loadRelationships()
        dispatch('relationship-changed')
      } else {
        error = result.error || 'Failed to update relationship'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }

  async function deleteRelationship(relationship: any) {
    if (!confirm('Are you sure you want to delete this relationship? This cannot be undone.')) {
      return
    }

    try {
      const result = await planRelationshipsService.deleteRelationship(relationship.id)

      if (result.success) {
        await loadRelationships()
        dispatch('relationship-changed')
      } else {
        error = result.error || 'Failed to delete relationship'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }

  function getRelationshipIcon(type: PlanRelationship['relationship_type']) {
    switch (type) {
      case 'parent': return ArrowLeft
      case 'child': return ArrowRight
      case 'supersedes': return ArrowUpDown
      case 'superseded_by': return ArrowUpDown
      default: return Link
    }
  }

  function getRelationshipLabel(type: PlanRelationship['relationship_type']) {
    switch (type) {
      case 'parent': return 'Parent of'
      case 'child': return 'Child of'
      case 'supersedes': return 'Supersedes'
      case 'superseded_by': return 'Superseded by'
      default: return 'Related to'
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function cancelAdd() {
    showAddForm = false
    searchQuery = ''
    selectedPlan = null
    relationshipType = 'related'
    relationshipNotes = ''
    searchResults = []
  }

  function navigateToPlan(targetPlanId: string, targetPlanTitle?: string, targetPlanReferenceNumber?: string) {
    dispatch('navigate-to-plan', {
      planId: targetPlanId,
      planTitle: targetPlanTitle,
      planReferenceNumber: targetPlanReferenceNumber || 'Unknown'
    })
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Plan Relationships</h3>
        <p class="text-sm text-gray-600">
          {planReferenceNumber}{planTitle ? ` - ${planTitle}` : ''}
        </p>
      </div>
      <button 
        onclick={() => dispatch('close')}
        class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
      >
        <X size={20} />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      {#if error}
        <div class="mb-4">
          <ErrorMessage message={error} />
        </div>
      {/if}

      {#if loading}
        <div class="flex items-center justify-center py-8">
          <LoadingSpinner />
          <span class="ml-3 text-gray-600">Loading relationships...</span>
        </div>
      {:else}
        <!-- Add Relationship Section -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-4">
              <h4 class="font-medium text-gray-900">Relationships</h4>
              
              <!-- View Mode Toggle -->
              <div class="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onclick={() => viewMode = 'list'}
                  class="px-3 py-1 rounded-md text-sm font-medium transition-colors {viewMode === 'list' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}"
                  title="List view"
                >
                  <List size={14} class="mr-1 inline" />
                  List
                </button>
                <button 
                  onclick={() => viewMode = 'diagram'}
                  class="px-3 py-1 rounded-md text-sm font-medium transition-colors {viewMode === 'diagram' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}"
                  title="Diagram view"
                >
                  <Network size={14} class="mr-1 inline" />
                  Diagram
                </button>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button 
                onclick={loadRelationships}
                class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              {#if !showAddForm}
                <button 
                  onclick={() => showAddForm = true}
                  class="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} class="mr-1" />
                  Add Relationship
                </button>
              {/if}
            </div>
          </div>

          {#if showAddForm}
            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
              <h5 class="font-medium text-gray-900 mb-3">Add New Relationship</h5>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Plan Search -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Target Plan</label>
                  <div class="relative">
                    <Search size={16} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search plans by reference or title..."
                      bind:value={searchQuery}
                      class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    {#if searchLoading}
                      <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    {/if}

                    {#if searchResults.length > 0}
                      <div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {#each searchResults as plan}
                          <button
                            onclick={() => selectPlan(plan)}
                            class="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div class="text-sm font-medium text-gray-900">{plan.reference_number}</div>
                            {#if plan.title}
                              <div class="text-xs text-gray-600">{plan.title}</div>
                            {/if}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  
                  {#if selectedPlan}
                    <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <div class="text-sm font-medium text-blue-900">{selectedPlan.reference_number}</div>
                      {#if selectedPlan.title}
                        <div class="text-xs text-blue-700">{selectedPlan.title}</div>
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Relationship Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
                  <select 
                    bind:value={relationshipType}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="related">Related to</option>
                    <option value="parent">Parent of</option>
                    <option value="child">Child of</option>
                    <option value="supersedes">Supersedes</option>
                    <option value="superseded_by">Superseded by</option>
                  </select>
                </div>
              </div>

              <!-- Notes -->
              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  bind:value={relationshipNotes}
                  placeholder="Add notes about this relationship..."
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>

              <!-- Actions -->
              <div class="flex justify-end space-x-3 mt-4">
                <button 
                  onclick={cancelAdd}
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onclick={addRelationship}
                  disabled={!selectedPlan || addFormLoading}
                  class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if addFormLoading}
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {/if}
                  Add Relationship
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- View Content -->
        {#if viewMode === 'diagram'}
          <!-- Diagram View -->
          <div class="mb-6">
            <div class="h-96 w-full">
              <RelationshipDiagram
                {planId}
                {projectId}
                {planTitle}
                {planReferenceNumber}
                maxDepth={2}
                width={800}
                height={384}
                on:navigate-to-plan={(e) => {
                  // Find the plan details for navigation
                  const targetPlanId = e.detail.planId
                  // For now, use basic navigation - could be enhanced to get plan details
                  navigateToPlan(targetPlanId, undefined, 'Unknown')
                }}
              />
            </div>
          </div>
        {:else}
          <!-- List View -->
        {/if}
        
        <!-- Existing Relationships (List View Only) -->
        {#if viewMode === 'list'}
        <div class="space-y-6">
          <!-- As Parent -->
          {#if relationships.as_parent.length > 0}
            <div>
              <h5 class="font-medium text-gray-900 mb-3">
                This plan is a parent/predecessor to:
              </h5>
              <div class="space-y-2">
                {#each relationships.as_parent as relationship}
                  <div class="border border-gray-200 rounded-lg p-4">
                    {#if editingRelationship?.id === relationship.id}
                      <!-- Edit Form -->
                      <div class="space-y-3">
                        <div class="flex items-center space-x-3">
                          <select 
                            bind:value={editType}
                            class="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="related">Related to</option>
                            <option value="parent">Parent of</option>
                            <option value="child">Child of</option>
                            <option value="supersedes">Supersedes</option>
                            <option value="superseded_by">Superseded by</option>
                          </select>
                          <span class="font-medium">{relationship.child_plan.reference_number}</span>
                          {#if relationship.child_plan.title}
                            <span class="text-gray-600">- {relationship.child_plan.title}</span>
                          {/if}
                        </div>
                        <textarea
                          bind:value={editNotes}
                          placeholder="Notes..."
                          rows="2"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                          <button 
                            onclick={cancelEdit}
                            class="px-3 py-1 text-gray-600 bg-gray-100 rounded text-sm hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button 
                            onclick={saveEdit}
                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    {:else}
                      <!-- Display -->
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1">
                          <svelte:component 
                            this={getRelationshipIcon(relationship.relationship_type)} 
                            size={16} 
                            class="text-gray-500" 
                          />
                          <span class="text-sm text-gray-600">
                            {getRelationshipLabel(relationship.relationship_type)}
                          </span>
                          <button
                            onclick={() => navigateToPlan(relationship.child_plan.id, relationship.child_plan.title, relationship.child_plan.reference_number)}
                            class="flex items-center space-x-2 hover:bg-blue-50 rounded px-2 py-1 transition-colors group"
                            title="Navigate to {relationship.child_plan.reference_number}"
                          >
                            <span class="font-medium text-blue-600 group-hover:text-blue-700">{relationship.child_plan.reference_number}</span>
                            {#if relationship.child_plan.title}
                              <span class="text-gray-600 group-hover:text-gray-700">- {relationship.child_plan.title}</span>
                            {/if}
                            <ExternalLink size={12} class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <div class="flex items-center space-x-2">
                          <button 
                            onclick={() => navigateToPlan(relationship.child_plan.id, relationship.child_plan.title, relationship.child_plan.reference_number)}
                            class="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="View plan"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onclick={() => startEdit(relationship)}
                            class="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Edit relationship"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onclick={() => deleteRelationship(relationship)}
                            class="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete relationship"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {#if relationship.notes}
                        <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {relationship.notes}
                        </div>
                      {/if}
                      <div class="mt-2 text-xs text-gray-500">
                        Created {formatDate(relationship.created_at)}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- As Child -->
          {#if relationships.as_child.length > 0}
            <div>
              <h5 class="font-medium text-gray-900 mb-3">
                This plan is a child/successor of:
              </h5>
              <div class="space-y-2">
                {#each relationships.as_child as relationship}
                  <div class="border border-gray-200 rounded-lg p-4">
                    {#if editingRelationship?.id === relationship.id}
                      <!-- Edit Form -->
                      <div class="space-y-3">
                        <div class="flex items-center space-x-3">
                          <span class="font-medium">{relationship.parent_plan.reference_number}</span>
                          {#if relationship.parent_plan.title}
                            <span class="text-gray-600">- {relationship.parent_plan.title}</span>
                          {/if}
                          <select 
                            bind:value={editType}
                            class="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="related">Related to</option>
                            <option value="parent">Parent of</option>
                            <option value="child">Child of</option>
                            <option value="supersedes">Supersedes</option>
                            <option value="superseded_by">Superseded by</option>
                          </select>
                          <span>this plan</span>
                        </div>
                        <textarea
                          bind:value={editNotes}
                          placeholder="Notes..."
                          rows="2"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        ></textarea>
                        <div class="flex justify-end space-x-2">
                          <button 
                            onclick={cancelEdit}
                            class="px-3 py-1 text-gray-600 bg-gray-100 rounded text-sm hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button 
                            onclick={saveEdit}
                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    {:else}
                      <!-- Display -->
                      <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1">
                          <button
                            onclick={() => navigateToPlan(relationship.parent_plan.id, relationship.parent_plan.title, relationship.parent_plan.reference_number)}
                            class="flex items-center space-x-2 hover:bg-blue-50 rounded px-2 py-1 transition-colors group"
                            title="Navigate to {relationship.parent_plan.reference_number}"
                          >
                            <span class="font-medium text-blue-600 group-hover:text-blue-700">{relationship.parent_plan.reference_number}</span>
                            {#if relationship.parent_plan.title}
                              <span class="text-gray-600 group-hover:text-gray-700">- {relationship.parent_plan.title}</span>
                            {/if}
                            <ExternalLink size={12} class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <svelte:component 
                            this={getRelationshipIcon(relationship.relationship_type)} 
                            size={16} 
                            class="text-gray-500" 
                          />
                          <span class="text-sm text-gray-600">
                            {getRelationshipLabel(relationship.relationship_type)}
                          </span>
                          <span class="text-gray-700 font-medium">this plan</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <button 
                            onclick={() => navigateToPlan(relationship.parent_plan.id, relationship.parent_plan.title, relationship.parent_plan.reference_number)}
                            class="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="View plan"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onclick={() => startEdit(relationship)}
                            class="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Edit relationship"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onclick={() => deleteRelationship(relationship)}
                            class="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete relationship"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {#if relationship.notes}
                        <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {relationship.notes}
                        </div>
                      {/if}
                      <div class="mt-2 text-xs text-gray-500">
                        Created {formatDate(relationship.created_at)}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- No Relationships -->
          {#if relationships.as_parent.length === 0 && relationships.as_child.length === 0}
            <div class="text-center py-8">
              <Link size={48} class="mx-auto text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">No relationships defined</h3>
              <p class="text-gray-600 mb-4">This plan has no relationships with other plans yet.</p>
              {#if !showAddForm}
                <button 
                  onclick={() => showAddForm = true}
                  class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus size={16} class="mr-2" />
                  Add First Relationship
                </button>
              {/if}
            </div>
          {/if}
        </div>
        {/if}
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div class="flex justify-end">
        <button 
          onclick={() => dispatch('close')}
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>