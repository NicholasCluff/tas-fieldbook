<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { FileText, Star, Clock, Users, Download } from 'lucide-svelte'

	const dispatch = createEventDispatcher()

	export let templates = []
	export let selectedTemplate = null
	export let showFavoritesOnly = false

	let searchQuery = ''
	let selectedCategory = 'all'

	// Default system templates
	const defaultTemplates = [
		{
			id: 'setup',
			name: 'Setup & Planning',
			description: 'Initial site setup, equipment checks, and planning activities',
			category: 'setup',
			icon: '🏗️',
			is_system: true,
			is_favorite: false,
			usage_count: 0,
			content: `
				<h3>Site Setup</h3>
				<p><strong>Arrival Time:</strong> </p>
				<p><strong>Team Members:</strong> </p>
				<p><strong>Equipment Check:</strong></p>
				<ul>
					<li>Total Station: </li>
					<li>GPS Unit: </li>
					<li>Prism/Reflector: </li>
					<li>Measuring Tape: </li>
					<li>Field Book: </li>
				</ul>

				<h3>Site Conditions</h3>
				<p><strong>Access:</strong> </p>
				<p><strong>Terrain:</strong> </p>
				<p><strong>Vegetation:</strong> </p>
				<p><strong>Visibility:</strong> </p>

				<h3>Planned Activities</h3>
				<ul>
					<li>[ ] Control point establishment</li>
					<li>[ ] Boundary identification</li>
					<li>[ ] Feature survey</li>
					<li>[ ] Level survey</li>
				</ul>
			`
		},
		{
			id: 'fieldwork',
			name: 'Daily Fieldwork',
			description: 'Standard daily field activities and measurements',
			category: 'fieldwork',
			icon: '📐',
			is_system: true,
			is_favorite: true,
			usage_count: 0,
			content: `
				<h3>Morning Activities</h3>
				<p><strong>Start Time:</strong> </p>
				<p><strong>Instrument Setup:</strong> </p>
				<p><strong>Backsight Check:</strong> </p>

				<h3>Survey Work</h3>
				<p><strong>Area Surveyed:</strong> </p>
				<p><strong>Control Points Used:</strong> </p>
				
				<h4>Measurements</h4>
				<table class="survey-table">
					<thead>
						<tr><th>Point</th><th>Bearing</th><th>Distance</th><th>Notes</th></tr>
					</thead>
					<tbody>
						<tr><td></td><td></td><td></td><td></td></tr>
						<tr><td></td><td></td><td></td><td></td></tr>
					</tbody>
				</table>

				<h3>End of Day</h3>
				<p><strong>Finish Time:</strong> </p>
				<p><strong>Equipment Secured:</strong> </p>
				<p><strong>Next Day Plans:</strong> </p>
			`
		},
		{
			id: 'calculations',
			name: 'Calculations & Analysis',
			description: 'Coordinate calculations, closures, and data analysis',
			category: 'calculations',
			icon: '🧮',
			is_system: true,
			is_favorite: false,
			usage_count: 0,
			content: `
				<h3>Calculation Summary</h3>
				<p><strong>Calculation Type:</strong> </p>
				<p><strong>Data Source:</strong> </p>

				<h4>Traverse Calculations</h4>
				<div class="bearing-calculation">
					<strong>Starting Point:</strong> <br>
					<strong>Ending Point:</strong> <br>
					<strong>Closure Error:</strong> <br>
					<strong>Precision:</strong> 
				</div>

				<h4>Coordinate Data</h4>
				<table class="survey-table">
					<thead>
						<tr><th>Point</th><th>Easting</th><th>Northing</th><th>RL</th></tr>
					</thead>
					<tbody>
						<tr><td></td><td></td><td></td><td></td></tr>
						<tr><td></td><td></td><td></td><td></td></tr>
					</tbody>
				</table>

				<h3>Verification</h3>
				<p><strong>Independent Check:</strong> </p>
				<p><strong>Tolerance Met:</strong> </p>
			`
		},
		{
			id: 'review',
			name: 'Review & QA',
			description: 'Data review, quality assurance, and final checks',
			category: 'review',
			icon: '✅',
			is_system: true,
			is_favorite: false,
			usage_count: 0,
			content: `
				<h3>Data Review</h3>
				<p><strong>Review Date:</strong> </p>
				<p><strong>Reviewed By:</strong> </p>

				<h4>Quality Checks</h4>
				<ul>
					<li>[ ] Field measurements verified</li>
					<li>[ ] Calculations checked</li>
					<li>[ ] Coordinates validated</li>
					<li>[ ] Closure within tolerance</li>
					<li>[ ] Photos geotagged</li>
					<li>[ ] Plan references correct</li>
				</ul>

				<h3>Issues Found</h3>
				<p></p>

				<h3>Corrections Made</h3>
				<p></p>

				<h3>Final Status</h3>
				<p><strong>Approved:</strong> </p>
				<p><strong>Comments:</strong> </p>
			`
		}
	]

	// Merge provided templates with defaults
	$: allTemplates = [...defaultTemplates, ...templates]

	// Filter templates
	$: filteredTemplates = allTemplates.filter(template => {
		const matchesSearch = !searchQuery || 
			template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			template.description.toLowerCase().includes(searchQuery.toLowerCase())
		
		const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
		
		const matchesFavorites = !showFavoritesOnly || template.is_favorite
		
		return matchesSearch && matchesCategory && matchesFavorites
	})

	// Categories for filtering
	$: categories = [
		{ id: 'all', name: 'All', count: allTemplates.length },
		{ id: 'setup', name: 'Setup', count: allTemplates.filter(t => t.category === 'setup').length },
		{ id: 'fieldwork', name: 'Fieldwork', count: allTemplates.filter(t => t.category === 'fieldwork').length },
		{ id: 'calculations', name: 'Calculations', count: allTemplates.filter(t => t.category === 'calculations').length },
		{ id: 'review', name: 'Review', count: allTemplates.filter(t => t.category === 'review').length }
	]

	function selectTemplate(template) {
		selectedTemplate = template
		dispatch('select', template)
	}

	function toggleFavorite(template) {
		template.is_favorite = !template.is_favorite
		dispatch('toggleFavorite', template)
	}

	function exportTemplate(template) {
		dispatch('export', template)
	}

	function getRecentUsage(template) {
		if (template.usage_count === 0) return 'Never used'
		if (template.usage_count === 1) return 'Used once'
		return `Used ${template.usage_count} times`
	}
</script>

<div class="template-selector">
	<!-- Header -->
	<div class="template-header">
		<h3 class="template-title">Choose Template</h3>
		<p class="template-subtitle">Select a template to get started quickly</p>
	</div>

	<!-- Filters -->
	<div class="template-filters">
		<!-- Search -->
		<div class="search-wrapper">
			<input
				type="text"
				placeholder="Search templates..."
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>

		<!-- Category Filter -->
		<div class="category-filter">
			{#each categories as category}
				<button
					class="category-btn {selectedCategory === category.id ? 'active' : ''}"
					on:click={() => selectedCategory = category.id}
				>
					{category.name} ({category.count})
				</button>
			{/each}
		</div>

		<!-- Favorites Toggle -->
		<label class="favorites-toggle">
			<input
				type="checkbox"
				bind:checked={showFavoritesOnly}
			/>
			<Star size={14} class="star-icon {showFavoritesOnly ? 'active' : ''}" />
			Favorites only
		</label>
	</div>

	<!-- Template Grid -->
	<div class="template-grid">
		{#each filteredTemplates as template}
			<div class="template-card {selectedTemplate?.id === template.id ? 'selected' : ''}">
				<!-- Template Header -->
				<div class="template-card-header">
					<div class="template-info">
						<span class="template-icon">{template.icon}</span>
						<div>
							<h4 class="template-name">{template.name}</h4>
							<p class="template-meta">
								{template.is_system ? 'System' : 'Custom'} • 
								{getRecentUsage(template)}
							</p>
						</div>
					</div>
					<div class="template-actions">
						<button
							class="action-btn favorite-btn {template.is_favorite ? 'active' : ''}"
							on:click|stopPropagation={() => toggleFavorite(template)}
							title="Toggle favorite"
						>
							<Star size={16} fill={template.is_favorite ? 'currentColor' : 'none'} />
						</button>
						{#if !template.is_system}
							<button
								class="action-btn"
								on:click|stopPropagation={() => exportTemplate(template)}
								title="Export template"
							>
								<Download size={16} />
							</button>
						{/if}
					</div>
				</div>

				<!-- Template Description -->
				<p class="template-description">{template.description}</p>

				<!-- Category Badge -->
				<div class="template-footer">
					<span class="category-badge category-{template.category}">
						{template.category}
					</span>
					
					{#if template.usage_count > 0}
						<div class="usage-indicator">
							<Clock size={12} />
							<span>{template.usage_count}</span>
						</div>
					{/if}
				</div>

				<!-- Select Button -->
				<button
					class="select-template-btn"
					on:click={() => selectTemplate(template)}
				>
					Use This Template
				</button>
			</div>
		{/each}

		<!-- Blank Template Option -->
		<div class="template-card blank-template">
			<div class="template-card-header">
				<div class="template-info">
					<span class="template-icon">📝</span>
					<div>
						<h4 class="template-name">Blank Entry</h4>
						<p class="template-meta">Start from scratch</p>
					</div>
				</div>
			</div>
			
			<p class="template-description">Create a new entry without any predefined structure or content.</p>
			
			<button
				class="select-template-btn"
				on:click={() => selectTemplate(null)}
			>
				Start Blank
			</button>
		</div>
	</div>

	<!-- Empty State -->
	{#if filteredTemplates.length === 0}
		<div class="empty-state">
			<FileText class="empty-icon" size={48} />
			<h4 class="empty-title">No templates found</h4>
			<p class="empty-description">
				{searchQuery ? 'Try adjusting your search terms.' : 'No templates match your current filters.'}
			</p>
		</div>
	{/if}
</div>

<style>
	.template-selector {
		padding: 1.5rem;
	}

	.template-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.template-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin-bottom: 0.5rem;
	}

	.template-subtitle {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.template-filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.search-wrapper {
		width: 100%;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.category-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		background: white;
		color: #6b7280;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.category-btn:hover {
		background: #f3f4f6;
	}

	.category-btn.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.favorites-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
		cursor: pointer;
	}

	.star-icon {
		color: #d1d5db;
		transition: color 0.15s ease;
	}

	.star-icon.active {
		color: #fbbf24;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.template-card {
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
		background: white;
		cursor: pointer;
		transition: all 0.15s ease;
		position: relative;
	}

	.template-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.template-card.selected {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.blank-template {
		border-style: dashed;
		border-color: #9ca3af;
	}

	.blank-template:hover {
		border-color: #6b7280;
		border-style: solid;
	}

	.template-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.template-info {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.template-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.template-name {
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.template-meta {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.template-actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		width: 2rem;
		height: 2rem;
		border: none;
		background: #f3f4f6;
		color: #6b7280;
		border-radius: 0.375rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: #e5e7eb;
		color: #374151;
	}

	.favorite-btn.active {
		background: #fef3c7;
		color: #f59e0b;
	}

	.template-description {
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.template-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.category-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.category-setup { background: #f3f4f6; color: #374151; }
	.category-fieldwork { background: #dbeafe; color: #1e40af; }
	.category-calculations { background: #d1fae5; color: #047857; }
	.category-review { background: #fef3c7; color: #92400e; }

	.usage-indicator {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.select-template-btn {
		width: 100%;
		padding: 0.75rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.select-template-btn:hover {
		background: #2563eb;
	}

	.template-card.selected .select-template-btn {
		background: #1d4ed8;
	}

	.blank-template .select-template-btn {
		background: #6b7280;
	}

	.blank-template .select-template-btn:hover {
		background: #4b5563;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-icon {
		color: #d1d5db;
		margin: 0 auto 1rem;
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.empty-description {
		color: #6b7280;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.template-grid {
			grid-template-columns: 1fr;
		}

		.template-filters {
			gap: 0.75rem;
		}

		.category-filter {
			gap: 0.25rem;
		}

		.category-btn {
			padding: 0.375rem 0.75rem;
			font-size: 0.8125rem;
		}
	}
</style>