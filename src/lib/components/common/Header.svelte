<script lang="ts">
	import { authStore, authService } from '$lib/stores/auth.js'
	import { goto } from '$app/navigation'
	import { Menu, User, LogOut } from 'lucide-svelte'

	let showUserMenu = false

	async function handleSignOut() {
		await authService.signOut()
		goto('/login')
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu
	}

	// Close menu when clicking outside
	function closeMenu() {
		showUserMenu = false
	}
</script>

<svelte:window on:click={closeMenu} />

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo and Navigation -->
			<div class="flex items-center">
				<a href="/dashboard" class="text-xl font-bold text-blue-600">
					TasFieldbook
				</a>
				
				<nav class="hidden md:ml-8 md:flex md:space-x-8">
					<a href="/dashboard" class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
						Dashboard
					</a>
					<a href="/projects" class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
						Projects
					</a>
					<a href="/invitations" class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
						Invitations
					</a>
				</nav>
			</div>

			<!-- User Menu -->
			<div class="flex items-center space-x-4">
				{#if $authStore.profile}
					<div class="relative">
						<button
							on:click|stopPropagation={toggleUserMenu}
							class="flex items-center space-x-2 text-gray-700 hover:text-blue-600 focus:outline-none"
						>
							<User size={20} />
							<span class="text-sm font-medium">
								{$authStore.profile.first_name} {$authStore.profile.last_name}
							</span>
							<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
								{$authStore.profile.role}
							</span>
						</button>

						{#if showUserMenu}
							<div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
								<a
									href="/profile"
									class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									Profile Settings
								</a>
								<button
									on:click={handleSignOut}
									class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									<LogOut size={16} class="inline mr-2" />
									Sign Out
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex items-center space-x-4">
						<a href="/login" class="text-gray-700 hover:text-blue-600 text-sm font-medium">
							Sign In
						</a>
						<a href="/register" class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
							Sign Up
						</a>
					</div>
				{/if}

				<!-- Mobile menu button -->
				<button class="md:hidden text-gray-700 hover:text-blue-600">
					<Menu size={24} />
				</button>
			</div>
		</div>
	</div>
</header>