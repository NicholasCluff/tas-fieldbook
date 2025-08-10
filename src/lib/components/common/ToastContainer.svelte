<script lang="ts">
	import { toastStore } from '$lib/stores/toast.js'
	import Toast from './Toast.svelte'

	$: toasts = $toastStore
</script>

<div class="fixed top-4 right-4 z-50 space-y-2">
	{#each toasts as toast (toast.id)}
		<Toast 
			message={toast.message} 
			type={toast.type} 
			duration={toast.duration}
			onClose={() => toastStore.remove(toast.id)}
		/>
	{/each}
</div>