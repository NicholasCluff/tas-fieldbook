import type { RequestEvent } from '@sveltejs/kit'
import type { Profile } from '$lib/types/database'

/**
 * Get the user profile from the database using validated session
 */
export async function getProfile(event: RequestEvent): Promise<Profile | null> {
  console.log('[ServerAuth] Getting profile...');
  const { user } = await event.locals.safeGetSession()
  if (!user) {
    console.log('[ServerAuth] No user found in session');
    return null
  }

  console.log('[ServerAuth] User found, fetching profile for:', user.id);
  
  try {
    const { data: profile, error } = await event.locals.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.log('[ServerAuth] Profile fetch error:', error.message);
      return null
    }

    console.log('[ServerAuth] Profile fetched successfully:', profile ? 'has profile' : 'no profile');
    return profile
  } catch (err) {
    console.log('[ServerAuth] Profile fetch exception:', err);
    return null
  }
}

/**
 * Require authentication for a route
 * Redirects to login if not authenticated
 */
export async function requireAuth(event: RequestEvent) {
  const { user } = await event.locals.safeGetSession()
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/login'
      }
    })
  }
  return null
}