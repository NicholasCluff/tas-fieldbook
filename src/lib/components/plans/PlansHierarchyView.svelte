<script lang="ts">
  import { 
    ChevronRight, 
    ChevronDown, 
    FileText, 
    Link,
    ArrowRight,
    ArrowLeft,
    ArrowUpDown,
    MoreVertical,
    Eye,
    Star,
    Calendar
  } from 'lucide-svelte'
  import type { SurveyPlanWithDetails, PlanRelationship } from '$lib/types/database.js'
  import { planRelationshipsService } from '$lib/services/planRelationships.service.js'

  interface Props {
    plans: SurveyPlanWithDetails[]
    projectId: string
    onPlanView: (planId: string) => void
    onPlanSelect?: (plan: SurveyPlanWithDetails) => void
  }

  let { plans, projectId, onPlanView, onPlanSelect }: Props = $props()

  interface HierarchyNode {
    plan: SurveyPlanWithDetails
    children: HierarchyNode[]
    parents: HierarchyNode[]
    level: number
    isExpanded: boolean
    isRoot: boolean
    relationshipType?: PlanRelationship['relationship_type']
  }

  let hierarchyNodes = $state<HierarchyNode[]>([])
  let expandedNodes = $state<Set<string>>(new Set())
  let processingNodes = $state<Set<string>>(new Set())
  let loading = $state(true)

  // Build hierarchy tree from plans
  $effect(() => {
    buildHierarchy(plans).catch(console.error)
  })

  async function buildHierarchy(plansList: SurveyPlanWithDetails[]) {
    loading = true
    const nodeMap = new Map<string, HierarchyNode>()
    const rootNodes: HierarchyNode[] = []

    // First pass: create all nodes
    plansList.forEach(plan => {
      nodeMap.set(plan.id, {
        plan,
        children: [],
        parents: [],
        level: 0,
        isExpanded: expandedNodes.has(plan.id),
        isRoot: true, // Will be updated later
        relationshipType: undefined
      })
    })

    // Second pass: build relationships using actual relationship data
    try {
      // Load relationships for plans that have them
      const plansWithRelationships = plansList.filter(plan => 
        plan.relationships_count && plan.relationships_count > 0
      )

      // Track processed relationships to avoid duplicates
      const processedRelationships = new Set<string>()
      
      for (const plan of plansWithRelationships) {
        const relationshipResult = await planRelationshipsService.getPlanRelationships(plan.id)
        
        if (relationshipResult.success && relationshipResult.data) {
          const node = nodeMap.get(plan.id)!
          
          // Process parent relationships (where this plan is a child)
          relationshipResult.data.as_child.forEach(relationship => {
            const relationshipKey = `${relationship.parent_plan.id}->${plan.id}`
            if (!processedRelationships.has(relationshipKey)) {
              const parentNode = nodeMap.get(relationship.parent_plan.id)
              if (parentNode) {
                // Check if this relationship already exists to prevent duplicates
                const alreadyLinked = parentNode.children.some(child => child.plan.id === plan.id)
                if (!alreadyLinked) {
                  parentNode.children.push(node)
                  node.parents.push(parentNode)
                  node.isRoot = false
                  node.level = parentNode.level + 1
                  node.relationshipType = relationship.relationship_type
                  processedRelationships.add(relationshipKey)
                }
              }
            }
          })
          
          // Process child relationships (where this plan is a parent)
          relationshipResult.data.as_parent.forEach(relationship => {
            const relationshipKey = `${plan.id}->${relationship.child_plan.id}`
            if (!processedRelationships.has(relationshipKey)) {
              const childNode = nodeMap.get(relationship.child_plan.id)
              if (childNode) {
                // Check if this relationship already exists to prevent duplicates
                const alreadyLinked = node.children.some(child => child.plan.id === relationship.child_plan.id)
                if (!alreadyLinked) {
                  node.children.push(childNode)
                  childNode.parents.push(node)
                  childNode.isRoot = false
                  childNode.level = node.level + 1
                  childNode.relationshipType = relationship.relationship_type
                  processedRelationships.add(relationshipKey)
                }
              }
            }
          })
        }
      }

      // Collect root nodes (nodes with no parents)
      nodeMap.forEach(node => {
        if (node.isRoot) {
          rootNodes.push(node)
        }
      })

      // Sort root nodes: starred first, then by year/creation date
      rootNodes.sort((a, b) => {
        // Starred plans first
        if (a.plan.is_starred !== b.plan.is_starred) {
          return a.plan.is_starred ? -1 : 1
        }
        
        // Then by year if available
        if (a.plan.plan_year && b.plan.plan_year) {
          return b.plan.plan_year - a.plan.plan_year // Newer years first
        }
        
        // Finally by creation date
        return new Date(b.plan.created_at).getTime() - new Date(a.plan.created_at).getTime()
      })

    } catch (error) {
      console.error('Error building hierarchy:', error)
      // Fallback: show all plans as root nodes
      plansList.forEach(plan => {
        const node = nodeMap.get(plan.id)!
        rootNodes.push(node)
      })
    }

    hierarchyNodes = rootNodes
    loading = false
  }

  function toggleNode(nodeId: string) {
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId)
    } else {
      expandedNodes.add(nodeId)
    }
    // Trigger reactivity
    expandedNodes = new Set(expandedNodes)
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

  function getRelationshipLabel(type?: PlanRelationship['relationship_type']) {
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

  function renderNode(node: HierarchyNode, depth: number = 0): any {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.plan.id)
    const indentLevel = depth * 20

    return {
      node,
      hasChildren,
      isExpanded,
      indentLevel,
      depth
    }
  }

  function flattenHierarchy(nodes: HierarchyNode[], depth: number = 0): any[] {
    const result: any[] = []
    
    nodes.forEach(node => {
      result.push(renderNode(node, depth))
      
      if (expandedNodes.has(node.plan.id) && node.children.length > 0) {
        result.push(...flattenHierarchy(node.children, depth + 1))
      }
    })
    
    return result
  }

  let flatNodes = $derived(flattenHierarchy(hierarchyNodes))
</script>

<div class="space-y-1">
  {#if loading}
    <div class="text-center py-8 text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div class="text-lg font-medium text-gray-900 mb-2">Building hierarchy...</div>
      <div class="text-sm">Loading plan relationships</div>
    </div>
  {:else if flatNodes.length === 0}
    <div class="text-center py-8 text-gray-500">
      <FileText size={48} class="mx-auto mb-4 text-gray-300" />
      <div class="text-lg font-medium text-gray-900 mb-2">No plans to display</div>
      <div class="text-sm">Plans will appear here once relationships are established</div>
    </div>
  {:else}
    {#each flatNodes as { node, hasChildren, isExpanded, indentLevel, depth }}
      <div 
        class="flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 border-l-2 transition-colors cursor-pointer"
        style="margin-left: {indentLevel}px; border-left-color: {depth === 0 ? '#3B82F6' : depth === 1 ? '#10B981' : '#F59E0B'}"
        onclick={() => onPlanView(node.plan.id)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && onPlanView(node.plan.id)}
      >
        <!-- Expansion toggle -->
        <div class="flex-shrink-0 mr-2">
          {#if hasChildren}
            <button
              onclick={(e) => {
                e.stopPropagation()
                toggleNode(node.plan.id)
              }}
              class="p-1 hover:bg-gray-200 rounded"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {#if isExpanded}
                <ChevronDown size={16} class="text-gray-600" />
              {:else}
                <ChevronRight size={16} class="text-gray-600" />
              {/if}
            </button>
          {:else}
            <div class="w-6 h-6"></div>
          {/if}
        </div>

        <!-- Relationship indicator -->
        {#if node.relationshipType && depth > 0}
          <div class="flex-shrink-0 mr-2" title={getRelationshipLabel(node.relationshipType)}>
            <svelte:component 
              this={getRelationshipIcon(node.relationshipType)} 
              size={14} 
              class="text-gray-500" 
            />
          </div>
        {/if}

        <!-- Plan icon -->
        <div class="flex-shrink-0 mr-3 relative">
          <FileText size={20} class="text-blue-500" />
          {#if node.plan.annotations_count && node.plan.annotations_count > 0}
            <span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {node.plan.annotations_count}
            </span>
          {/if}
        </div>

        <!-- Plan details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              {node.plan.title || 'Untitled Plan'}
            </h3>
            <div class="flex items-center space-x-1">
              {#if node.plan.is_starred}
                <Star size={12} class="text-yellow-500 fill-current" />
              {/if}
              {#if depth === 0}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Root
                </span>
              {/if}
            </div>
          </div>
          <div class="flex items-center space-x-4 mt-1 text-sm text-gray-500">
            <span class="font-mono">{node.plan.reference_number}</span>
            <span>•</span>
            <span>{formatDate(node.plan.created_at)}</span>
            {#if node.plan.plan_year}
              <span>•</span>
              <span class="flex items-center">
                <Calendar size={12} class="mr-1" />
                {node.plan.plan_year}
              </span>
            {/if}
            {#if node.plan.relationships_count && node.plan.relationships_count > 0}
              <span>•</span>
              <span class="flex items-center text-blue-600">
                <Link size={12} class="mr-1" />
                {node.plan.relationships_count} linked
              </span>
            {/if}
            {#if hasChildren}
              <span>•</span>
              <span class="text-green-600">{node.children.length} children</span>
            {/if}
          </div>
        </div>

        <!-- Tags -->
        <div class="flex items-center space-x-2">
          {#if node.plan.tags && node.plan.tags.length > 0}
            <div class="flex flex-wrap gap-1">
              {#each node.plan.tags.slice(0, 2) as tag}
                <span 
                  class="inline-block text-xs px-2 py-1 rounded"
                  style="background-color: {tag.color}20; color: {tag.color};"
                >
                  {tag.name}
                </span>
              {/each}
              {#if node.plan.tags.length > 2}
                <span class="text-xs text-gray-500">+{node.plan.tags.length - 2}</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-1 ml-2">
          <button 
            onclick={(e) => {
              e.stopPropagation()
              onPlanView(node.plan.id)
            }}
            class="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50"
            title="View plan"
          >
            <Eye size={14} />
          </button>
          <button 
            onclick={(e) => {
              e.stopPropagation()
              // Handle more actions
            }}
            class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="More actions"
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  /* Smooth expand/collapse animation */
  .hierarchy-item {
    transition: all 0.2s ease-in-out;
  }
</style>