// authService - API calls for authentication (login, signup, logout, etc.)

import { supabase } from '@/lib/supabaseClient';

type OAuthProvider =  'facebook' | 'google';

export const authService = {
  signUp: (email: string, password: string, userData?: any) =>
    supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData // This passes the metadata to the trigger
      }
    }),

  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) =>
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo ?? window.location.origin + '/dashboard',
      },
    }),

  signOut: () => supabase.auth.signOut(),

  requestPasswordReset: (email: string, redirectTo: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),

  updatePassword: (newPassword: string) =>
    supabase.auth.updateUser({ password: newPassword }),
};