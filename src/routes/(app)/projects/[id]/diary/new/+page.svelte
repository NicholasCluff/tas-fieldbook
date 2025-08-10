<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import DiaryEditor from '$lib/components/diary/DiaryEditor.svelte'
	import DiaryTemplates from '$lib/components/diary/DiaryTemplates.svelte'
	import { 
		Save,
		X,
		ChevronLeft,
		FileText,
		Clock,
		MapPin,
		Thermometer,
		Calendar
	} from 'lucide-svelte'

	const projectId = $page.params.id

	$: project = $projectsStore.currentProject

	let saving = false
	let showTemplates = true

	// Form data
	let entryForm = {
		title: '',
		entry_date: new Date().toISOString().split('T')[0], // Today's date
		weather: '',
		temperature: null,
		location_lat: null,
		location_lng: null,
		content_html: '',
		template_type: null
	}

	// Template options
	let templates = [
		{
			id: 'setup',
			name: 'Setup & Planning',
			description: 'Initial site setup, equipment checks, and planning activities',
			icon: '🏗️',
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
			icon: '📐',
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
			icon: '🧮',
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
			icon: '✅',
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

	function selectTemplate(template) {
		entryForm.template_type = template.id
		entryForm.title = template.name + ' - ' + new Date().toLocaleDateString('en-AU')
		entryForm.content_html = template.content
		showTemplates = false
	}

	function useBlankTemplate() {
		entryForm.template_type = 'blank'
		entryForm.title = 'Field Notes - ' + new Date().toLocaleDateString('en-AU')
		entryForm.content_html = '<p>Start writing your field notes here...</p>'
		showTemplates = false
	}

	async function saveEntry() {
		if (!entryForm.title.trim()) {
			alert('Please enter a title for this entry')
			return
		}

		saving = true
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500))
		
		// In real implementation, this would save to Supabase
		// Entry would be saved here
		
		saving = false
		
		// Redirect to the diary list
		goto(`/projects/${projectId}/diary`)
	}

	function cancel() {
		goto(`/projects/${projectId}/diary`)
	}

	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					entryForm.location_lat = position.coords.latitude
					entryForm.location_lng = position.coords.longitude
				},
				(error) => {
					// Error getting location
				}
			)
		}
	}

	onMount(() => {
		// Auto-get current location if available
		getCurrentLocation()
	})
</script>

<svelte:head>
	<title>New Diary Entry - {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<div class="flex-1 flex flex-col">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button
					on:click={cancel}
					class="inline-flex items-center text-gray-600 hover:text-gray-900"
				>
					<ChevronLeft size={20} class="mr-1" />
					Back to Diary
				</button>
				<div class="h-6 w-px bg-gray-300"></div>
				<div>
					<h1 class="text-xl font-semibold text-gray-900">New Diary Entry</h1>
					<p class="text-sm text-gray-500">Create a new field diary entry</p>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<button
					on:click={cancel}
					class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
					disabled={saving}
				>
					<X size={16} class="mr-2" />
					Cancel
				</button>
				<button
					on:click={saveEntry}
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
					disabled={saving || showTemplates}
				>
					<Save size={16} class="mr-2" />
					{saving ? 'Creating...' : 'Create Entry'}
				</button>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if showTemplates}
			<!-- Template Selection -->
			<div class="p-6">
				<div class="max-w-4xl mx-auto">
					<div class="text-center mb-8">
						<h2 class="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
						<p class="text-gray-600">Select a template to get started, or create a blank entry</p>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{#each templates as template}
							<button
								on:click={() => selectTemplate(template)}
								class="text-left p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
							>
								<div class="flex items-center mb-3">
									<span class="text-2xl mr-3">{template.icon}</span>
									<h3 class="text-lg font-semibold text-gray-900">{template.name}</h3>
								</div>
								<p class="text-gray-600">{template.description}</p>
							</button>
						{/each}
					</div>

					<div class="text-center">
						<button
							on:click={useBlankTemplate}
							class="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
						>
							<FileText size={16} class="mr-2" />
							Start with Blank Entry
						</button>
					</div>
				</div>
			</div>
		{:else}
			<!-- Entry Form -->
			<div class="p-6 space-y-6">
				<!-- Basic Info -->
				<div class="bg-white rounded-lg border border-gray-200 p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Entry Details</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="md:col-span-2">
							<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
								Title <span class="text-red-500">*</span>
							</label>
							<input
								id="title"
								type="text"
								bind:value={entryForm.title}
								placeholder="Enter a descriptive title for this entry"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							/>
						</div>
						
						<div>
							<label for="date" class="block text-sm font-medium text-gray-700 mb-2">
								<Calendar size={16} class="inline mr-1" />
								Date
							</label>
							<input
								id="date"
								type="date"
								bind:value={entryForm.entry_date}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						
						<div>
							<label for="weather" class="block text-sm font-medium text-gray-700 mb-2">
								🌤️ Weather
							</label>
							<input
								id="weather"
								type="text"
								bind:value={entryForm.weather}
								placeholder="e.g., Clear and sunny, light breeze"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						
						<div>
							<label for="temperature" class="block text-sm font-medium text-gray-700 mb-2">
								<Thermometer size={16} class="inline mr-1" />
								Temperature (°C)
							</label>
							<input
								id="temperature"
								type="number"
								step="0.5"
								bind:value={entryForm.temperature}
								placeholder="e.g., 22.5"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								<MapPin size={16} class="inline mr-1" />
								Location
							</label>
							<div class="grid grid-cols-2 gap-2">
								<input
									type="number"
									step="0.0001"
									bind:value={entryForm.location_lat}
									placeholder="Latitude"
									class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<input
									type="number"
									step="0.0001"
									bind:value={entryForm.location_lng}
									placeholder="Longitude"
									class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<button
								type="button"
								on:click={getCurrentLocation}
								class="mt-2 text-sm text-blue-600 hover:text-blue-800"
							>
								📍 Use current location
							</button>
						</div>
					</div>
				</div>

				<!-- Content Editor -->
				<div class="bg-white rounded-lg border border-gray-200">
					<div class="border-b border-gray-200 px-6 py-4">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">Field Notes</h3>
							<button
								on:click={() => showTemplates = true}
								class="text-sm text-blue-600 hover:text-blue-800"
							>
								Change Template
							</button>
						</div>
					</div>
					<div class="p-6">
						<DiaryEditor bind:content={entryForm.content_html} />
					</div>
				</div>

				<!-- Template Info -->
				{#if entryForm.template_type && entryForm.template_type !== 'blank'}
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-center">
							<span class="text-lg mr-2">
								{templates.find(t => t.id === entryForm.template_type)?.icon}
							</span>
							<div>
								<p class="text-sm font-medium text-blue-900">
									Using template: {templates.find(t => t.id === entryForm.template_type)?.name}
								</p>
								<p class="text-sm text-blue-700">
									{templates.find(t => t.id === entryForm.template_type)?.description}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>