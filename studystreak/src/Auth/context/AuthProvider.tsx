// AuthProvider - React context provider for authentication state
import React, { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './useAuthContext';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSyncing, setAuthSyncing] = useState(false);

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for subsequent changes without toggling loading
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setAuthSyncing(true);
        setSession(sess);
        setUser(sess?.user ?? null);
        // brief defer to avoid route guards racing the state update
        setTimeout(() => setAuthSyncing(false), 150);
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dev-only: sign out automatically when leaving/reloading the page on localhost [Reason: not signing out while on LocalHost]
  useEffect(() => {
    const isLocalDev = import.meta.env.DEV || window.location.hostname === 'localhost';
    if (!isLocalDev) return;

    const signOutQuick = () => {
      void supabase.auth.signOut();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        signOutQuick();
      }
    };

    window.addEventListener('beforeunload', signOutQuick);
    window.addEventListener('pagehide', signOutQuick);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', signOutQuick);
      window.removeEventListener('pagehide', signOutQuick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading: loading || authSyncing }}>{children}</AuthContext.Provider>;
};

// Only export the provider from this file to keep fast-refresh happy