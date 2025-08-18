<script lang="ts">
  import type { ExtractedPlan, PDFMetadata } from '$lib/types/pdf'

  interface Props {
    open: boolean
    fileName: string
    metadata: PDFMetadata
    detectedPlans: ExtractedPlan[]
    analysisProgress: {
      stage: string
      progress: number
      message: string
    } | null
    onproceed?: (event: { plans: ExtractedPlan[] }) => void
    oncancel?: () => void
    onretry?: () => void
    onplanschange?: (plans: ExtractedPlan[]) => void
  }

  let { 
    open,
    fileName,
    metadata,
    detectedPlans,
    analysisProgress,
    onproceed,
    oncancel,
    onretry,
    onplanschange
  }: Props = $props()

  let editingPlans = $state<ExtractedPlan[]>([])
  let selectedPlan = $state<number | null>(null)
  let showAdvancedOptions = $state(false)

  // Initialize editing plans when detected plans change
  $effect(() => {
    if (detectedPlans && detectedPlans.length > 0) {
      editingPlans = [...detectedPlans]
    }
  })

  function addNewPlan() {
    const newPlan: ExtractedPlan = {
      referenceNumber: `Plan ${editingPlans.length + 1}`,
      title: `Plan ${editingPlans.length + 1}`,
      startPage: editingPlans.length > 0 ? editingPlans[editingPlans.length - 1].endPage + 1 : 1,
      endPage: metadata.pageCount,
      pageCount: metadata.pageCount - (editingPlans.length > 0 ? editingPlans[editingPlans.length - 1].endPage : 0)
    }
    editingPlans = [...editingPlans, newPlan]
    selectedPlan = editingPlans.length - 1
    onplanschange?.(editingPlans)
  }

  function removePlan(index: number) {
    editingPlans = editingPlans.filter((_, i) => i !== index)
    if (selectedPlan === index) {
      selectedPlan = null
    } else if (selectedPlan && selectedPlan > index) {
      selectedPlan = selectedPlan - 1
    }
    onplanschange?.(editingPlans)
  }

  function updatePlan(index: number, field: keyof ExtractedPlan, value: string | number) {
    editingPlans[index] = { ...editingPlans[index], [field]: value }
    
    // Update pageCount when start/end pages change
    if (field === 'startPage' || field === 'endPage') {
      const plan = editingPlans[index]
      plan.pageCount = Math.max(0, plan.endPage - plan.startPage + 1)
    }
    
    editingPlans = [...editingPlans]
    onplanschange?.(editingPlans)
  }

  function handleProceed() {
    onproceed?.({ plans: editingPlans })
  }

  function handleCancel() {
    oncancel?.()
  }

  function handleRetry() {
    onretry?.()
  }

  // Check if analysis is still in progress
  let isAnalyzing = $derived(analysisProgress && analysisProgress.stage !== 'complete')
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b bg-gray-50">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Document Analysis</h2>
            <p class="text-sm text-gray-600 mt-1">{fileName}</p>
          </div>
          <button 
            onclick={handleCancel}
            class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-hidden flex">
        <!-- Left Panel - Document Info & Controls -->
        <div class="w-1/3 border-r overflow-y-auto">
          <!-- Analysis Progress -->
          {#if isAnalyzing}
            <div class="p-6 border-b bg-blue-50">
              <h3 class="font-medium text-blue-900 mb-3">Analyzing Document...</h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-blue-700">{analysisProgress?.message}</span>
                  <span class="text-blue-600 font-medium">{analysisProgress?.progress}%</span>
                </div>
                <div class="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style="width: {analysisProgress?.progress || 0}%"
                  ></div>
                </div>
                
                <!-- Stage indicators -->
                <div class="flex justify-between text-xs text-blue-600 mt-2">
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 rounded-full {analysisProgress?.stage === 'analyzing' ? 'bg-blue-600' : 'bg-blue-300'}"></div>
                    <span>Analyzing</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 rounded-full {analysisProgress?.stage === 'extracting' ? 'bg-blue-600' : 'bg-blue-300'}"></div>
                    <span>Extracting</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 rounded-full {analysisProgress?.stage === 'complete' ? 'bg-green-600' : 'bg-blue-300'}"></div>
                    <span>Complete</span>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Document Metadata -->
          <div class="p-6 border-b">
            <h3 class="font-medium text-gray-900 mb-3">Document Information</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Pages:</span>
                <span class="font-medium">{metadata.pageCount}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Size:</span>
                <span class="font-medium">{(metadata.fileSize / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              {#if metadata.title}
                <div>
                  <span class="text-gray-600 block">Title:</span>
                  <span class="text-sm font-medium break-words">{metadata.title}</span>
                </div>
              {/if}
              {#if metadata.author}
                <div class="flex justify-between">
                  <span class="text-gray-600">Author:</span>
                  <span class="font-medium">{metadata.author}</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Plan Controls -->
          {#if !isAnalyzing}
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-medium text-gray-900">Detected Plans ({editingPlans.length})</h3>
                <button 
                  onclick={addNewPlan}
                  class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Add Plan
                </button>
              </div>

              {#if editingPlans.length === 0}
                <div class="text-center py-8 text-gray-500">
                  <p class="mb-3">No plans detected automatically</p>
                  <button 
                    onclick={addNewPlan}
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Create Manual Plan
                  </button>
                </div>
              {:else}
                <div class="space-y-2">
                  {#each editingPlans as plan, index}
                    <div 
                      class="border rounded p-3 cursor-pointer hover:bg-gray-50 {selectedPlan === index ? 'ring-2 ring-blue-500 bg-blue-50' : ''}"
                      onclick={() => selectedPlan = index}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="font-medium text-sm">{plan.referenceNumber}</div>
                          <div class="text-xs text-gray-600">
                            Pages {plan.startPage}-{plan.endPage} ({plan.pageCount} pages)
                          </div>
                        </div>
                        <button 
                          onclick={() => removePlan(index)}
                          class="text-red-600 hover:text-red-800 text-sm ml-2"
                          title="Remove plan"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Advanced Options -->
              <button 
                onclick={() => showAdvancedOptions = !showAdvancedOptions}
                class="text-sm text-blue-600 hover:text-blue-800 mt-4 flex items-center space-x-1"
              >
                <span>{showAdvancedOptions ? '▼' : '▶'}</span>
                <span>Advanced Options</span>
              </button>

              {#if showAdvancedOptions}
                <div class="mt-3 p-3 bg-gray-50 rounded text-sm space-y-2">
                  <label class="flex items-center space-x-2">
                    <input type="checkbox" class="rounded">
                    <span>Auto-detect plan boundaries</span>
                  </label>
                  <label class="flex items-center space-x-2">
                    <input type="checkbox" class="rounded">
                    <span>Extract plan metadata</span>
                  </label>
                  <label class="flex items-center space-x-2">
                    <input type="checkbox" class="rounded" checked>
                    <span>Generate thumbnails</span>
                  </label>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Right Panel - Plan Editor -->
        <div class="flex-1 overflow-y-auto">
          {#if !isAnalyzing && selectedPlan !== null && editingPlans[selectedPlan]}
            <div class="p-6">
              <h3 class="font-medium text-gray-900 mb-4">Edit Plan Details</h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input 
                    type="text" 
                    value={editingPlans[selectedPlan].referenceNumber}
                    oninput={(e) => updatePlan(selectedPlan!, 'referenceNumber', e.target.value)}
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={editingPlans[selectedPlan].title}
                    oninput={(e) => updatePlan(selectedPlan!, 'title', e.target.value)}
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Start Page</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={metadata.pageCount}
                      value={editingPlans[selectedPlan].startPage}
                      oninput={(e) => updatePlan(selectedPlan!, 'startPage', parseInt(e.target.value) || 1)}
                      class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">End Page</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={metadata.pageCount}
                      value={editingPlans[selectedPlan].endPage}
                      oninput={(e) => updatePlan(selectedPlan!, 'endPage', parseInt(e.target.value) || metadata.pageCount)}
                      class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                  </div>
                </div>

                <div class="bg-gray-50 p-3 rounded">
                  <div class="text-sm text-gray-600">
                    Page Count: <span class="font-medium">{editingPlans[selectedPlan].pageCount}</span>
                  </div>
                </div>

                <!-- Page Preview Placeholder -->
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div class="text-gray-500 mb-2">Page Preview</div>
                  <div class="text-xs text-gray-400">
                    Pages {editingPlans[selectedPlan].startPage}-{editingPlans[selectedPlan].endPage}
                  </div>
                  <div class="mt-3 text-xs text-blue-600">
                    (Preview functionality coming soon)
                  </div>
                </div>
              </div>
            </div>
          {:else if !isAnalyzing}
            <div class="flex-1 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-4">📄</div>
                <p>Select a plan to edit its details</p>
              </div>
            </div>
          {:else}
            <div class="flex-1 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-4">⚙️</div>
                <p>Analyzing document structure...</p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          {#if !isAnalyzing && editingPlans.length === 0}
            <button 
              onclick={handleRetry}
              class="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              Retry Analysis
            </button>
          {/if}
          
          <button 
            onclick={handleCancel}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {#if !isAnalyzing}
          <button 
            onclick={handleProceed}
            disabled={editingPlans.length === 0}
            class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload {editingPlans.length} Plan{editingPlans.length !== 1 ? 's' : ''}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}