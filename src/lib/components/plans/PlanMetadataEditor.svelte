<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { 
    X, 
    Save, 
    Calendar, 
    User, 
    Map, 
    FileText, 
    MessageSquare,
    Plus,
    Trash2,
    Navigation
  } from 'lucide-svelte'
  import type { SurveyPlanWithDetails, PlanRemark } from '$lib/types/database.js'
  import { surveyPlansService } from '$lib/services/surveyPlans.service.js'

  interface Props {
    plan: SurveyPlanWithDetails
    show: boolean
  }

  let { plan, show }: Props = $props()

  const dispatch = createEventDispatcher<{
    close: void
    saved: { plan: SurveyPlanWithDetails }
  }>()

  // Form data
  let formData = $state({
    surveyor_name: plan.surveyor_name || '',
    title_references: plan.title_references || [],
    survey_datum: plan.survey_datum || '',
    bearing_swing_difference: plan.bearing_swing_difference || null,
    remarks: (plan.remarks as PlanRemark[]) || [],
    lot_numbers: plan.lot_numbers || [],
    deposited_plan_numbers: plan.deposited_plan_numbers || []
  })

  // Common datum options
  const datumOptions = [
    'GDA94',
    'GDA2020', 
    'AGD66',
    'AGD84',
    'MGA94 Zone 55',
    'MGA2020 Zone 55',
    'Local Grid'
  ]

  // Form state
  let saving = $state(false)
  let error = $state('')
  let activeTab = $state<'basic' | 'survey' | 'references' | 'remarks'>('basic')

  // New reference input
  let newTitleRef = $state('')
  let newLotNumber = $state('')
  let newDpNumber = $state('')

  // New remark input
  let newRemark = $state({
    text: '',
    reference_number: '',
    type: 'general' as PlanRemark['type']
  })

  function addTitleReference() {
    if (newTitleRef.trim()) {
      formData.title_references = [...formData.title_references, newTitleRef.trim()]
      newTitleRef = ''
    }
  }

  function removeTitleReference(index: number) {
    formData.title_references = formData.title_references.filter((_, i) => i !== index)
  }

  function addLotNumber() {
    if (newLotNumber.trim()) {
      formData.lot_numbers = [...formData.lot_numbers, newLotNumber.trim()]
      newLotNumber = ''
    }
  }

  function removeLotNumber(index: number) {
    formData.lot_numbers = formData.lot_numbers.filter((_, i) => i !== index)
  }

  function addDpNumber() {
    if (newDpNumber.trim()) {
      formData.deposited_plan_numbers = [...formData.deposited_plan_numbers, newDpNumber.trim()]
      newDpNumber = ''
    }
  }

  function removeDpNumber(index: number) {
    formData.deposited_plan_numbers = formData.deposited_plan_numbers.filter((_, i) => i !== index)
  }

  function addRemark() {
    if (newRemark.text.trim()) {
      formData.remarks = [...formData.remarks, { ...newRemark, text: newRemark.text.trim() }]
      newRemark = { text: '', reference_number: '', type: 'general' }
    }
  }

  function removeRemark(index: number) {
    formData.remarks = formData.remarks.filter((_, i) => i !== index)
  }

  async function handleSave() {
    if (saving) return
    
    saving = true
    error = ''

    try {
      const updates = {
        surveyor_name: formData.surveyor_name.trim() || null,
        title_references: formData.title_references.length > 0 ? formData.title_references : null,
        survey_datum: formData.survey_datum.trim() || null,
        bearing_swing_difference: formData.bearing_swing_difference,
        remarks: formData.remarks.length > 0 ? formData.remarks : null,
        lot_numbers: formData.lot_numbers.length > 0 ? formData.lot_numbers : null,
        deposited_plan_numbers: formData.deposited_plan_numbers.length > 0 ? formData.deposited_plan_numbers : null
      }

      const result = await surveyPlansService.updatePlan(plan.id, updates)
      
      if (result.success && result.data) {
        // Update the plan object with new metadata
        const updatedPlan = { ...plan, ...updates }
        dispatch('saved', { plan: updatedPlan })
        dispatch('close')
      } else {
        error = result.error || 'Failed to save metadata'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save metadata'
    } finally {
      saving = false
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dispatch('close')
    }
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && dispatch('close')}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Edit Plan Metadata</h2>
          <p class="text-sm text-gray-600 mt-1">
            {plan.reference_number} • {plan.title || 'Untitled Plan'}
          </p>
        </div>
        <button 
          onclick={() => dispatch('close')}
          class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-gray-200 px-6">
        <button
          onclick={() => activeTab = 'basic'}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'basic' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <User size={16} />
            <span>Basic Info</span>
          </div>
        </button>
        <button
          onclick={() => activeTab = 'survey'}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'survey' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <Navigation size={16} />
            <span>Survey Details</span>
          </div>
        </button>
        <button
          onclick={() => activeTab = 'references'}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'references' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <FileText size={16} />
            <span>References</span>
          </div>
        </button>
        <button
          onclick={() => activeTab = 'remarks'}
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'remarks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <MessageSquare size={16} />
            <span>Remarks</span>
          </div>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if activeTab === 'basic'}
          <div class="space-y-6">
            <div>
              <label for="surveyor_name" class="block text-sm font-medium text-gray-700 mb-2">
                Surveyor Name
              </label>
              <input
                id="surveyor_name"
                type="text"
                bind:value={formData.surveyor_name}
                placeholder="Enter surveyor name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label for="plan_year" class="block text-sm font-medium text-gray-700 mb-2">
                Plan Year
              </label>
              <div class="flex items-center space-x-2">
                <Calendar size={20} class="text-gray-400" />
                <input
                  id="plan_year"
                  type="number"
                  value={plan.plan_year || ''}
                  placeholder="Year"
                  min="1800"
                  max="2100"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readonly
                />
                <span class="text-sm text-gray-500">(Edit from main view)</span>
              </div>
            </div>
          </div>

        {:else if activeTab === 'survey'}
          <div class="space-y-6">
            <div>
              <label for="survey_datum" class="block text-sm font-medium text-gray-700 mb-2">
                Survey Datum
              </label>
              <div class="relative">
                <select
                  id="survey_datum"
                  bind:value={formData.survey_datum}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select datum...</option>
                  {#each datumOptions as datum}
                    <option value={datum}>{datum}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div>
              <label for="bearing_swing" class="block text-sm font-medium text-gray-700 mb-2">
                Bearing Swing Difference to MGA (degrees)
              </label>
              <input
                id="bearing_swing"
                type="number"
                bind:value={formData.bearing_swing_difference}
                placeholder="e.g., 0.5, -1.2"
                step="0.01"
                min="-180"
                max="180"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p class="mt-1 text-sm text-gray-500">
                Enter positive values for eastward swing, negative for westward
              </p>
            </div>
          </div>

        {:else if activeTab === 'references'}
          <div class="space-y-6">
            <!-- Title References -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Title References
              </label>
              <div class="space-y-2">
                {#each formData.title_references as ref, index}
                  <div class="flex items-center space-x-2">
                    <span class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                      {ref}
                    </span>
                    <button
                      onclick={() => removeTitleReference(index)}
                      class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Remove reference"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                {/each}
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    bind:value={newTitleRef}
                    placeholder="Add title reference (e.g., CT 123456/1)"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onkeydown={(e) => e.key === 'Enter' && addTitleReference()}
                  />
                  <button
                    onclick={addTitleReference}
                    class="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Add reference"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <!-- Lot Numbers -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Lot Numbers
              </label>
              <div class="space-y-2">
                {#each formData.lot_numbers as lot, index}
                  <div class="flex items-center space-x-2">
                    <span class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                      Lot {lot}
                    </span>
                    <button
                      onclick={() => removeLotNumber(index)}
                      class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Remove lot"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                {/each}
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    bind:value={newLotNumber}
                    placeholder="Add lot number (e.g., 123, 45A)"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onkeydown={(e) => e.key === 'Enter' && addLotNumber()}
                  />
                  <button
                    onclick={addLotNumber}
                    class="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Add lot"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <!-- Deposited Plan Numbers -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Deposited Plan Numbers
              </label>
              <div class="space-y-2">
                {#each formData.deposited_plan_numbers as dp, index}
                  <div class="flex items-center space-x-2">
                    <span class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                      DP {dp}
                    </span>
                    <button
                      onclick={() => removeDpNumber(index)}
                      class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Remove DP"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                {/each}
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    bind:value={newDpNumber}
                    placeholder="Add DP number (e.g., 123456)"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onkeydown={(e) => e.key === 'Enter' && addDpNumber()}
                  />
                  <button
                    onclick={addDpNumber}
                    class="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Add DP"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        {:else if activeTab === 'remarks'}
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Plan Remarks
              </label>
              <div class="space-y-3">
                {#each formData.remarks as remark, index}
                  <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {remark.type}
                          </span>
                          {#if remark.reference_number}
                            <span class="text-xs text-gray-500 font-mono">
                              Ref: {remark.reference_number}
                            </span>
                          {/if}
                        </div>
                        <p class="text-sm text-gray-900">{remark.text}</p>
                      </div>
                      <button
                        onclick={() => removeRemark(index)}
                        class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md ml-2"
                        title="Remove remark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                {/each}

                <!-- Add new remark -->
                <div class="border border-dashed border-gray-300 rounded-md p-4">
                  <div class="space-y-3">
                    <div class="flex items-center space-x-3">
                      <select
                        bind:value={newRemark.type}
                        class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="general">General</option>
                        <option value="boundary">Boundary</option>
                        <option value="easement">Easement</option>
                        <option value="restriction">Restriction</option>
                        <option value="note">Note</option>
                      </select>
                      <input
                        type="text"
                        bind:value={newRemark.reference_number}
                        placeholder="Reference number (optional)"
                        class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <textarea
                      bind:value={newRemark.text}
                      placeholder="Enter remark text..."
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    ></textarea>
                    <button
                      onclick={addRemark}
                      disabled={!newRemark.text.trim()}
                      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                    >
                      <Plus size={16} />
                      <span>Add Remark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        {#if error}
          <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
        <button
          onclick={() => dispatch('close')}
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          disabled={saving}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {#if saving}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Saving...</span>
          {:else}
            <Save size={16} />
            <span>Save Metadata</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}