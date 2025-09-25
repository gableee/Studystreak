// authService - API calls for authentication (login, signup, logout, etc.)

import { supabase } from '../../lib/supabaseClient';

type OAuthProvider = 'apple' | 'facebook' | 'github' | 'google';

export const authService = {
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),

  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) =>
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo ?? window.location.origin + '/dashboard',
        // can add provider-specific scopes below:
        // scopes: provider === 'github' ? 'read:user user:email' :
        //         provider === 'facebook' ? 'public_profile,email' :
        //         provider === 'apple' ? 'name email' : undefined,
      },
    }),

  signOut: () => supabase.auth.signOut(),

  requestPasswordReset: (email: string, redirectTo: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),

  updatePassword: (newPassword: string) =>
    supabase.auth.updateUser({ password: newPassword }),
};