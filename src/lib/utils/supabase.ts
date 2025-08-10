import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Database } from '$lib/types/database.js'

console.log('[SupabaseClient] Initializing with:', {
  url: PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  key: PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'
});

export const supabase = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }
  return user
}

// Helper function to get user profile
export async function getUserProfile(userId?: string) {
  const uid = userId || (await getCurrentUser())?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()

  if (error) {
    return null
  }
  return data
}

// Helper function to sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return !error
}