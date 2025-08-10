<script lang="ts">
	import { 
		Info,
		ChevronDown,
		ChevronUp,
		X,
		Download
	} from 'lucide-svelte'
	
	let isExpanded = false
	let showLegend = true
	
	// Mock legend data - in real implementation, this would come from active WMS layers
	let legendItems = [
		{
			category: 'Cadastral',
			items: [
				{ label: 'Property Boundaries', color: '#FF0000', strokeWidth: 2, pattern: 'solid' },
				{ label: 'Road Reserves', color: '#808080', strokeWidth: 1, pattern: 'dashed' },
				{ label: 'Crown Land', color: '#90EE90', fillColor: '#90EE90', opacity: 0.3 }
			]
		},
		{
			category: 'Geological',
			items: [
				{ label: 'Sedimentary Rock', color: '#D2691E', fillColor: '#D2691E', opacity: 0.5 },
				{ label: 'Igneous Rock', color: '#8B0000', fillColor: '#8B0000', opacity: 0.5 },
				{ label: 'Metamorphic Rock', color: '#4B0082', fillColor: '#4B0082', opacity: 0.5 }
			]
		},
		{
			category: 'Annotations',
			items: [
				{ label: 'Survey Points', color: '#3B82F6', symbol: 'circle' },
				{ label: 'Boundaries', color: '#EF4444', strokeWidth: 3, pattern: 'solid' },
				{ label: 'Areas of Interest', color: '#10B981', fillColor: '#10B981', opacity: 0.3 }
			]
		}
	]
	
	function toggleLegend() {
		isExpanded = !isExpanded
	}
	
	function closeLegend() {
		showLegend = false
	}
	
	function exportLegend() {
		// Create a simple legend export
		const legendData = {
			title: 'Map Legend',
			timestamp: new Date().toISOString(),
			items: legendItems
		}
		
		const blob = new Blob([JSON.stringify(legendData, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'map-legend.json'
		a.click()
		URL.revokeObjectURL(url)
	}
	
	function renderSymbol(item: any) {
		if (item.symbol === 'circle') {
			return `
				<svg width="16" height="16" viewBox="0 0 16 16">
					<circle cx="8" cy="8" r="6" fill="${item.color}" stroke="${item.color}" stroke-width="2"/>
				</svg>
			`
		} else if (item.fillColor) {
			return `
				<svg width="16" height="16" viewBox="0 0 16 16">
					<rect x="2" y="4" width="12" height="8" fill="${item.fillColor}" stroke="${item.color || item.fillColor}" stroke-width="1" opacity="${item.opacity || 1}"/>
				</svg>
			`
		} else {
			const strokeDasharray = item.pattern === 'dashed' ? '4,2' : 'none'
			return `
				<svg width="16" height="16" viewBox="0 0 16 16">
					<line x1="2" y1="8" x2="14" y2="8" stroke="${item.color}" stroke-width="${item.strokeWidth || 2}" stroke-dasharray="${strokeDasharray}"/>
				</svg>
			`
		}
	}
</script>

{#if showLegend}
	<div class="bg-white border border-gray-300 rounded-lg shadow-lg max-w-xs">
		<!-- Header -->
		<div class="flex items-center justify-between p-3 border-b border-gray-200">
			<div class="flex items-center space-x-2">
				<Info class="w-4 h-4 text-gray-500" />
				<h3 class="text-sm font-medium text-gray-900">Legend</h3>
			</div>
			
			<div class="flex items-center space-x-1">
				<button
					on:click={exportLegend}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					title="Export Legend"
				>
					<Download class="w-3 h-3" />
				</button>
				
				<button
					on:click={toggleLegend}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					title={isExpanded ? 'Collapse' : 'Expand'}
				>
					{#if isExpanded}
						<ChevronUp class="w-4 h-4" />
					{:else}
						<ChevronDown class="w-4 h-4" />
					{/if}
				</button>
				
				<button
					on:click={closeLegend}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
					title="Close Legend"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>
		
		<!-- Content -->
		{#if isExpanded}
			<div class="max-h-96 overflow-y-auto">
				{#each legendItems as category}
					<div class="border-b border-gray-100 last:border-b-0">
						<div class="px-3 py-2 bg-gray-50">
							<h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide">
								{category.category}
							</h4>
						</div>
						
						<div class="px-3 py-2 space-y-2">
							{#each category.items as item}
								<div class="flex items-center space-x-2">
									<div class="flex-shrink-0">
										{@html renderSymbol(item)}
									</div>
									<span class="text-xs text-gray-700">{item.label}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Minimized view -->
			<div class="px-3 py-2">
				<p class="text-xs text-gray-500">
					{legendItems.reduce((acc, cat) => acc + cat.items.length, 0)} legend items
				</p>
			</div>
		{/if}
	</div>
{/if}