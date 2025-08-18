<script lang="ts">
  import { 
    MousePointer2, 
    Hand, 
    ZoomIn,
    Edit3,
    Type,
    Highlighter,
    Square,
    Circle,
    ArrowUpRight,
    Minus,
    Ruler,
    Stamp,
    PenTool,
    Palette,
    Settings,
    ChevronLeft,
    ChevronRight,
    ZoomOut,
    RotateCcw,
    Move,
    Layers,
    MessageSquare,
    Download,
    Upload,
    Save,
    Undo,
    Redo
  } from 'lucide-svelte'
  
  import type { 
    DrawingState, 
    ToolbarState, 
    PdfViewerConfig, 
    AnnotationType 
  } from '$lib/types/pdf-annotations.js'

  interface Props {
    drawingState: DrawingState
    toolbarState: ToolbarState
    viewerConfig: PdfViewerConfig
    currentPage: number
    totalPages: number
    onPreviousPage: () => void
    onNextPage: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onResetZoom: () => void
    onFitToWidth: () => void
    onToolSelect: (tool: AnnotationType | 'select' | 'pan' | 'zoom') => void
  }

  let {
    drawingState = $bindable(),
    toolbarState = $bindable(),
    viewerConfig,
    currentPage,
    totalPages,
    onPreviousPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToWidth,
    onToolSelect
  }: Props = $props()

  // Tool configurations
  const toolConfigs = {
    select: { icon: MousePointer2, label: 'Select', shortcut: 'V' },
    pan: { icon: Hand, label: 'Pan', shortcut: 'H' },
    zoom: { icon: ZoomIn, label: 'Zoom', shortcut: 'Z' },
    freehand: { icon: Edit3, label: 'Freehand', shortcut: 'F' },
    text: { icon: Type, label: 'Text', shortcut: 'T' },
    highlight: { icon: Highlighter, label: 'Highlight', shortcut: 'H' },
    rectangle: { icon: Square, label: 'Rectangle', shortcut: 'R' },
    circle: { icon: Circle, label: 'Circle', shortcut: 'C' },
    arrow: { icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
    line: { icon: Minus, label: 'Line', shortcut: 'L' },
    measurement: { icon: Ruler, label: 'Measure', shortcut: 'M' },
    stamp: { icon: Stamp, label: 'Stamp', shortcut: 'S' },
    signature: { icon: PenTool, label: 'Signature', shortcut: 'G' }
  }

  // Color presets
  const colorPresets = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#6B7280', '#000000', '#FFFFFF', '#FDE047'
  ]

  let showColorPicker = $state(false)
  let showStrokeOptions = $state(false)

  function selectTool(tool: AnnotationType | 'select' | 'pan' | 'zoom') {
    onToolSelect(tool)
    // Close any open panels when switching tools
    showColorPicker = false
    showStrokeOptions = false
  }

  function selectColor(color: string) {
    if (drawingState.currentProperties) {
      drawingState.currentProperties.strokeColor = color
      drawingState.currentProperties.fillColor = color
    }
    
    // Add to recent colors if not already there
    if (!toolbarState.recentColors.includes(color)) {
      toolbarState.recentColors = [color, ...toolbarState.recentColors.slice(0, 7)]
    }
    
    showColorPicker = false
  }

  function setStrokeWidth(width: number) {
    if (drawingState.currentProperties) {
      drawingState.currentProperties.strokeWidth = width
    }
    
    // Add to recent stroke widths
    if (!toolbarState.recentStrokeWidths.includes(width)) {
      toolbarState.recentStrokeWidths = [width, ...toolbarState.recentStrokeWidths.slice(0, 3)]
    }
    
    showStrokeOptions = false
  }

  function togglePanel(panel: 'tools' | 'properties' | 'annotations' | 'layers' | null) {
    toolbarState.activePanel = toolbarState.activePanel === panel ? null : panel
  }

  function formatZoom(zoom: number): string {
    return `${Math.round(zoom * 100)}%`
  }

  function getToolIcon(tool: string) {
    return toolConfigs[tool as keyof typeof toolConfigs]?.icon || MousePointer2
  }

  function getToolLabel(tool: string) {
    return toolConfigs[tool as keyof typeof toolConfigs]?.label || 'Unknown'
  }
</script>

<div class="toolbar border-b border-gray-300 bg-white">
  <!-- Main Toolbar -->
  <div class="flex items-center justify-between p-2">
    <!-- Tool Selection -->
    <div class="flex items-center space-x-1">
      <!-- Selection Tools -->
      <div class="flex items-center bg-gray-100 rounded-lg p-1">
        {#each toolbarState.selectionTools as tool}
          <button
            class="p-2 rounded hover:bg-white transition-colors {drawingState.activeTool === tool ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}"
            on:click={() => selectTool(tool)}
            title="{getToolLabel(tool)} ({toolConfigs[tool as keyof typeof toolConfigs]?.shortcut})"
          >
            <svelte:component this={getToolIcon(tool)} class="w-4 h-4" />
          </button>
        {/each}
      </div>

      <div class="w-px h-6 bg-gray-300 mx-1"></div>

      <!-- Drawing Tools -->
      <div class="flex items-center space-x-1">
        {#each toolbarState.drawingTools as tool}
          {#if viewerConfig.allowedTools.includes(tool)}
            <button
              class="p-2 rounded hover:bg-gray-100 transition-colors {drawingState.activeTool === tool ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}"
              on:click={() => selectTool(tool)}
              title="{getToolLabel(tool)} ({toolConfigs[tool as keyof typeof toolConfigs]?.shortcut})"
            >
              <svelte:component this={getToolIcon(tool)} class="w-4 h-4" />
            </button>
          {/if}
        {/each}
      </div>

      <div class="w-px h-6 bg-gray-300 mx-2"></div>

      <!-- Style Controls -->
      <div class="flex items-center space-x-2">
        <!-- Color Picker -->
        <div class="relative">
          <button
            class="flex items-center space-x-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            on:click={() => showColorPicker = !showColorPicker}
          >
            <div 
              class="w-4 h-4 rounded border border-gray-400"
              style="background-color: {drawingState.currentProperties?.strokeColor || '#3B82F6'}"
            ></div>
            <Palette class="w-3 h-3 text-gray-500" />
          </button>

          {#if showColorPicker}
            <div class="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3">
              <div class="mb-2">
                <div class="text-xs text-gray-500 mb-1">Recent Colors</div>
                <div class="flex space-x-1">
                  {#each toolbarState.recentColors as color}
                    <button
                      class="w-6 h-6 rounded border-2 hover:scale-110 transition-transform {color === drawingState.currentProperties?.strokeColor ? 'border-gray-800' : 'border-gray-300'}"
                      style="background-color: {color}"
                      on:click={() => selectColor(color)}
                    ></button>
                  {/each}
                </div>
              </div>
              
              <div>
                <div class="text-xs text-gray-500 mb-1">Color Palette</div>
                <div class="grid grid-cols-6 gap-1">
                  {#each colorPresets as color}
                    <button
                      class="w-6 h-6 rounded border-2 hover:scale-110 transition-transform {color === drawingState.currentProperties?.strokeColor ? 'border-gray-800' : 'border-gray-300'}"
                      style="background-color: {color}"
                      on:click={() => selectColor(color)}
                    ></button>
                  {/each}
                </div>
              </div>
              
              <div class="mt-2 pt-2 border-t border-gray-200">
                <input
                  type="color"
                  bind:value={drawingState.currentProperties.strokeColor}
                  class="w-full h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Stroke Width -->
        <div class="relative">
          <button
            class="flex items-center space-x-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            on:click={() => showStrokeOptions = !showStrokeOptions}
          >
            <div class="text-xs text-gray-600">{drawingState.currentProperties?.strokeWidth || 2}px</div>
            <Settings class="w-3 h-3 text-gray-500" />
          </button>

          {#if showStrokeOptions}
            <div class="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3">
              <div class="mb-2">
                <div class="text-xs text-gray-500 mb-2">Stroke Width</div>
                <div class="flex space-x-2">
                  {#each [1, 2, 3, 5, 8, 12] as width}
                    <button
                      class="flex items-center justify-center w-8 h-8 border-2 rounded hover:bg-gray-50 {width === drawingState.currentProperties?.strokeWidth ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
                      on:click={() => setStrokeWidth(width)}
                    >
                      <div 
                        class="bg-gray-800 rounded-full"
                        style="width: {Math.min(width, 6)}px; height: {Math.min(width, 6)}px;"
                      ></div>
                    </button>
                  {/each}
                </div>
              </div>
              
              <div>
                <div class="text-xs text-gray-500 mb-1">Custom Width</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  bind:value={drawingState.currentProperties.strokeWidth}
                  class="w-full"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- Opacity -->
        {#if drawingState.activeTool === 'highlight' || drawingState.activeTool === 'rectangle' || drawingState.activeTool === 'circle'}
          <div class="flex items-center space-x-1">
            <span class="text-xs text-gray-500">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              bind:value={drawingState.currentProperties.fillOpacity}
              class="w-16"
            />
            <span class="text-xs text-gray-600 w-8">
              {Math.round((drawingState.currentProperties?.fillOpacity || 0.3) * 100)}%
            </span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Navigation and View Controls -->
    <div class="flex items-center space-x-4">
      <!-- Page Navigation -->
      <div class="flex items-center space-x-2">
        <button
          class="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          on:click={onPreviousPage}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        
        <div class="flex items-center space-x-1">
          <input
            type="number"
            min="1"
            max={totalPages}
            bind:value={currentPage}
            class="w-12 px-1 py-0.5 text-center text-sm border border-gray-300 rounded"
          />
          <span class="text-sm text-gray-500">/ {totalPages}</span>
        </div>
        
        <button
          class="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          on:click={onNextPage}
          disabled={currentPage >= totalPages}
          title="Next page"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <div class="w-px h-6 bg-gray-300"></div>

      <!-- Zoom Controls -->
      <div class="flex items-center space-x-2">
        <button
          class="p-1 rounded hover:bg-gray-100"
          on:click={onZoomOut}
          title="Zoom out"
        >
          <ZoomOut class="w-4 h-4" />
        </button>
        
        <button
          class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 min-w-[50px]"
          on:click={onResetZoom}
          title="Reset zoom"
        >
          {formatZoom(drawingState.zoom)}
        </button>
        
        <button
          class="p-1 rounded hover:bg-gray-100"
          on:click={onZoomIn}
          title="Zoom in"
        >
          <ZoomIn class="w-4 h-4" />
        </button>
        
        <button
          class="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          on:click={onFitToWidth}
          title="Fit to width"
        >
          Fit
        </button>
      </div>

      <div class="w-px h-6 bg-gray-300"></div>

      <!-- Panel Toggles -->
      <div class="flex items-center space-x-1">
        {#if viewerConfig.enableLayers}
          <button
            class="p-1 rounded hover:bg-gray-100 {toolbarState.activePanel === 'layers' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}"
            on:click={() => togglePanel('layers')}
            title="Layers"
          >
            <Layers class="w-4 h-4" />
          </button>
        {/if}

        {#if viewerConfig.enableComments}
          <button
            class="p-1 rounded hover:bg-gray-100 {toolbarState.activePanel === 'annotations' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}"
            on:click={() => togglePanel('annotations')}
            title="Annotations"
          >
            <MessageSquare class="w-4 h-4" />
          </button>
        {/if}

        <button
          class="p-1 rounded hover:bg-gray-100"
          on:click={() => toolbarState.showThumbnails = !toolbarState.showThumbnails}
          title="Toggle thumbnails"
        >
          <Move class="w-4 h-4" />
        </button>
      </div>

      <div class="w-px h-6 bg-gray-300"></div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1">
        <!-- Undo/Redo -->
        <button
          class="p-1 rounded hover:bg-gray-100 text-gray-400"
          disabled
          title="Undo (Coming soon)"
        >
          <Undo class="w-4 h-4" />
        </button>
        
        <button
          class="p-1 rounded hover:bg-gray-100 text-gray-400"
          disabled
          title="Redo (Coming soon)"
        >
          <Redo class="w-4 h-4" />
        </button>

        <div class="w-px h-4 bg-gray-300 mx-1"></div>

        <!-- Export/Import -->
        {#if viewerConfig.enableExport}
          <button
            class="p-1 rounded hover:bg-gray-100"
            title="Export annotations"
          >
            <Download class="w-4 h-4" />
          </button>
          
          <button
            class="p-1 rounded hover:bg-gray-100"
            title="Import annotations"
          >
            <Upload class="w-4 h-4" />
          </button>
        {/if}

        <button
          class="p-1 rounded hover:bg-gray-100"
          title="Save annotations"
        >
          <Save class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Extended Properties Panel -->
  {#if toolbarState.activePanel === 'properties'}
    <div class="border-t border-gray-200 bg-gray-50 p-3">
      <div class="text-sm font-medium text-gray-700 mb-2">Tool Properties</div>
      
      {#if drawingState.activeTool === 'text'}
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label for="font-size-select" class="block text-xs text-gray-500 mb-1">Font Size</label>
            <select id="font-size-select" bind:value={drawingState.currentProperties.fontSize} class="w-full text-sm border border-gray-300 rounded px-2 py-1">
              <option value="8">8px</option>
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="24">24px</option>
              <option value="32">32px</option>
            </select>
          </div>
          
          <div>
            <label for="font-family-select" class="block text-xs text-gray-500 mb-1">Font Family</label>
            <select id="font-family-select" bind:value={drawingState.currentProperties.fontFamily} class="w-full text-sm border border-gray-300 rounded px-2 py-1">
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
            </select>
          </div>
          
          <div>
            <label class="block text-xs text-gray-500 mb-1">Style</label>
            <div class="flex space-x-1">
              <button 
                class="px-2 py-1 text-sm border rounded {drawingState.currentProperties.fontWeight === 'bold' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}"
                on:click={() => drawingState.currentProperties.fontWeight = drawingState.currentProperties.fontWeight === 'bold' ? 'normal' : 'bold'}
              >
                B
              </button>
              <button 
                class="px-2 py-1 text-sm border rounded italic {drawingState.currentProperties.fontStyle === 'italic' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}"
                on:click={() => drawingState.currentProperties.fontStyle = drawingState.currentProperties.fontStyle === 'italic' ? 'normal' : 'italic'}
              >
                I
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if drawingState.activeTool === 'measurement'}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="measurement-unit-select" class="block text-xs text-gray-500 mb-1">Unit</label>
            <select id="measurement-unit-select" bind:value={drawingState.currentProperties.measurementUnit} class="w-full text-sm border border-gray-300 rounded px-2 py-1">
              <option value="mm">Millimeters (mm)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="m">Meters (m)</option>
              <option value="km">Kilometers (km)</option>
              <option value="in">Inches (in)</option>
              <option value="ft">Feet (ft)</option>
            </select>
          </div>
          
          <div>
            <label for="measurement-type-select" class="block text-xs text-gray-500 mb-1">Type</label>
            <select id="measurement-type-select" bind:value={drawingState.currentProperties.measurementType} class="w-full text-sm border border-gray-300 rounded px-2 py-1">
              <option value="distance">Distance</option>
              <option value="area">Area</option>
              <option value="angle">Angle</option>
            </select>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .toolbar {
    user-select: none;
  }
  
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    outline: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
</style>