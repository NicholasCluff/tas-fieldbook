<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import DiaryEditor from '$lib/components/diary/DiaryEditor.svelte'
	import { 
		Edit3,
		Save,
		X,
		Calendar,
		MapPin,
		Thermometer,
		Clock,
		Calculator,
		Camera,
		FileText,
		ChevronLeft,
		Settings,
		Link
	} from 'lucide-svelte'

	const projectId = $page.params.id
	const entryId = $page.params.entryId

	$: project = $projectsStore.currentProject
	$: canEdit = project?.owner_id === $authStore.profile?.id || project?.supervisor_id === $authStore.profile?.id

	let isEditing = false
	let saving = false

	// Mock entry data
	let entry = {
		id: entryId,
		title: 'Site Setup and Initial Survey',
		entry_date: '2025-01-18',
		weather: 'Partly cloudy, light breeze',
		temperature: 22.5,
		location_lat: -42.8821,
		location_lng: 147.3272,
		description: 'Established control point Alpha at the northeast corner of the property. GPS coordinates recorded with 2cm accuracy. Initial traverse commenced from boundary post #1.',
		content_html: `
			<h3>Morning Setup</h3>
			<p>Arrived at site at 8:30 AM. Weather conditions favorable for survey work.</p>
			
			<h4>Control Point Alpha - Establishment</h4>
			<p>Located at the northeast corner of the property:</p>
			<ul>
				<li><strong>Coordinates:</strong> -42.8821, 147.3272 (GDA2020)</li>
				<li><strong>Accuracy:</strong> ±2cm horizontal, ±3cm vertical</li>
				<li><strong>Monument:</strong> 50mm galvanized iron pipe, 600mm depth</li>
			</ul>

			<h4>Bearing Calculations</h4>
			<p>Initial bearing from Alpha to boundary post #1:</p>
			<div class="bearing-calculation">
				<strong>Bearing:</strong> 127°34'15" (True)
				<br><strong>Distance:</strong> 48.75m
				<br><strong>Grid Bearing:</strong> 129°12'30"
			</div>

			<h4>Traverse Data</h4>
			<table class="survey-table">
				<thead>
					<tr><th>Station</th><th>Bearing</th><th>Distance</th><th>Notes</th></tr>
				</thead>
				<tbody>
					<tr><td>Alpha → Post 1</td><td>127°34'15"</td><td>48.75m</td><td>Iron pipe found</td></tr>
					<tr><td>Post 1 → Post 2</td><td>89°15'42"</td><td>156.20m</td><td>Wooden post, good condition</td></tr>
				</tbody>
			</table>

			<h4>Site Conditions</h4>
			<p>Vegetation cleared around boundary markers. Some blackberry removal required near post #2. 
			Ground conditions generally good, some soft areas near creek crossing.</p>
		`,
		activities: ['Control point establishment', 'GPS survey', 'Boundary identification'],
		calculationCount: 3,
		photoCount: 8,
		planReferences: [
			{ planId: '1', referenceNumber: 'DP-123456', title: 'Original Survey Plan' },
			{ planId: '2', referenceNumber: 'TP-789012', title: 'Title Plan' }
		],
		mapReferences: [
			{ lat: -42.8821, lng: 147.3272, description: 'Control Point Alpha' }
		],
		created_at: '2025-01-18T08:30:00Z',
		updated_at: '2025-01-18T16:45:00Z',
		user_id: $authStore.profile?.id
	}

	// Form state for editing
	let editForm = {
		title: entry.title,
		entry_date: entry.entry_date,
		weather: entry.weather,
		temperature: entry.temperature,
		location_lat: entry.location_lat,
		location_lng: entry.location_lng,
		content_html: entry.content_html
	}

	function startEdit() {
		isEditing = true
		editForm = {
			title: entry.title,
			entry_date: entry.entry_date,
			weather: entry.weather,
			temperature: entry.temperature,
			location_lat: entry.location_lat,
			location_lng: entry.location_lng,
			content_html: entry.content_html
		}
	}

	function cancelEdit() {
		isEditing = false
		editForm = {
			title: entry.title,
			entry_date: entry.entry_date,
			weather: entry.weather,
			temperature: entry.temperature,
			location_lat: entry.location_lat,
			location_lng: entry.location_lng,
			content_html: entry.content_html
		}
	}

	async function saveEntry() {
		saving = true
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1000))
		
		// Update entry with form data
		entry = { ...entry, ...editForm, updated_at: new Date().toISOString() }
		isEditing = false
		saving = false
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-AU', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	}

	function formatTime(timestampStr: string) {
		return new Date(timestampStr).toLocaleTimeString('en-AU', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	function goBack() {
		goto(`/projects/${projectId}/diary`)
	}
</script>

<svelte:head>
	<title>{entry.title} - Diary - TasFieldbook</title>
</svelte:head>

<div class="flex-1 flex flex-col">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<button
					on:click={goBack}
					class="inline-flex items-center text-gray-600 hover:text-gray-900"
				>
					<ChevronLeft size={20} class="mr-1" />
					Back to Diary
				</button>
				<div class="h-6 w-px bg-gray-300"></div>
				<div>
					<h1 class="text-xl font-semibold text-gray-900">
						{isEditing ? 'Edit Entry' : entry.title}
					</h1>
					<p class="text-sm text-gray-500">
						{formatDate(entry.entry_date)} • Last updated {formatTime(entry.updated_at)}
					</p>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				{#if !isEditing && canEdit}
					<button
						on:click={startEdit}
						class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
					>
						<Edit3 size={16} class="mr-2" />
						Edit
					</button>
				{:else if isEditing}
					<button
						on:click={cancelEdit}
						class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
						disabled={saving}
					>
						<X size={16} class="mr-2" />
						Cancel
					</button>
					<button
						on:click={saveEntry}
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						disabled={saving}
					>
						<Save size={16} class="mr-2" />
						{saving ? 'Saving...' : 'Save'}
					</button>
				{/if}

				<button class="p-2 text-gray-600 hover:text-gray-900">
					<Settings size={16} />
				</button>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if isEditing}
			<!-- Edit Mode -->
			<div class="p-6 space-y-6">
				<!-- Basic Info Form -->
				<div class="bg-white rounded-lg border border-gray-200 p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Entry Details</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label for="title" class="block text-sm font-medium text-gray-700 mb-2">Title</label>
							<input
								id="title"
								type="text"
								bind:value={editForm.title}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="date" class="block text-sm font-medium text-gray-700 mb-2">Date</label>
							<input
								id="date"
								type="date"
								bind:value={editForm.entry_date}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="weather" class="block text-sm font-medium text-gray-700 mb-2">Weather</label>
							<input
								id="weather"
								type="text"
								bind:value={editForm.weather}
								placeholder="e.g., Clear and sunny"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="temperature" class="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
							<input
								id="temperature"
								type="number"
								step="0.5"
								bind:value={editForm.temperature}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="lat" class="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
							<input
								id="lat"
								type="number"
								step="0.0001"
								bind:value={editForm.location_lat}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="lng" class="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
							<input
								id="lng"
								type="number"
								step="0.0001"
								bind:value={editForm.location_lng}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>
				</div>

				<!-- Rich Text Editor -->
				<div class="bg-white rounded-lg border border-gray-200">
					<div class="border-b border-gray-200 px-6 py-4">
						<h3 class="text-lg font-medium text-gray-900">Content</h3>
					</div>
					<div class="p-6">
						<DiaryEditor bind:content={editForm.content_html} />
					</div>
				</div>
			</div>
		{:else}
			<!-- View Mode -->
			<div class="p-6 space-y-6">
				<!-- Entry Metadata -->
				<div class="bg-white rounded-lg border border-gray-200 p-6">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div class="flex items-center">
							<Calendar class="w-5 h-5 text-gray-400 mr-3" />
							<div>
								<p class="text-sm text-gray-500">Date</p>
								<p class="font-medium">{formatDate(entry.entry_date)}</p>
							</div>
						</div>

						{#if entry.weather}
							<div class="flex items-center">
								<span class="text-lg mr-3">🌤️</span>
								<div>
									<p class="text-sm text-gray-500">Weather</p>
									<p class="font-medium">{entry.weather}</p>
								</div>
							</div>
						{/if}

						{#if entry.temperature}
							<div class="flex items-center">
								<Thermometer class="w-5 h-5 text-gray-400 mr-3" />
								<div>
									<p class="text-sm text-gray-500">Temperature</p>
									<p class="font-medium">{entry.temperature}°C</p>
								</div>
							</div>
						{/if}

						{#if entry.location_lat && entry.location_lng}
							<div class="flex items-center">
								<MapPin class="w-5 h-5 text-gray-400 mr-3" />
								<div>
									<p class="text-sm text-gray-500">Location</p>
									<p class="font-medium text-xs">{entry.location_lat.toFixed(4)}, {entry.location_lng.toFixed(4)}</p>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Activities -->
				{#if entry.activities && entry.activities.length > 0}
					<div class="bg-white rounded-lg border border-gray-200 p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Activities</h3>
						<div class="flex flex-wrap gap-2">
							{#each entry.activities as activity}
								<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
									{activity}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Content -->
				<div class="bg-white rounded-lg border border-gray-200">
					<div class="border-b border-gray-200 px-6 py-4">
						<h3 class="text-lg font-medium text-gray-900">Field Notes</h3>
					</div>
					<div class="p-6 prose prose-sm max-w-none">
						{@html entry.content_html}
					</div>
				</div>

				<!-- Attachments & References -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Plan References -->
					{#if entry.planReferences && entry.planReferences.length > 0}
						<div class="bg-white rounded-lg border border-gray-200 p-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
								<FileText class="w-5 h-5 mr-2" />
								Plan References
							</h3>
							<div class="space-y-3">
								{#each entry.planReferences as ref}
									<div class="flex items-center justify-between p-3 border border-gray-200 rounded-md">
										<div>
											<p class="font-medium">{ref.referenceNumber}</p>
											<p class="text-sm text-gray-600">{ref.title}</p>
										</div>
										<Link class="w-4 h-4 text-gray-400" />
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Stats -->
					<div class="bg-white rounded-lg border border-gray-200 p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
						<div class="space-y-4">
							{#if entry.calculationCount > 0}
								<div class="flex items-center justify-between">
									<div class="flex items-center">
										<Calculator class="w-5 h-5 text-green-500 mr-3" />
										<span>Calculations</span>
									</div>
									<span class="font-medium">{entry.calculationCount}</span>
								</div>
							{/if}

							{#if entry.photoCount > 0}
								<div class="flex items-center justify-between">
									<div class="flex items-center">
										<Camera class="w-5 h-5 text-purple-500 mr-3" />
										<span>Photos</span>
									</div>
									<span class="font-medium">{entry.photoCount}</span>
								</div>
							{/if}

							{#if entry.mapReferences && entry.mapReferences.length > 0}
								<div class="flex items-center justify-between">
									<div class="flex items-center">
										<MapPin class="w-5 h-5 text-blue-500 mr-3" />
										<span>Map References</span>
									</div>
									<span class="font-medium">{entry.mapReferences.length}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.prose .bearing-calculation) {
		background: #f3f4f6;
		padding: 1rem;
		border-radius: 0.5rem;
		border-left: 4px solid #3b82f6;
		margin: 1rem 0;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	:global(.prose .survey-table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	:global(.prose .survey-table th),
	:global(.prose .survey-table td) {
		border: 1px solid #d1d5db;
		padding: 0.5rem;
		text-align: left;
	}

	:global(.prose .survey-table th) {
		background: #f9fafb;
		font-weight: 600;
	}
</style>