<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { Calculator, RotateCcw, Compass } from 'lucide-svelte'

	const dispatch = createEventDispatcher()

	export let value = ''
	export let label = 'Bearing'
	export let format = 'dms' // 'dms' | 'dd' (degrees-minutes-seconds or decimal degrees)
	export let readonly = false

	let inputValue = value
	let isValid = true
	let suggestions = []
	let showCalculator = false

	// Bearing validation patterns
	const dmsPattern = /^(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"$/
	const ddPattern = /^\d{1,3}(?:\.\d+)?$/
	const quadrantPattern = /^[NS]\s*(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"\s*[EW]$/i

	$: {
		validateBearing(inputValue)
		if (isValid && inputValue !== value) {
			value = inputValue
			dispatch('change', { value: inputValue, format })
		}
	}

	function validateBearing(bearing) {
		if (!bearing.trim()) {
			isValid = true
			return
		}

		const trimmed = bearing.trim()
		
		if (format === 'dms') {
			isValid = dmsPattern.test(trimmed) || quadrantPattern.test(trimmed)
		} else if (format === 'dd') {
			const num = parseFloat(trimmed)
			isValid = ddPattern.test(trimmed) && num >= 0 && num < 360
		} else {
			// Auto-detect format
			isValid = dmsPattern.test(trimmed) || quadrantPattern.test(trimmed) || 
					 (ddPattern.test(trimmed) && parseFloat(trimmed) >= 0 && parseFloat(trimmed) < 360)
		}
	}

	function convertFormat() {
		if (!isValid || !inputValue.trim()) return

		try {
			if (format === 'dms') {
				// Convert DMS to DD
				const decimal = convertDMSToDD(inputValue)
				if (decimal !== null) {
					inputValue = decimal.toFixed(6)
					format = 'dd'
				}
			} else {
				// Convert DD to DMS
				const dms = convertDDToDMS(parseFloat(inputValue))
				if (dms) {
					inputValue = dms
					format = 'dms'
				}
			}
		} catch (error) {
			// Bearing conversion error
		}
	}

	function convertDMSToDD(dmsString) {
		const dmsMatch = dmsString.match(dmsPattern)
		if (dmsMatch) {
			const degrees = parseInt(dmsMatch[1])
			const minutes = parseInt(dmsMatch[2])
			const seconds = parseFloat(dmsMatch[3])
			return degrees + minutes/60 + seconds/3600
		}

		const quadrantMatch = dmsString.match(quadrantPattern)
		if (quadrantMatch) {
			const degrees = parseInt(quadrantMatch[1])
			const minutes = parseInt(quadrantMatch[2])
			const seconds = parseFloat(quadrantMatch[3])
			let decimal = degrees + minutes/60 + seconds/3600
			
			// Handle quadrant bearings (simplified conversion)
			const ns = dmsString.toUpperCase().includes('N') ? 1 : -1
			const ew = dmsString.toUpperCase().includes('E') ? 1 : -1
			
			// This is a simplified conversion - real implementation would be more complex
			if (ns === 1 && ew === 1) decimal = decimal // NE
			else if (ns === 1 && ew === -1) decimal = 360 - decimal // NW
			else if (ns === -1 && ew === 1) decimal = 180 - decimal // SE
			else decimal = 180 + decimal // SW
			
			return decimal % 360
		}

		return null
	}

	function convertDDToDMS(decimal) {
		if (isNaN(decimal) || decimal < 0 || decimal >= 360) return null

		const degrees = Math.floor(decimal)
		const minutesFloat = (decimal - degrees) * 60
		const minutes = Math.floor(minutesFloat)
		const seconds = (minutesFloat - minutes) * 60

		return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"`
	}

	function calculateBackBearing() {
		if (!isValid || !inputValue.trim()) return

		try {
			let decimal
			if (format === 'dms') {
				decimal = convertDMSToDD(inputValue)
			} else {
				decimal = parseFloat(inputValue)
			}

			if (decimal !== null && !isNaN(decimal)) {
				const backBearing = (decimal + 180) % 360
				
				if (format === 'dms') {
					inputValue = convertDDToDMS(backBearing) || inputValue
				} else {
					inputValue = backBearing.toFixed(6)
				}
			}
		} catch (error) {
			// Back bearing calculation error
		}
	}

	function showBearingCalculator() {
		showCalculator = true
		dispatch('openCalculator', { type: 'bearing', currentValue: inputValue })
	}

	function handleInput(event) {
		inputValue = event.target.value
		generateSuggestions(inputValue)
	}

	function generateSuggestions(partial) {
		if (!partial || partial.length < 2) {
			suggestions = []
			return
		}

		suggestions = []

		// Generate common bearing suggestions
		if (format === 'dms' || format === 'auto') {
			const patterns = [
				'000°00\'00"', '090°00\'00"', '180°00\'00"', '270°00\'00"',
				'045°00\'00"', '135°00\'00"', '225°00\'00"', '315°00\'00"'
			]
			
			suggestions = patterns.filter(pattern => 
				pattern.toLowerCase().includes(partial.toLowerCase())
			).slice(0, 5)
		}
	}

	function selectSuggestion(suggestion) {
		inputValue = suggestion
		suggestions = []
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && suggestions.length > 0) {
			event.preventDefault()
			selectSuggestion(suggestions[0])
		} else if (event.key === 'Escape') {
			suggestions = []
		}
	}
</script>

<div class="bearing-input">
	<label class="input-label">
		{label}
		{#if format !== 'auto'}
			<span class="format-indicator">({format.toUpperCase()})</span>
		{/if}
	</label>
	
	<div class="input-group">
		<div class="input-wrapper">
			<input
				type="text"
				bind:value={inputValue}
				on:input={handleInput}
				on:keydown={handleKeydown}
				class="bearing-input-field {!isValid ? 'invalid' : ''}"
				placeholder={format === 'dms' ? '000°00\'00"' : '0.000000'}
				{readonly}
			/>
			
			{#if !readonly}
				<div class="input-controls">
					<button
						type="button"
						on:click={convertFormat}
						class="control-btn"
						title="Convert format"
					>
						<RotateCcw size={14} />
					</button>
					<button
						type="button"
						on:click={calculateBackBearing}
						class="control-btn"
						title="Calculate back bearing"
					>
						<Compass size={14} />
					</button>
					<button
						type="button"
						on:click={showBearingCalculator}
						class="control-btn"
						title="Open bearing calculator"
					>
						<Calculator size={14} />
					</button>
				</div>
			{/if}
		</div>
		
		<!-- Suggestions dropdown -->
		{#if suggestions.length > 0}
			<div class="suggestions">
				{#each suggestions as suggestion}
					<button
						type="button"
						class="suggestion-item"
						on:click={() => selectSuggestion(suggestion)}
					>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Validation message -->
	{#if !isValid && inputValue.trim()}
		<div class="error-message">
			Please enter a valid bearing (e.g., {format === 'dms' ? '127°34\'15"' : '127.571'})
		</div>
	{/if}

	<!-- Quick bearing buttons -->
	{#if !readonly}
		<div class="quick-bearings">
			<span class="quick-bearings-label">Quick:</span>
			{#each ['000°00\'00"', '090°00\'00"', '180°00\'00"', '270°00\'00"'] as quickBearing, i}
				<button
					type="button"
					class="quick-bearing-btn"
					on:click={() => inputValue = quickBearing}
					title={['North', 'East', 'South', 'West'][i]}
				>
					{['N', 'E', 'S', 'W'][i]}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.bearing-input {
		position: relative;
	}

	.input-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.format-indicator {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 400;
	}

	.input-group {
		position: relative;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.bearing-input-field {
		flex: 1;
		padding: 0.5rem 0.75rem;
		padding-right: 7rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
		background: white;
		transition: border-color 0.15s ease;
	}

	.bearing-input-field:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.bearing-input-field.invalid {
		border-color: #ef4444;
		background: #fef2f2;
	}

	.bearing-input-field:read-only {
		background: #f9fafb;
		color: #6b7280;
	}

	.input-controls {
		position: absolute;
		right: 0.5rem;
		display: flex;
		gap: 0.25rem;
	}

	.control-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: none;
		background: #f3f4f6;
		color: #6b7280;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.control-btn:hover {
		background: #e5e7eb;
		color: #374151;
	}

	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 10;
		background: white;
		border: 1px solid #d1d5db;
		border-top: none;
		border-radius: 0 0 0.375rem 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		max-height: 12rem;
		overflow-y: auto;
	}

	.suggestion-item {
		width: 100%;
		padding: 0.5rem 0.75rem;
		text-align: left;
		border: none;
		background: white;
		color: #374151;
		cursor: pointer;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
	}

	.suggestion-item:hover {
		background: #f3f4f6;
	}

	.error-message {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #ef4444;
	}

	.quick-bearings {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.quick-bearings-label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.quick-bearing-btn {
		width: 2rem;
		height: 2rem;
		border: 1px solid #d1d5db;
		background: white;
		color: #374151;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quick-bearing-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}
</style>