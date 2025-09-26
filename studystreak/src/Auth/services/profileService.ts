// profileService - API calls for user profile management
import { supabase } from '@/lib/supabaseClient'

export type UserProfile = {
  id: string
  first_name: string
  last_name: string
  username: string
  email: string
  created_at?: string
}

export const profileService = {
  isUsernameAvailable: async (username: string) => {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('username', username)

    if (error) return { available: false, error }
    return { available: (count ?? 0) === 0, error: null }
  },

  createProfile: async (profile: UserProfile) => {
    return await supabase
      .from('profiles')
      .insert({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username,
        email: profile.email, 
      })
      .single()
  },

  getProfileByUserId: async (userId: string) => {
    return await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, created_at')
      .eq('id', userId)
      .single()
  },

  getEmailByUsername: async (username: string) => {
    // Assumes a public/protected view exists to map username -> email, or profiles stores email.
    // Fallback: fetch profile to get user id, then use admin edge function in production.
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .single()
    if (error || !profile?.id) return { email: null as string | null, error }

    // Client cannot query auth.users directly; expect the app to store email in profiles
    const { data: withEmail } = await supabase
      .from('profiles')
      .select('username, email')
      .ilike('username', username)
      .maybeSingle()

    return { email: withEmail?.email ?? null, error: null }
  },
}