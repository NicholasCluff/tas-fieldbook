<script lang="ts">
	import { onMount } from 'svelte'
	import { X, AlertCircle, CheckCircle, Info } from 'lucide-svelte'

	export let message: string
	export let type: 'error' | 'success' | 'info' = 'info'
	export let duration = 5000
	export let onClose: (() => void) | undefined = undefined

	let visible = true
	let timeoutId: number

	onMount(() => {
		if (duration > 0) {
			timeoutId = setTimeout(() => {
				close()
			}, duration)
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	})

	function close() {
		visible = false
		if (onClose) {
			onClose()
		}
	}

	function getIcon() {
		switch (type) {
			case 'error':
				return AlertCircle
			case 'success':
				return CheckCircle
			case 'info':
			default:
				return Info
		}
	}

	function getColors() {
		switch (type) {
			case 'error':
				return 'bg-red-50 border-red-200 text-red-800'
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800'
			case 'info':
			default:
				return 'bg-blue-50 border-blue-200 text-blue-800'
		}
	}
</script>

{#if visible}
	<div class="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-2 duration-300">
		<div class="border rounded-lg shadow-lg p-4 {getColors()}">
			<div class="flex items-start space-x-3">
				<svelte:component this={getIcon()} class="w-5 h-5 mt-0.5 flex-shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium">{message}</p>
				</div>
				<button 
					on:click={close}
					class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in-from-top-2 {
		from {
			transform: translateY(-8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	
	.animate-in {
		animation: slide-in-from-top-2 0.3s ease-out;
	}
</style>