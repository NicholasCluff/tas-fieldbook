<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { Plus, X, Edit3, Trash2, Check } from 'lucide-svelte'
	
	export let isOpen = false
	export let availableTags: any[] = []
	export let selectedTags: string[] = []
	export let projectId: string
	
	const dispatch = createEventDispatcher()
	
	let newTagName = ''
	let newTagColor = '#3B82F6'
	let editingTag: any = null
	let editingName = ''
	let editingColor = ''
	
	const predefinedColors = [
		'#3B82F6', // blue
		'#10B981', // green
		'#F59E0B', // yellow
		'#EF4444', // red
		'#8B5CF6', // purple
		'#6B7280', // gray
		'#EC4899', // pink
		'#14B8A6', // teal
		'#F97316', // orange
		'#84CC16'  // lime
	]
	
	function close() {
		isOpen = false
		newTagName = ''
		newTagColor = '#3B82F6'
		editingTag = null
		dispatch('close')
	}
	
	function isTagSelected(tagName: string): boolean {
		return selectedTags.includes(tagName)
	}
	
	function toggleTag(tagName: string) {
		if (isTagSelected(tagName)) {
			selectedTags = selectedTags.filter(tag => tag !== tagName)
		} else {
			selectedTags = [...selectedTags, tagName]
		}
		dispatch('selectionChange', { selectedTags })
	}
	
	function startCreateTag() {
		if (newTagName.trim()) {
			const newTag = {
				id: Math.random().toString(36).substr(2, 9),
				name: newTagName.trim().toLowerCase(),
				color: newTagColor,
				project_id: projectId
			}
			
			dispatch('createTag', { tag: newTag })
			newTagName = ''
			newTagColor = '#3B82F6'
		}
	}
	
	function startEditTag(tag: any) {
		editingTag = tag
		editingName = tag.name
		editingColor = tag.color
	}
	
	function saveEditTag() {
		if (editingTag && editingName.trim()) {
			const updatedTag = {
				...editingTag,
				name: editingName.trim().toLowerCase(),
				color: editingColor
			}
			
			dispatch('updateTag', { tag: updatedTag })
			editingTag = null
		}
	}
	
	function cancelEdit() {
		editingTag = null
		editingName = ''
		editingColor = ''
	}
	
	function deleteTag(tag: any) {
		if (confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all plans.`)) {
			dispatch('deleteTag', { tag })
		}
	}
	
	function handleKeyPress(event: KeyboardEvent, action: 'create' | 'edit') {
		if (event.key === 'Enter') {
			if (action === 'create') {
				startCreateTag()
			} else {
				saveEditTag()
			}
		} else if (event.key === 'Escape') {
			if (action === 'edit') {
				cancelEdit()
			}
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 blur-sm bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
			<div class="flex items-center justify-between mb-6">
				<h3 class="text-lg font-semibold text-gray-900">Manage Tags</h3>
				<button 
					on:click={close}
					class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
				>
					<X size={20} />
				</button>
			</div>
			
			<!-- Create New Tag -->
			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<h4 class="text-sm font-medium text-gray-700 mb-3">Create New Tag</h4>
				<div class="flex space-x-3">
					<div class="flex-1">
						<input 
							type="text" 
							placeholder="Tag name..."
							bind:value={newTagName}
							on:keypress={(e) => handleKeyPress(e, 'create')}
							class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div class="flex items-center space-x-2">
						<!-- Color Picker -->
						<input 
							type="color" 
							bind:value={newTagColor}
							class="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
						/>
						<!-- Predefined Colors -->
						<div class="flex space-x-1">
							{#each predefinedColors.slice(0, 5) as color}
								<button 
									class="w-6 h-6 rounded border-2 {newTagColor === color ? 'border-gray-400' : 'border-gray-200'}"
									style="background-color: {color}"
									on:click={() => newTagColor = color}
								></button>
							{/each}
						</div>
					</div>
					<button 
						on:click={startCreateTag}
						disabled={!newTagName.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
					>
						<Plus size={16} />
						<span>Add</span>
					</button>
				</div>
			</div>
			
			<!-- Available Tags -->
			<div>
				<h4 class="text-sm font-medium text-gray-700 mb-3">
					Available Tags ({availableTags.length})
				</h4>
				
				{#if availableTags.length === 0}
					<div class="text-center py-8 text-gray-500">
						<p>No tags created yet.</p>
						<p class="text-sm">Create your first tag above to organize your plans.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
						{#each availableTags as tag}
							<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
								{#if editingTag?.id === tag.id}
									<!-- Edit Mode -->
									<div class="flex items-center space-x-2 flex-1">
										<input 
											type="text" 
											bind:value={editingName}
											on:keypress={(e) => handleKeyPress(e, 'edit')}
											class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
										/>
										<input 
											type="color" 
											bind:value={editingColor}
											class="w-8 h-8 border border-gray-300 rounded cursor-pointer"
										/>
										<button 
											on:click={saveEditTag}
											class="p-1 text-green-600 hover:text-green-700"
											title="Save"
										>
											<Check size={16} />
										</button>
										<button 
											on:click={cancelEdit}
											class="p-1 text-gray-400 hover:text-gray-600"
											title="Cancel"
										>
											<X size={16} />
										</button>
									</div>
								{:else}
									<!-- Display Mode -->
									<label class="flex items-center space-x-3 cursor-pointer flex-1">
										<input 
											type="checkbox" 
											checked={isTagSelected(tag.name)}
											on:change={() => toggleTag(tag.name)}
											class="rounded"
										/>
										<div 
											class="w-4 h-4 rounded"
											style="background-color: {tag.color}"
										></div>
										<span class="text-sm font-medium text-gray-900">{tag.name}</span>
									</label>
									
									<div class="flex items-center space-x-1">
										<button 
											on:click={() => startEditTag(tag)}
											class="p-1 text-gray-400 hover:text-gray-600"
											title="Edit tag"
										>
											<Edit3 size={16} />
										</button>
										<button 
											on:click={() => deleteTag(tag)}
											class="p-1 text-gray-400 hover:text-red-600"
											title="Delete tag"
										>
											<Trash2 size={16} />
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Actions -->
			<div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
				<div class="text-sm text-gray-500">
					{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
				</div>
				<div class="flex space-x-3">
					<button 
						on:click={close}
						class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}