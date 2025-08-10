<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { 
		FileText, 
		MoreVertical, 
		Eye, 
		Edit3, 
		Trash2, 
		Download,
		Tag,
		Link,
		Copy,
		Star,
		StarOff
	} from 'lucide-svelte'
	
	export let plans: any[] = []
	export let viewMode: 'grid' | 'list' = 'grid'
	export let selectable = false
	export let selectedPlans: string[] = []
	
	const dispatch = createEventDispatcher()
	
	let showActionsMenu: string | null = null
	let favoriteIds: string[] = []
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}
	
	function getTagColor(tag: string): string {
		const colors = {
			'boundary': 'bg-blue-100 text-blue-800',
			'residential': 'bg-green-100 text-green-800',
			'commercial': 'bg-yellow-100 text-yellow-800',
			'industrial': 'bg-purple-100 text-purple-800',
			'historical': 'bg-red-100 text-red-800',
			'cadastral': 'bg-gray-100 text-gray-800',
			'easement': 'bg-indigo-100 text-indigo-800'
		}
		return colors[tag] || 'bg-gray-100 text-gray-800'
	}
	
	function handlePlanClick(planId: string) {
		dispatch('planSelect', { planId })
	}
	
	function handleActionClick(event: Event, planId: string) {
		event.stopPropagation()
		showActionsMenu = showActionsMenu === planId ? null : planId
	}
	
	function handleAction(action: string, plan: any) {
		showActionsMenu = null
		dispatch(action, { plan })
	}
	
	function toggleSelection(planId: string) {
		if (selectedPlans.includes(planId)) {
			selectedPlans = selectedPlans.filter(id => id !== planId)
		} else {
			selectedPlans = [...selectedPlans, planId]
		}
		dispatch('selectionChange', { selectedPlans })
	}
	
	function toggleFavorite(planId: string) {
		if (favoriteIds.includes(planId)) {
			favoriteIds = favoriteIds.filter(id => id !== planId)
		} else {
			favoriteIds = [...favoriteIds, planId]
		}
		dispatch('favoriteToggle', { planId, isFavorite: favoriteIds.includes(planId) })
	}
	
	// Close menu when clicking outside
	function handleDocumentClick() {
		showActionsMenu = null
	}
</script>

<svelte:document on:click={handleDocumentClick} />

<div class="bg-white rounded-lg shadow">
	{#if plans.length === 0}
		<div class="px-6 py-12 text-center">
			<FileText size={48} class="mx-auto text-gray-300 mb-4" />
			<h3 class="text-lg font-medium text-gray-900 mb-2">No plans found</h3>
			<p class="text-gray-600">Upload and process documents to extract survey plans</p>
		</div>
	{:else if viewMode === 'grid'}
		<div class="p-6">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each plans as plan}
					<div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
						<!-- Plan Preview -->
						<div class="relative">
							<button 
								class="w-full bg-gray-100 h-48 flex items-center justify-center hover:bg-gray-200 transition-colors"
								on:click={() => handlePlanClick(plan.id)}
							>
								<FileText size={32} class="text-gray-400" />
							</button>
							
							<!-- Selection checkbox -->
							{#if selectable}
								<div class="absolute top-2 left-2">
									<input 
										type="checkbox" 
										checked={selectedPlans.includes(plan.id)}
										on:change={() => toggleSelection(plan.id)}
										class="rounded"
									/>
								</div>
							{/if}
							
							<!-- Favorite button -->
							<button 
								class="absolute top-2 right-2 p-1 bg-white bg-opacity-80 rounded-md hover:bg-opacity-100"
								on:click={() => toggleFavorite(plan.id)}
							>
								<svelte:component 
									this={favoriteIds.includes(plan.id) ? Star : StarOff} 
									size={16} 
									class={favoriteIds.includes(plan.id) ? 'text-yellow-500' : 'text-gray-400'}
								/>
							</button>
						</div>
						
						<!-- Plan Details -->
						<div class="p-4">
							<div class="flex items-start justify-between mb-2">
								<div class="flex-1 min-w-0">
									<h3 class="font-medium text-gray-900 text-sm truncate">{plan.title}</h3>
									<p class="text-xs text-gray-500 mt-1">{plan.reference_number}</p>
								</div>
								<div class="relative">
									<button 
										class="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
										on:click={(e) => handleActionClick(e, plan.id)}
									>
										<MoreVertical size={16} />
									</button>
									
									<!-- Actions Menu -->
									{#if showActionsMenu === plan.id}
										<div class="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('view', plan)}
											>
												<Eye size={16} />
												<span>View</span>
											</button>
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('edit', plan)}
											>
												<Edit3 size={16} />
												<span>Edit</span>
											</button>
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('download', plan)}
											>
												<Download size={16} />
												<span>Download</span>
											</button>
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('copy', plan)}
											>
												<Copy size={16} />
												<span>Duplicate</span>
											</button>
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('manageTags', plan)}
											>
												<Tag size={16} />
												<span>Manage Tags</span>
											</button>
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
												on:click={() => handleAction('manageRelationships', plan)}
											>
												<Link size={16} />
												<span>Relationships</span>
											</button>
											<hr class="my-1" />
											<button 
												class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
												on:click={() => handleAction('delete', plan)}
											>
												<Trash2 size={16} />
												<span>Delete</span>
											</button>
										</div>
									{/if}
								</div>
							</div>
							
							{#if plan.description}
								<p class="text-xs text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
							{/if}
							
							<!-- Tags -->
							{#if plan.tags && plan.tags.length > 0}
								<div class="flex flex-wrap gap-1 mb-3">
									{#each plan.tags.slice(0, 3) as tag}
										<span class="inline-block text-xs px-2 py-1 rounded {getTagColor(tag)}">
											{tag}
										</span>
									{/each}
									{#if plan.tags.length > 3}
										<span class="text-xs text-gray-500">+{plan.tags.length - 3}</span>
									{/if}
								</div>
							{/if}
							
							<div class="text-xs text-gray-500">
								{formatDate(plan.created_at)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- List View -->
		<div class="divide-y divide-gray-200">
			{#each plans as plan}
				<div class="px-6 py-4 hover:bg-gray-50">
					<div class="flex items-center space-x-4">
						{#if selectable}
							<input 
								type="checkbox" 
								checked={selectedPlans.includes(plan.id)}
								on:change={() => toggleSelection(plan.id)}
								class="rounded"
							/>
						{/if}
						
						<div class="flex-shrink-0">
							<FileText size={20} class="text-blue-500" />
						</div>
						
						<div class="flex-1 min-w-0 cursor-pointer" on:click={() => handlePlanClick(plan.id)}>
							<div class="flex items-center justify-between">
								<div class="flex-1 min-w-0">
									<h3 class="text-sm font-medium text-gray-900 truncate">{plan.title}</h3>
									<div class="flex items-center space-x-4 mt-1 text-sm text-gray-500">
										<span>{plan.reference_number}</span>
										<span>•</span>
										<span>{formatDate(plan.created_at)}</span>
									</div>
								</div>
								
								<div class="flex items-center space-x-4">
									<!-- Tags -->
									{#if plan.tags && plan.tags.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each plan.tags.slice(0, 2) as tag}
												<span class="inline-block text-xs px-2 py-1 rounded {getTagColor(tag)}">
													{tag}
												</span>
											{/each}
											{#if plan.tags.length > 2}
												<span class="text-xs text-gray-500">+{plan.tags.length - 2}</span>
											{/if}
										</div>
									{/if}
									
									<!-- Favorite button -->
									<button 
										class="p-1 text-gray-400 hover:text-yellow-500"
										on:click={() => toggleFavorite(plan.id)}
									>
										<svelte:component 
											this={favoriteIds.includes(plan.id) ? Star : StarOff} 
											size={16} 
											class={favoriteIds.includes(plan.id) ? 'text-yellow-500' : 'text-gray-400'}
										/>
									</button>
									
									<!-- Actions Menu -->
									<div class="relative">
										<button 
											class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
											on:click={(e) => handleActionClick(e, plan.id)}
										>
											<MoreVertical size={16} />
										</button>
										
										{#if showActionsMenu === plan.id}
											<div class="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
													on:click={() => handleAction('view', plan)}
												>
													<Eye size={16} />
													<span>View</span>
												</button>
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
													on:click={() => handleAction('edit', plan)}
												>
													<Edit3 size={16} />
													<span>Edit</span>
												</button>
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
													on:click={() => handleAction('download', plan)}
												>
													<Download size={16} />
													<span>Download</span>
												</button>
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
													on:click={() => handleAction('manageTags', plan)}
												>
													<Tag size={16} />
													<span>Manage Tags</span>
												</button>
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
													on:click={() => handleAction('manageRelationships', plan)}
												>
													<Link size={16} />
													<span>Relationships</span>
												</button>
												<hr class="my-1" />
												<button 
													class="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
													on:click={() => handleAction('delete', plan)}
												>
													<Trash2 size={16} />
													<span>Delete</span>
												</button>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>