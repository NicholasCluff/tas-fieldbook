import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const handle: Handle = async ({ event, resolve }) => {
  // console.log('[ServerHooks] Processing request for:', event.url.pathname);
  
  // Create a Supabase client for server-side operations
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: '/' })
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' })
      },
    },
  })

  console.log('[ServerHooks] Supabase client created with:', {
    url: PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    key: PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'
  });

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    // console.log('[ServerHooks] Getting safe session...');
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    
    // console.log('[ServerHooks] Got session:', session ? 'exists' : 'null');
    
    if (!session) {
      return { session: null, user: null }
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()
    
    if (error) {
      // console.log('[ServerHooks] JWT validation failed:', error.message);
      // JWT validation has failed
      return { session: null, user: null }
    }

    // console.log('[ServerHooks] User validated successfully');
    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}