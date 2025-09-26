// authService - API calls for authentication (login, signup, logout, etc.)
import { supabase } from '@/lib/supabaseClient';

type OAuthProvider = 'facebook' | 'google';

// Define proper types for user metadata
type UserMetadata = {
  first_name?: string;
  last_name?: string;
  username?: string;
  // Add other optional fields you might use
};

export const authService = {
  signUp: (email: string, password: string, userData?: UserMetadata) =>
    supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData
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