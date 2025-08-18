<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    Maximize2,
    ExternalLink
  } from 'lucide-svelte'
  import { planRelationshipsService } from '$lib/services/planRelationships.service.js'
  import type { PlanRelationship } from '$lib/types/database.js'

  interface Props {
    planId: string
    projectId: string
    planTitle?: string
    planReferenceNumber?: string
    maxDepth?: number
    width?: number
    height?: number
  }

  let { 
    planId, 
    projectId,
    planTitle,
    planReferenceNumber,
    maxDepth = 2, 
    width = 800, 
    height = 500 
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    'navigate-to-plan': { planId: string }
    'close': void
  }>()

  interface Node {
    id: string
    referenceNumber: string
    title?: string
    x: number
    y: number
    radius: number
    color: string
    isCurrent: boolean
    relationships: number
  }

  interface Edge {
    source: string
    target: string
    type: PlanRelationship['relationship_type']
    color: string
    label: string
  }

  let svgRef: SVGSVGElement
  let loading = $state(true)
  let error = $state('')
  let nodes = $state<Node[]>([])
  let edges = $state<Edge[]>([])
  
  // Zoom and pan state
  let scale = $state(1)
  let translateX = $state(0)
  let translateY = $state(0)
  let isDragging = $state(false)
  let dragStart = $state({ x: 0, y: 0 })

  const colors = {
    current: '#3B82F6',
    related: '#10B981',
    parent: '#F59E0B',
    child: '#EF4444',
    supersedes: '#8B5CF6',
    superseded_by: '#6B7280'
  }

  onMount(() => {
    loadRelationshipData()
  })

  async function loadRelationshipData() {
    loading = true
    error = ''
    
    try {
      // Get basic relationship data for the plan
      const relationshipsResult = await planRelationshipsService.getPlanRelationships(planId)
      
      if (!relationshipsResult.success) {
        throw new Error(relationshipsResult.error || 'Failed to load relationships')
      }
      
      const data = relationshipsResult.data
      if (!data) {
        throw new Error('No relationship data found')
      }
      
      // Build nodes and edges from relationship data
      const nodeMap = new Map<string, Node>()
      const edgeList: Edge[] = []
      
      // Add current plan as center node (we'll need to get current plan details)
      const centerX = width / 2
      const centerY = height / 2
      
      // Add current plan as center node with provided details
      nodeMap.set(planId, {
        id: planId,
        referenceNumber: planReferenceNumber || 'Current Plan',
        title: planTitle,
        x: centerX,
        y: centerY,
        radius: 30,
        color: colors.current,
        isCurrent: true,
        relationships: data.as_parent.length + data.as_child.length
      })
      
      // Add parent nodes (where current plan is child)
      if (data.as_child && data.as_child.length > 0) {
        data.as_child.forEach((relationship: any, index: number) => {
          const angle = (Math.PI * 2 * index) / data.as_child.length - Math.PI / 2
          const distance = 120
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance
          
          nodeMap.set(relationship.parent_plan.id, {
            id: relationship.parent_plan.id,
            referenceNumber: relationship.parent_plan.reference_number,
            title: relationship.parent_plan.title,
            x,
            y,
            radius: 25,
            color: getNodeColor(relationship.relationship_type),
            isCurrent: false,
            relationships: 1 // Simplified for now
          })
          
          edgeList.push({
            source: relationship.parent_plan.id,
            target: planId,
            type: relationship.relationship_type,
            color: getEdgeColor(relationship.relationship_type),
            label: getRelationshipLabel(relationship.relationship_type)
          })
        })
      }
      
      // Add child nodes (where current plan is parent)
      if (data.as_parent && data.as_parent.length > 0) {
        data.as_parent.forEach((relationship: any, index: number) => {
          const angle = (Math.PI * 2 * index) / data.as_parent.length + Math.PI / 2
          const distance = 120
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance
          
          nodeMap.set(relationship.child_plan.id, {
            id: relationship.child_plan.id,
            referenceNumber: relationship.child_plan.reference_number,
            title: relationship.child_plan.title,
            x,
            y,
            radius: 25,
            color: getNodeColor(relationship.relationship_type),
            isCurrent: false,
            relationships: 1 // Simplified for now
          })
          
          edgeList.push({
            source: planId,
            target: relationship.child_plan.id,
            type: relationship.relationship_type,
            color: getEdgeColor(relationship.relationship_type),
            label: getRelationshipLabel(relationship.relationship_type)
          })
        })
      }
      
      nodes = Array.from(nodeMap.values())
      edges = edgeList
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load relationship data'
      console.error('Relationship diagram error:', err)
    } finally {
      loading = false
    }
  }

  function getNodeColor(relationshipType: PlanRelationship['relationship_type']): string {
    return colors[relationshipType] || colors.related
  }

  function getEdgeColor(relationshipType: PlanRelationship['relationship_type']): string {
    return colors[relationshipType] || colors.related
  }

  function getRelationshipLabel(type: PlanRelationship['relationship_type']): string {
    switch (type) {
      case 'parent': return 'Parent'
      case 'child': return 'Child'
      case 'supersedes': return 'Supersedes'
      case 'superseded_by': return 'Superseded by'
      default: return 'Related'
    }
  }

  // Zoom and pan functions
  function zoomIn() {
    scale = Math.min(scale * 1.2, 3)
  }

  function zoomOut() {
    scale = Math.max(scale / 1.2, 0.3)
  }

  function resetView() {
    scale = 1
    translateX = 0
    translateY = 0
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.target === svgRef) {
      isDragging = true
      dragStart = { x: event.clientX - translateX, y: event.clientY - translateY }
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      translateX = event.clientX - dragStart.x
      translateY = event.clientY - dragStart.y
    }
  }

  function handleMouseUp() {
    isDragging = false
  }

  function handleNodeClick(nodeId: string) {
    if (nodeId !== planId) {
      dispatch('navigate-to-plan', { planId: nodeId })
    }
  }

  // Calculate edge path
  function getEdgePath(edge: Edge): string {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    if (!sourceNode || !targetNode) return ''
    
    // Calculate edge start and end points (on circle circumference)
    const dx = targetNode.x - sourceNode.x
    const dy = targetNode.y - sourceNode.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return ''
    
    const sourceX = sourceNode.x + (dx / distance) * sourceNode.radius
    const sourceY = sourceNode.y + (dy / distance) * sourceNode.radius
    const targetX = targetNode.x - (dx / distance) * targetNode.radius
    const targetY = targetNode.y - (dy / distance) * targetNode.radius
    
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  }

  // Calculate edge midpoint for labels
  function getEdgeMidpoint(edge: Edge): { x: number; y: number } {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    if (!sourceNode || !targetNode) return { x: 0, y: 0 }
    
    return {
      x: (sourceNode.x + targetNode.x) / 2,
      y: (sourceNode.y + targetNode.y) / 2
    }
  }
</script>

<div class="relative w-full h-full border border-gray-200 rounded-lg bg-white overflow-hidden">
  <!-- Controls -->
  <div class="absolute top-4 right-4 z-10 flex space-x-2">
    <button
      onclick={zoomIn}
      class="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
      title="Zoom in"
    >
      <ZoomIn size={16} />
    </button>
    <button
      onclick={zoomOut}
      class="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
      title="Zoom out"
    >
      <ZoomOut size={16} />
    </button>
    <button
      onclick={resetView}
      class="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
      title="Reset view"
    >
      <RotateCcw size={16} />
    </button>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <div class="text-gray-600 text-sm">Loading relationship diagram...</div>
      </div>
    </div>
  {:else if error}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="text-red-500 mb-2">Failed to load diagram</div>
        <div class="text-gray-600 text-sm">{error}</div>
        <button
          onclick={loadRelationshipData}
          class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  {:else if nodes.length === 1}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="text-gray-500 mb-2">No relationships found</div>
        <div class="text-gray-400 text-sm">This plan has no connected relationships to display</div>
      </div>
    </div>
  {:else}
    <!-- SVG Diagram -->
    <svg
      bind:this={svgRef}
      {width}
      {height}
      class="cursor-grab active:cursor-grabbing"
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
    >
      <g transform="translate({translateX}, {translateY}) scale({scale})">
        <!-- Edges -->
        {#each edges as edge}
          {@const midpoint = getEdgeMidpoint(edge)}
          <g>
            <!-- Edge line -->
            <path
              d={getEdgePath(edge)}
              stroke={edge.color}
              stroke-width="2"
              fill="none"
              marker-end="url(#arrowhead-{edge.type})"
            />
            
            <!-- Edge label background -->
            <rect
              x={midpoint.x - 20}
              y={midpoint.y - 8}
              width="40"
              height="16"
              fill="white"
              stroke={edge.color}
              stroke-width="1"
              rx="8"
              class="opacity-90"
            />
            
            <!-- Edge label text -->
            <text
              x={midpoint.x}
              y={midpoint.y}
              text-anchor="middle"
              dominant-baseline="middle"
              class="text-xs fill-gray-700 font-medium pointer-events-none"
            >
              {edge.label}
            </text>
          </g>
        {/each}

        <!-- Nodes -->
        {#each nodes as node}
          <g 
            class="cursor-pointer"
            onclick={() => handleNodeClick(node.id)}
          >
            <!-- Node circle -->
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={node.color}
              stroke="white"
              stroke-width="3"
              class="hover:stroke-gray-300 transition-all duration-200"
              class:ring-4={node.isCurrent}
              class:ring-blue-200={node.isCurrent}
            />
            
            <!-- Node label background -->
            <rect
              x={node.x - 40}
              y={node.y + node.radius + 5}
              width="80"
              height="32"
              fill="white"
              stroke="gray"
              stroke-width="1"
              rx="4"
              class="opacity-90"
            />
            
            <!-- Node label -->
            <text
              x={node.x}
              y={node.y + node.radius + 15}
              text-anchor="middle"
              class="text-xs font-semibold fill-gray-900 pointer-events-none"
            >
              {node.referenceNumber}
            </text>
            
            {#if node.title}
              <text
                x={node.x}
                y={node.y + node.radius + 28}
                text-anchor="middle"
                class="text-xs fill-gray-600 pointer-events-none"
              >
                {node.title.substring(0, 12)}{node.title.length > 12 ? '...' : ''}
              </text>
            {/if}

            <!-- Navigation icon for non-current nodes -->
            {#if !node.isCurrent}
              <circle
                cx={node.x + node.radius - 8}
                cy={node.y - node.radius + 8}
                r="10"
                fill="white"
                stroke={node.color}
                stroke-width="2"
                class="opacity-0 hover:opacity-100 transition-opacity duration-200"
              />
              <ExternalLink
                size={12}
                class="pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
                style="transform: translate({node.x + node.radius - 14}px, {node.y - node.radius + 2}px)"
                stroke={node.color}
              />
            {/if}
          </g>
        {/each}

        <!-- Arrow markers -->
        <defs>
          {#each Object.entries(colors) as [type, color]}
            <marker
              id="arrowhead-{type}"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={color}
              />
            </marker>
          {/each}
        </defs>
      </g>
    </svg>
  {/if}

  <!-- Legend -->
  {#if !loading && !error && nodes.length > 1}
    <div class="absolute bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-3 shadow-sm">
      <div class="text-xs font-semibold text-gray-700 mb-2">Relationship Types</div>
      <div class="space-y-1">
        {#each Object.entries(colors) as [type, color]}
          {#if type !== 'current'}
            <div class="flex items-center space-x-2 text-xs">
              <div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
              <span class="capitalize">{type.replace('_', ' ')}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>