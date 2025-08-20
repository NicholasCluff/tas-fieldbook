<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { authStore } from '$lib/stores/auth.js'
	import { projectsStore } from '$lib/stores/projects.js'
	import { 
		Calendar,
		Clock,
		MapPin,
		Thermometer,
		Calculator,
		Camera,
		FileText,
		Edit3,
		Plus,
		TrendingUp
	} from 'lucide-svelte'
	import ProjectHeader from '$lib/components/projects/ProjectHeader.svelte'

	const projectId = $page.params.id

	$: project = $projectsStore.currentProject
	$: canEdit = project?.owner_id === $authStore.profile?.id || project?.supervisor_id === $authStore.profile?.id

	// Mock recent entries data
	let recentEntries = [
		{
			id: '1',
			title: 'Site Setup and Initial Survey',
			entry_date: '2025-01-18',
			weather: 'Partly cloudy, light breeze',
			temperature: 22.5,
			location_lat: -42.8821,
			location_lng: 147.3272,
			description: 'Established control point Alpha at the northeast corner of the property. GPS coordinates recorded with 2cm accuracy. Initial traverse commenced from boundary post #1.',
			activities: ['Control point establishment', 'GPS survey', 'Boundary identification'],
			calculationCount: 3,
			photoCount: 8,
			created_at: '2025-01-18T09:30:00Z',
			updated_at: '2025-01-18T16:45:00Z'
		},
		{
			id: '2',
			title: 'Boundary Survey - Eastern Section', 
			entry_date: '2025-01-17',
			weather: 'Clear and sunny',
			temperature: 18.0,
			location_lat: -42.8825,
			location_lng: 147.3275,
			description: 'Completed detailed survey of eastern boundary. Found original iron pipes at corners, some requiring cleaning and re-marking.',
			activities: ['Boundary survey', 'Monument location', 'Measurement verification'],
			calculationCount: 0,
			photoCount: 12,
			created_at: '2025-01-17T08:15:00Z',
			updated_at: '2025-01-17T15:20:00Z'
		},
		{
			id: '3',
			title: 'Control Point Establishment',
			entry_date: '2025-01-16', 
			weather: 'Overcast with light rain',
			temperature: 15.5,
			location_lat: -42.8819,
			location_lng: 147.3270,
			description: 'Set up base station and established secondary control points using total station. Weather conditions challenging but manageable.',
			activities: ['Control network', 'Total station setup', 'Coordinate establishment'],
			calculationCount: 7,
			photoCount: 4,
			created_at: '2025-01-16T10:00:00Z',
			updated_at: '2025-01-16T14:30:00Z'
		}
	]

	// Stats calculation
	$: totalEntries = recentEntries.length
	$: totalCalculations = recentEntries.reduce((sum, entry) => sum + entry.calculationCount, 0)
	$: totalPhotos = recentEntries.reduce((sum, entry) => sum + entry.photoCount, 0)
	$: daysActive = new Set(recentEntries.map(e => e.entry_date)).size

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-AU', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		})
	}

	function formatTime(timestampStr: string) {
		return new Date(timestampStr).toLocaleTimeString('en-AU', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	function getWeatherIcon(weather: string) {
		if (weather.toLowerCase().includes('rain')) return '🌧️'
		if (weather.toLowerCase().includes('cloud')) return '⛅'
		if (weather.toLowerCase().includes('clear') || weather.toLowerCase().includes('sunny')) return '☀️'
		return '🌤️'
	}
</script>

<svelte:head>
	<title>Diary Overview - {project?.title || 'Project'} - TasFieldbook</title>
</svelte:head>

<ProjectHeader 
	{project} 
	title="Field Diary" 
	subtitle="Daily field activities and observations" 
/>

<div class="flex-1 overflow-y-auto">
	<div class="p-6 space-y-6">
		<!-- Actions -->
		{#if canEdit}
			<div class="flex justify-end">
				<a
					href="/projects/{projectId}/diary/new"
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					<Plus size={16} class="mr-2" />
					New Entry
				</a>
			</div>
		{/if}
		<!-- Stats Overview -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-white p-4 rounded-lg border border-gray-200">
				<div class="flex items-center">
					<FileText class="w-8 h-8 text-blue-500" />
					<div class="ml-3">
						<p class="text-sm text-gray-500">Total Entries</p>
						<p class="text-2xl font-semibold text-gray-900">{totalEntries}</p>
					</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-lg border border-gray-200">
				<div class="flex items-center">
					<Calculator class="w-8 h-8 text-green-500" />
					<div class="ml-3">
						<p class="text-sm text-gray-500">Calculations</p>
						<p class="text-2xl font-semibold text-gray-900">{totalCalculations}</p>
					</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-lg border border-gray-200">
				<div class="flex items-center">
					<Camera class="w-8 h-8 text-purple-500" />
					<div class="ml-3">
						<p class="text-sm text-gray-500">Photos</p>
						<p class="text-2xl font-semibold text-gray-900">{totalPhotos}</p>
					</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-lg border border-gray-200">
				<div class="flex items-center">
					<TrendingUp class="w-8 h-8 text-orange-500" />
					<div class="ml-3">
						<p class="text-sm text-gray-500">Active Days</p>
						<p class="text-2xl font-semibold text-gray-900">{daysActive}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Recent Entries -->
		<div class="bg-white rounded-lg border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Recent Entries</h2>
			</div>

			<div class="divide-y divide-gray-200">
				{#each recentEntries as entry}
					<div class="p-6 hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<!-- Entry Header -->
								<div class="flex items-center space-x-4 mb-3">
									<h3 class="text-lg font-medium text-gray-900">{entry.title}</h3>
									<div class="flex items-center space-x-4 text-sm text-gray-500">
										<div class="flex items-center">
											<Calendar size={14} class="mr-1" />
											{formatDate(entry.entry_date)}
										</div>
										<div class="flex items-center">
											<Clock size={14} class="mr-1" />
											{formatTime(entry.created_at)} - {formatTime(entry.updated_at)}
										</div>
									</div>
								</div>

								<!-- Weather and Location -->
								<div class="flex items-center space-x-6 mb-3 text-sm text-gray-600">
									{#if entry.weather}
										<div class="flex items-center">
											<span class="mr-2">{getWeatherIcon(entry.weather)}</span>
											{entry.weather}
										</div>
									{/if}
									{#if entry.temperature}
										<div class="flex items-center">
											<Thermometer size={14} class="mr-1" />
											{entry.temperature}°C
										</div>
									{/if}
									{#if entry.location_lat && entry.location_lng}
										<div class="flex items-center">
											<MapPin size={14} class="mr-1" />
											{entry.location_lat.toFixed(4)}, {entry.location_lng.toFixed(4)}
										</div>
									{/if}
								</div>

								<!-- Description -->
								<p class="text-gray-700 mb-3 line-clamp-2">{entry.description}</p>

								<!-- Activities -->
								{#if entry.activities && entry.activities.length > 0}
									<div class="flex flex-wrap gap-2 mb-3">
										{#each entry.activities as activity}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{activity}
											</span>
										{/each}
									</div>
								{/if}

								<!-- Attachments -->
								<div class="flex items-center space-x-4 text-sm text-gray-500">
									{#if entry.calculationCount > 0}
										<div class="flex items-center">
											<Calculator size={14} class="mr-1 text-green-500" />
											{entry.calculationCount} calculation{entry.calculationCount !== 1 ? 's' : ''}
										</div>
									{/if}
									{#if entry.photoCount > 0}
										<div class="flex items-center">
											<Camera size={14} class="mr-1 text-purple-500" />
											{entry.photoCount} photo{entry.photoCount !== 1 ? 's' : ''}
										</div>
									{/if}
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center space-x-2 ml-4">
								<a
									href="/projects/{projectId}/diary/{entry.id}"
									class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm"
								>
									<FileText size={14} class="mr-1" />
									View
								</a>
								{#if canEdit}
									<a
										href="/projects/{projectId}/diary/{entry.id}/edit"
										class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm"
									>
										<Edit3 size={14} class="mr-1" />
										Edit
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Empty State (when no entries) -->
		{#if recentEntries.length === 0}
			<div class="bg-white rounded-lg border border-gray-200 p-12 text-center">
				<FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">No diary entries yet</h3>
				<p class="text-gray-600 mb-6">Start documenting your field work by creating your first diary entry.</p>
				{#if canEdit}
					<a
						href="/projects/{projectId}/diary/new"
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						<Plus size={16} class="mr-2" />
						Create First Entry
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>