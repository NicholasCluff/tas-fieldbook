<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    ChevronRight, 
    Home,
    Link,
    ArrowRight,
    ArrowLeft,
    ArrowUpDown
  } from 'lucide-svelte'
  import { planRelationshipsService } from '$lib/services/planRelationships.service.js'
  import type { PlanRelationship } from '$lib/types/database.js'

  interface Props {
    planId: string
    projectId: string
    currentPlanTitle?: string
    currentPlanReferenceNumber?: string
    onNavigate?: (planId: string) => void
  }

  let { 
    planId, 
    projectId, 
    currentPlanTitle = '', 
    currentPlanReferenceNumber = '',
    onNavigate
  }: Props = $props()

  interface BreadcrumbItem {
    planId: string
    referenceNumber: string
    title?: string
    relationshipType?: PlanRelationship['relationship_type']
    isRoot: boolean
    isCurrent: boolean
  }

  let breadcrumbs = $state<BreadcrumbItem[]>([])
  let loading = $state(false)
  let showFullPath = $state(false)

  onMount(() => {
    loadBreadcrumbs()
  })

  async function loadBreadcrumbs() {
    loading = true
    
    try {
      // Get the hierarchy for this plan
      const result = await planRelationshipsService.getPlanHierarchy(planId, 3)
      
      if (result.success && result.data) {
        const path: BreadcrumbItem[] = []
        
        // Build breadcrumb path from hierarchy
        // Start with root ancestors
        if (result.data.parents && result.data.parents.length > 0) {
          // Find the root-most parent
          const rootParent = findRootParent(result.data.parents)
          if (rootParent) {
            path.push({
              planId: rootParent.plan.id,
              referenceNumber: rootParent.plan.reference_number,
              title: rootParent.plan.title,
              relationshipType: rootParent.relationship_type,
              isRoot: true,
              isCurrent: false
            })
            
            // Add intermediate parents if any
            const intermediatePath = buildPathToTarget(rootParent, result.data.plan.id)
            path.push(...intermediatePath)
          }
        }
        
        // Add current plan
        path.push({
          planId: result.data.plan?.id || planId,
          referenceNumber: result.data.plan?.reference_number || currentPlanReferenceNumber,
          title: result.data.plan?.title || currentPlanTitle,
          isRoot: path.length === 0,
          isCurrent: true
        })
        
        breadcrumbs = path
      } else {
        // Fallback: just show current plan
        breadcrumbs = [{
          planId,
          referenceNumber: currentPlanReferenceNumber,
          title: currentPlanTitle,
          isRoot: true,
          isCurrent: true
        }]
      }
    } catch (error) {
      console.error('Error loading breadcrumbs:', error)
      // Fallback: just show current plan
      breadcrumbs = [{
        planId,
        referenceNumber: currentPlanReferenceNumber,
        title: currentPlanTitle,
        isRoot: true,
        isCurrent: true
      }]
    } finally {
      loading = false
    }
  }

  function findRootParent(parents: any[]): any {
    // For now, just return the first parent
    // In a more complex implementation, we'd traverse to find the actual root
    return parents[0]
  }

  function buildPathToTarget(rootParent: any, targetId: string): BreadcrumbItem[] {
    // For now, return empty array
    // In a more complex implementation, we'd build the full path
    return []
  }

  function getRelationshipIcon(type?: PlanRelationship['relationship_type']) {
    switch (type) {
      case 'parent': return ArrowLeft
      case 'child': return ArrowRight
      case 'supersedes': return ArrowUpDown
      case 'superseded_by': return ArrowUpDown
      default: return Link
    }
  }

  function handleNavigate(item: BreadcrumbItem) {
    if (!item.isCurrent && onNavigate) {
      onNavigate(item.planId)
    }
  }

  // Reactive display logic
  let displayBreadcrumbs = $derived(showFullPath ? breadcrumbs : breadcrumbs.slice(-3))
  let hasMoreItems = $derived(breadcrumbs.length > 3)
</script>

{#if breadcrumbs.length > 1}
  <div class="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
    {#if loading}
      <div class="flex items-center space-x-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span>Loading path...</span>
      </div>
    {:else}
      <!-- Show truncation indicator if needed -->
      {#if hasMoreItems && !showFullPath}
        <button
          onclick={() => showFullPath = true}
          class="text-gray-400 hover:text-gray-600 transition-colors"
          title="Show full path"
        >
          ...
        </button>
        <ChevronRight size={14} class="text-gray-400" />
      {/if}

      {#each displayBreadcrumbs as item, index}
        {#if index > 0}
          <div class="flex items-center space-x-2">
            {#if item.relationshipType}
              <svelte:component 
                this={getRelationshipIcon(item.relationshipType)} 
                size={12} 
                class="text-gray-400" 
              />
            {:else}
              <ChevronRight size={14} class="text-gray-400" />
            {/if}
          </div>
        {/if}

        {#if item.isCurrent}
          <div class="flex items-center space-x-1">
            {#if item.isRoot}
              <Home size={14} class="text-blue-600" />
            {/if}
            <span class="font-medium text-gray-900">{item.referenceNumber}</span>
            {#if item.title}
              <span class="text-gray-600 max-w-xs truncate">- {item.title}</span>
            {/if}
          </div>
        {:else}
          <button
            onclick={() => handleNavigate(item)}
            class="flex items-center space-x-1 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors group"
            title="Navigate to {item.referenceNumber}"
          >
            {#if item.isRoot}
              <Home size={14} class="text-gray-500 group-hover:text-blue-600" />
            {/if}
            <span class="text-blue-600 hover:text-blue-700 font-medium">{item.referenceNumber}</span>
            {#if item.title}
              <span class="text-gray-500 group-hover:text-gray-700 max-w-xs truncate">- {item.title}</span>
            {/if}
          </button>
        {/if}
      {/each}

      <!-- Collapse button if showing full path -->
      {#if hasMoreItems && showFullPath}
        <button
          onclick={() => showFullPath = false}
          class="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          title="Collapse path"
        >
          ←
        </button>
      {/if}
    {/if}
  </div>
{/if}