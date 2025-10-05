// authService - API calls for authentication (login, signup, logout, etc.)
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';

type OAuthProvider = 'facebook' | 'google';

// Define proper types for user metadata
type UserMetadata = {
  first_name?: string;
  last_name?: string;
  username?: string;
  birthday?: string;
  age?: number;
  email?: string;
  //  other optional fields
};

export const authService = {
  signUp: async (email: string, password: string, userData?: UserMetadata) => {
    const payload = {
      email,
      password,
      data: userData ?? undefined,
    };
    return apiClient.post('/api/auth/signup', payload);
  },

  signInWithPassword: async (email: string, password: string) => {
    const response = await apiClient.post<{ access_token: string; refresh_token: string }>(
      '/api/auth/signin',
      { email, password },
    );

    const { data, error } = await supabase.auth.setSession({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });

    if (error) throw error;
    return data.session ?? null;
  },

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