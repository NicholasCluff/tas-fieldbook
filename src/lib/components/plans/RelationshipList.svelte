<script lang="ts">
  import { 
    Link, 
    ArrowRight,
    ArrowLeft,
    ArrowUpDown 
  } from 'lucide-svelte'
  import type { PlanRelationship } from '$lib/types/database.js'

  interface Props {
    relationships: {
      as_parent: any[]
      as_child: any[]
    }
    compact?: boolean
    maxDisplay?: number
  }

  let { 
    relationships, 
    compact = false, 
    maxDisplay = 5 
  }: Props = $props()

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

  $: totalRelationships = relationships.as_parent.length + relationships.as_child.length
  $: displayRelationships = [
    ...relationships.as_parent.slice(0, Math.floor(maxDisplay / 2)),
    ...relationships.as_child.slice(0, Math.ceil(maxDisplay / 2))
  ].slice(0, maxDisplay)
  $: hasMore = totalRelationships > maxDisplay
</script>

{#if totalRelationships === 0}
  <div class="text-center py-4">
    <Link size={compact ? 24 : 32} class="mx-auto text-gray-300 mb-2" />
    <p class="text-gray-500 text-sm">No relationships</p>
  </div>
{:else}
  <div class="space-y-2">
    <!-- As Parent relationships -->
    {#each relationships.as_parent.slice(0, compact ? 2 : 5) as relationship}
      <div class="flex items-center space-x-2 text-sm">
        <svelte:component 
          this={getRelationshipIcon(relationship.relationship_type)} 
          size={14} 
          class="text-gray-500 flex-shrink-0" 
        />
        <span class="text-gray-600 text-xs">
          {getRelationshipLabel(relationship.relationship_type)}
        </span>
        <span class="font-medium text-gray-900 truncate">
          {relationship.child_plan.reference_number}
        </span>
        {#if relationship.child_plan.title && !compact}
          <span class="text-gray-600 truncate">
            - {relationship.child_plan.title}
          </span>
        {/if}
      </div>
    {/each}

    <!-- As Child relationships -->
    {#each relationships.as_child.slice(0, compact ? 2 : 5) as relationship}
      <div class="flex items-center space-x-2 text-sm">
        <span class="font-medium text-gray-900 truncate">
          {relationship.parent_plan.reference_number}
        </span>
        {#if relationship.parent_plan.title && !compact}
          <span class="text-gray-600 truncate">
            - {relationship.parent_plan.title}
          </span>
        {/if}
        <svelte:component 
          this={getRelationshipIcon(relationship.relationship_type)} 
          size={14} 
          class="text-gray-500 flex-shrink-0" 
        />
        <span class="text-gray-600 text-xs">this plan</span>
      </div>
    {/each}

    <!-- Show more indicator -->
    {#if hasMore}
      <div class="text-xs text-gray-500 pt-1">
        +{totalRelationships - displayRelationships.length} more relationships
      </div>
    {/if}
  </div>
{/if}