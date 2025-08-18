<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Search } from 'lucide-svelte'
  import { surveyPlansService } from '$lib/services/surveyPlans.service.js'
  import type { SurveyPlanWithDetails } from '$lib/types/database.js'

  interface Props {
    projectId: string
    excludePlanId?: string
    placeholder?: string
    selectedPlan?: SurveyPlanWithDetails | null
    disabled?: boolean
  }

  let { 
    projectId, 
    excludePlanId, 
    placeholder = 'Search plans by reference or title...',
    selectedPlan = $bindable(null),
    disabled = false
  }: Props = $props()

  const dispatch = createEventDispatcher<{
    'plan-selected': SurveyPlanWithDetails
    'plan-cleared': void
  }>()

  let searchQuery = $state('')
  let searchResults = $state<SurveyPlanWithDetails[]>([])
  let searchLoading = $state(false)
  let showDropdown = $state(false)
  let inputElement: HTMLInputElement | undefined

  // Update search query when selected plan changes
  $effect(() => {
    if (selectedPlan) {
      searchQuery = `${selectedPlan.reference_number}${selectedPlan.title ? ' - ' + selectedPlan.title : ''}`
      showDropdown = false
    } else {
      searchQuery = ''
    }
  })

  async function searchPlans() {
    if (!searchQuery.trim()) {
      searchResults = []
      showDropdown = false
      return
    }

    searchLoading = true
    showDropdown = true
    
    try {
      const result = await surveyPlansService.listPlans(projectId, {
        search: searchQuery,
        sort_by: 'reference_number',
        sort_order: 'asc'
      })
      
      if (result.success && result.data) {
        // Filter out excluded plan
        searchResults = result.data.filter(plan => plan.id !== excludePlanId)
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
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(searchPlans, 300)
    
    // If searchQuery is cleared, clear selection
    if (!searchQuery.trim() && selectedPlan) {
      selectedPlan = null
      dispatch('plan-cleared')
    }
  })

  function selectPlan(plan: SurveyPlanWithDetails) {
    selectedPlan = plan
    showDropdown = false
    dispatch('plan-selected', plan)
  }

  function clearSelection() {
    selectedPlan = null
    searchQuery = ''
    searchResults = []
    showDropdown = false
    dispatch('plan-cleared')
    inputElement?.focus()
  }

  function handleFocus() {
    if (searchQuery && !selectedPlan) {
      showDropdown = true
    }
  }

  function handleBlur() {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      showDropdown = false
    }, 150)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      showDropdown = false
      inputElement?.blur()
    }
  }
</script>

<div class="relative">
  <div class="relative">
    <Search size={16} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
    <input
      bind:this={inputElement}
      type="text"
      {placeholder}
      bind:value={searchQuery}
      {disabled}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
    
    {#if searchLoading}
      <div class="absolute right-8 top-1/2 transform -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    {/if}

    {#if selectedPlan}
      <button
        onclick={clearSelection}
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        title="Clear selection"
      >
        ×
      </button>
    {/if}
  </div>

  <!-- Selected Plan Display -->
  {#if selectedPlan}
    <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
      <div class="text-sm font-medium text-blue-900">{selectedPlan.reference_number}</div>
      {#if selectedPlan.title}
        <div class="text-xs text-blue-700">{selectedPlan.title}</div>
      {/if}
      {#if selectedPlan.relationships_count && selectedPlan.relationships_count > 0}
        <div class="text-xs text-blue-600 mt-1">
          {selectedPlan.relationships_count} existing relationship{selectedPlan.relationships_count === 1 ? '' : 's'}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Dropdown Results -->
  {#if showDropdown && searchResults.length > 0}
    <div class="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
      {#each searchResults as plan}
        <button
          onclick={() => selectPlan(plan)}
          class="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
        >
          <div class="text-sm font-medium text-gray-900">{plan.reference_number}</div>
          {#if plan.title}
            <div class="text-xs text-gray-600">{plan.title}</div>
          {/if}
          {#if plan.relationships_count && plan.relationships_count > 0}
            <div class="text-xs text-gray-500 mt-1">
              {plan.relationships_count} relationship{plan.relationships_count === 1 ? '' : 's'}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <!-- No Results -->
  {#if showDropdown && searchQuery && !searchLoading && searchResults.length === 0}
    <div class="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center">
      <div class="text-sm text-gray-500">No plans found matching "{searchQuery}"</div>
    </div>
  {/if}
</div>