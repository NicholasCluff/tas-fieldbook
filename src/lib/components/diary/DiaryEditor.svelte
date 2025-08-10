<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte'
	import { 
		Bold,
		Italic,
		Underline,
		List,
		ListOrdered,
		Link,
		Image,
		Calculator,
		Compass,
		MapPin,
		FileText,
		Table,
		Code,
		Undo,
		Redo
	} from 'lucide-svelte'

	export let content = ''
	export let readonly = false

	const dispatch = createEventDispatcher()

	let editorElement
	let isLoaded = false

	// Mock rich text editor functionality
	let editorContent = content
	let selectedText = ''
	let undoStack = []
	let redoStack = []

	// Toolbar state
	let isBold = false
	let isItalic = false
	let isUnderline = false

	// Handle external content changes
	$: if (content !== editorContent && !isUpdatingFromEditor) {
		editorContent = content
		if (editorElement && isLoaded) {
			editorElement.innerHTML = content
		}
	}

	let isUpdatingFromEditor = false

	function execCommand(command, value = null) {
		if (readonly) return
		
		try {
			document.execCommand(command, false, value)
			updateToolbarState()
			saveToUndoStack()
		} catch (error) {
			// Editor command failed
		}
	}

	function updateToolbarState() {
		try {
			isBold = document.queryCommandState('bold')
			isItalic = document.queryCommandState('italic')
			isUnderline = document.queryCommandState('underline')
		} catch (error) {
			// Ignore errors in readonly mode
		}
	}

	function saveToUndoStack() {
		undoStack.push(editorContent)
		if (undoStack.length > 50) {
			undoStack.shift()
		}
		redoStack = []
	}

	function undo() {
		if (undoStack.length > 0) {
			redoStack.push(editorContent)
			const newContent = undoStack.pop()
			isUpdatingFromEditor = true
			editorContent = newContent
			content = newContent
			if (editorElement) {
				editorElement.innerHTML = newContent
			}
			dispatch('change', { content: newContent })
			isUpdatingFromEditor = false
		}
	}

	function redo() {
		if (redoStack.length > 0) {
			undoStack.push(editorContent)
			const newContent = redoStack.pop()
			isUpdatingFromEditor = true
			editorContent = newContent
			content = newContent
			if (editorElement) {
				editorElement.innerHTML = newContent
			}
			dispatch('change', { content: newContent })
			isUpdatingFromEditor = false
		}
	}

	function insertBearing() {
		const bearing = prompt('Enter bearing (e.g., 127°34\'15"):', '000°00\'00"')
		if (bearing) {
			insertSpecialElement('bearing', bearing, 'Calculate bearing')
		}
	}

	function insertCalculation() {
		const calculation = prompt('Enter calculation (e.g., Distance = 48.75m):', '')
		if (calculation) {
			insertSpecialElement('calculation', calculation, 'Open calculator')
		}
	}

	function insertLocation() {
		navigator.geolocation?.getCurrentPosition(
			(position) => {
				const location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
				insertSpecialElement('location', location, 'View on map')
			},
			() => {
				const location = prompt('Enter coordinates (lat, lng):', '-42.8821, 147.3272')
				if (location) {
					insertSpecialElement('location', location, 'View on map')
				}
			}
		)
	}

	function insertPlanReference() {
		const planRef = prompt('Enter plan reference (e.g., DP-123456):', '')
		if (planRef) {
			insertSpecialElement('plan-reference', planRef, 'View plan')
		}
	}

	function insertTable() {
		const tableHTML = `
			<table class="survey-table">
				<thead>
					<tr><th>Station</th><th>Bearing</th><th>Distance</th><th>Notes</th></tr>
				</thead>
				<tbody>
					<tr><td></td><td></td><td></td><td></td></tr>
					<tr><td></td><td></td><td></td><td></td></tr>
				</tbody>
			</table>
		`
		insertHTML(tableHTML)
	}

	function insertSpecialElement(type, value, title) {
		const html = `<span class="special-element ${type}" data-type="${type}" data-value="${value}" title="${title}">${value}</span>`
		insertHTML(html)
	}

	function insertHTML(html) {
		if (readonly) return
		
		const selection = window.getSelection()
		if (selection.rangeCount > 0) {
			const range = selection.getRangeAt(0)
			range.deleteContents()
			range.insertNode(range.createContextualFragment(html))
			range.collapse(false)
			selection.removeAllRanges()
			selection.addRange(range)
		}
		updateContent()
	}

	function updateContent() {
		if (editorElement) {
			isUpdatingFromEditor = true
			const newContent = editorElement.innerHTML
			editorContent = newContent
			content = newContent
			dispatch('change', { content: newContent })
			isUpdatingFromEditor = false
		}
	}

	function handleKeydown(event) {
		if (readonly) return
		
		// Handle special key combinations
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 'b':
					event.preventDefault()
					execCommand('bold')
					break
				case 'i':
					event.preventDefault()
					execCommand('italic')
					break
				case 'u':
					event.preventDefault()
					execCommand('underline')
					break
				case 'z':
					if (event.shiftKey) {
						event.preventDefault()
						redo()
					} else {
						event.preventDefault()
						undo()
					}
					break
			}
		}
	}

	function handleInput() {
		updateContent()
		updateToolbarState()
	}

	onMount(() => {
		if (editorElement) {
			editorElement.innerHTML = editorContent
			isLoaded = true
		}
	})
</script>

<div class="diary-editor {readonly ? 'readonly' : ''}">
	<!-- Toolbar -->
	{#if !readonly}
		<div class="toolbar">
			<div class="toolbar-section">
				<button
					class="toolbar-btn {isBold ? 'active' : ''}"
					on:click={() => execCommand('bold')}
					title="Bold (Ctrl+B)"
				>
					<Bold size={16} />
				</button>
				<button
					class="toolbar-btn {isItalic ? 'active' : ''}"
					on:click={() => execCommand('italic')}
					title="Italic (Ctrl+I)"
				>
					<Italic size={16} />
				</button>
				<button
					class="toolbar-btn {isUnderline ? 'active' : ''}"
					on:click={() => execCommand('underline')}
					title="Underline (Ctrl+U)"
				>
					<Underline size={16} />
				</button>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-section">
				<button
					class="toolbar-btn"
					on:click={() => execCommand('insertUnorderedList')}
					title="Bullet List"
				>
					<List size={16} />
				</button>
				<button
					class="toolbar-btn"
					on:click={() => execCommand('insertOrderedList')}
					title="Numbered List"
				>
					<ListOrdered size={16} />
				</button>
				<button
					class="toolbar-btn"
					on:click={insertTable}
					title="Insert Table"
				>
					<Table size={16} />
				</button>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-section">
				<button
					class="toolbar-btn surveying-tool"
					on:click={insertBearing}
					title="Insert Bearing"
				>
					<Compass size={16} />
				</button>
				<button
					class="toolbar-btn surveying-tool"
					on:click={insertCalculation}
					title="Insert Calculation"
				>
					<Calculator size={16} />
				</button>
				<button
					class="toolbar-btn surveying-tool"
					on:click={insertLocation}
					title="Insert Location"
				>
					<MapPin size={16} />
				</button>
				<button
					class="toolbar-btn surveying-tool"
					on:click={insertPlanReference}
					title="Insert Plan Reference"
				>
					<FileText size={16} />
				</button>
			</div>

			<div class="toolbar-separator"></div>

			<div class="toolbar-section">
				<button
					class="toolbar-btn"
					on:click={undo}
					disabled={undoStack.length === 0}
					title="Undo (Ctrl+Z)"
				>
					<Undo size={16} />
				</button>
				<button
					class="toolbar-btn"
					on:click={redo}
					disabled={redoStack.length === 0}
					title="Redo (Ctrl+Shift+Z)"
				>
					<Redo size={16} />
				</button>
			</div>
		</div>
	{/if}

	<!-- Editor Content -->
	<div
		bind:this={editorElement}
		class="editor-content"
		contenteditable={!readonly}
		on:input={handleInput}
		on:keydown={handleKeydown}
		on:blur={updateContent}
		role="textbox"
		aria-label="Diary entry content"
	>
		{#if !isLoaded && content}
			{@html content}
		{/if}
	</div>
</div>

<style>
	.diary-editor {
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		background: white;
		overflow: hidden;
	}

	.toolbar {
		display: flex;
		align-items: center;
		padding: 0.75rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		gap: 0.5rem;
	}

	.toolbar-section {
		display: flex;
		gap: 0.25rem;
	}

	.toolbar-separator {
		width: 1px;
		height: 1.5rem;
		background: #d1d5db;
	}

	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: none;
		background: transparent;
		color: #6b7280;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toolbar-btn:hover {
		background: #e5e7eb;
		color: #374151;
	}

	.toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toolbar-btn.active {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.toolbar-btn.surveying-tool {
		color: #059669;
	}

	.toolbar-btn.surveying-tool:hover {
		background: #d1fae5;
		color: #047857;
	}

	.editor-content {
		min-height: 300px;
		padding: 1.5rem;
		line-height: 1.6;
		font-size: 0.875rem;
		color: #374151;
		outline: none;
	}

	.readonly .editor-content {
		background: #f9fafb;
		cursor: default;
	}

	/* Special elements styling */
	:global(.special-element) {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		margin: 0 0.125rem;
		border-radius: 0.25rem;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.8em;
		cursor: pointer;
		text-decoration: none;
	}

	:global(.special-element.bearing) {
		background: #dbeafe;
		color: #1e40af;
		border: 1px solid #93c5fd;
	}

	:global(.special-element.calculation) {
		background: #d1fae5;
		color: #047857;
		border: 1px solid #6ee7b7;
	}

	:global(.special-element.location) {
		background: #fef3c7;
		color: #92400e;
		border: 1px solid #fcd34d;
	}

	:global(.special-element.plan-reference) {
		background: #ede9fe;
		color: #6b46c1;
		border: 1px solid #c4b5fd;
	}

	/* Table styling */
	:global(.editor-content .survey-table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.875rem;
	}

	:global(.editor-content .survey-table th),
	:global(.editor-content .survey-table td) {
		border: 1px solid #d1d5db;
		padding: 0.5rem;
		text-align: left;
	}

	:global(.editor-content .survey-table th) {
		background: #f9fafb;
		font-weight: 600;
		color: #374151;
	}

	:global(.editor-content .survey-table td) {
		background: white;
	}

	/* Typography */
	:global(.editor-content h1) {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 1.5rem 0 1rem 0;
		color: #111827;
	}

	:global(.editor-content h2) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.25rem 0 0.75rem 0;
		color: #1f2937;
	}

	:global(.editor-content h3) {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem 0;
		color: #374151;
	}

	:global(.editor-content h4) {
		font-size: 1rem;
		font-weight: 600;
		margin: 0.75rem 0 0.5rem 0;
		color: #4b5563;
	}

	:global(.editor-content p) {
		margin: 0.75rem 0;
	}

	:global(.editor-content ul),
	:global(.editor-content ol) {
		margin: 0.75rem 0;
		padding-left: 1.5rem;
	}

	:global(.editor-content li) {
		margin: 0.25rem 0;
	}

	:global(.editor-content strong) {
		font-weight: 600;
		color: #111827;
	}

	:global(.editor-content em) {
		font-style: italic;
	}

	:global(.editor-content code) {
		background: #f3f4f6;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.875em;
	}
</style>