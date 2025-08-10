<script lang="ts">
	export let message: string
	export let type: 'error' | 'warning' | 'info' = 'error'

	const typeClasses = {
		error: 'bg-red-50 border-red-200 text-red-600',
		warning: 'bg-yellow-50 border-yellow-200 text-yellow-600',
		info: 'bg-blue-50 border-blue-200 text-blue-600'
	}
</script>

{#if message}
	<div class="rounded-md border px-4 py-3 {typeClasses[type]}">
		<p class="text-sm">{message}</p>
	</div>
{/if}