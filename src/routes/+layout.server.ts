import type { LayoutServerLoad } from './$types'
import { getProfile } from '$lib/server/auth'

export const load: LayoutServerLoad = async (event) => {
  // console.log('[LayoutServerLoad] Starting server load...');
  
  const { session, user } = await event.locals.safeGetSession()
  console.log('[LayoutServerLoad] Session data:', { 
    hasSession: !!session, 
    hasUser: !!user,
    userId: user?.id 
  });
  
  const profile = user ? await getProfile(event) : null;
  
  // console.log('[LayoutServerLoad] Returning data:', {
  //   hasSession: !!session,
  //   hasUser: !!user, 
  //   hasProfile: !!profile
  // });
  
  return {
    session,
    user,
    profile,
  }
}