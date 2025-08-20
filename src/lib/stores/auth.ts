import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { invalidateAll } from '$app/navigation'
import { supabase } from '$lib/utils/supabase.js'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '$lib/types/database.js'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  error: null
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState)

  return {
    subscribe,
    set,
    update,
    init: () => {
      if (!browser) {
        // console.log('[AuthStore] Not in browser, skipping init');
        return
      }

      // console.log('[AuthStore] Initializing auth state change listener');

      // Listen for auth changes
      // Fix for auth failing after tab change: make callback non-blocking
      // See: https://github.com/nuxt-modules/supabase/issues/273#issuecomment-2051932773
      supabase.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
          // console.log('[AuthStore] Auth state change event:', event, { hasSession: !!session });
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // console.log('[AuthStore] User signed in or token refreshed');
            // Get validated user data
            supabase.auth.getUser().then(({ data: { user }, error }) => {
              if (user && !error) {
                // console.log('[AuthStore] User data retrieved successfully');
                update(state => ({ ...state, user, session, loading: false }))
                // Load profile
                // console.log('[AuthStore] Loading user profile');
                loadProfile(user.id)
              } else {
                // console.log('[AuthStore] Error getting user data:', error);
              }
            })
          } else if (event === 'SIGNED_OUT') {
            // console.log('[AuthStore] User signed out');
            set(initialState)
          } else {
            // console.log('[AuthStore] Other auth event:', event);
            set(initialState);
          }
          
          // // Invalidate all server data to refetch with new auth state
          // console.log('[AuthStore] Invalidating all server data');
          // invalidateAll()
        }, 0);
      })
    }
  }
}

export const authStore = createAuthStore()

async function loadProfile(userId: string) {
  // console.log('[AuthStore] Loading profile for user:', userId);
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // console.log('[AuthStore] Profile load error:', error.message);
      authStore.update(state => ({ ...state, error: error.message }))
      return
    }

    // console.log('[AuthStore] Profile loaded successfully:', profile ? 'has profile' : 'no profile');
    authStore.update(state => ({ ...state, profile }))
  } catch (err) {
    // console.log('[AuthStore] Profile load exception:', err);
    authStore.update(state => ({ ...state, error: 'Failed to load profile' }))
  }
}

// Auth service functions
export const authService = {
  async signIn(email: string, password: string) {
    authStore.update(state => ({ ...state, loading: true, error: null }))

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      authStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: error.message 
      }))
      return { success: false, error: error.message }
    }

    return { success: true, data }
  },

  async signUp(email: string, password: string, firstName: string, lastName: string, phone?: string) {
    authStore.update(state => ({ ...state, loading: true, error: null }))

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone
        }
      }
    })

    if (error) {
      authStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: error.message 
      }))
      return { success: false, error: error.message }
    }

    authStore.update(state => ({ ...state, loading: false }))
    return { success: true, data }
  },

  async signOut() {
    authStore.update(state => ({ ...state, loading: true, error: null }))

    const { error } = await supabase.auth.signOut()

    if (error) {
      authStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: error.message 
      }))
      return { success: false, error: error.message }
    }

    return { success: true }
  },

  async updateProfile(updates: Partial<Profile>) {
    authStore.update(state => ({ ...state, loading: true, error: null }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      authStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: 'No authenticated user' 
      }))
      return { success: false, error: 'No authenticated user' }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      authStore.update(state => ({ 
        ...state, 
        loading: false, 
        error: error.message 
      }))
      return { success: false, error: error.message }
    }

    authStore.update(state => ({ 
      ...state, 
      profile: data, 
      loading: false 
    }))
    return { success: true, data }
  },

  clearError() {
    authStore.update(state => ({ ...state, error: null }))
  },

  async refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await loadProfile(user.id)
    }
  },

  async forceProfileRefresh() {
    authStore.update(state => ({ ...state, loading: true, error: null }))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await loadProfile(user.id)
    } else {
      authStore.update(state => ({ ...state, loading: false }))
    }
  }
}