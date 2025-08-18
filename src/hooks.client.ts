import { createBrowserClient, isBrowser } from '@supabase/ssr'
import type { HandleClientError } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { invalidateAll } from '$app/navigation'

export const handleError: HandleClientError = ({ error, event }) => {
  console.log('[ClientHooks] Client error:', error);
  // Client error occurred
}

console.log('[ClientHooks] Creating browser client with:', {
  url: PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  key: PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'
});

// Create a singleton Supabase client for browser use
export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

// Initialize auth state from server-side data and handle invalidation
if (isBrowser()) {
  // console.log('[ClientHooks] Setting up auth state change listener');
  
  // Listen for auth state changes and invalidate server data
  supabase.auth.onAuthStateChange((event, session) => {
    // console.log('[ClientHooks] Auth state change:', event, { hasSession: !!session });
    
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      // console.log('[ClientHooks] Invalidating all server data');
      // Invalidate all server data to trigger re-fetch with new auth state
      // invalidateAll()
    }
  })
}