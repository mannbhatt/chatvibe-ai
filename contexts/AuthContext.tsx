import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserProfile = {
  id: string;
  onboarding_completed: boolean;
  display_name?: string;
  email?: string;
  is_premium?: boolean;
  tokens_used_today?: number;
  daily_token_limit?: number;
  generations_today?: number;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('fetchProfile called with invalid userId:', userId);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      // OVERRIDE WITH get_token_status for accurate daily tokens
      const { data: tokenStatusData, error: rpcError } = await supabase.rpc('get_token_status', { p_user_id: userId });
      

      const tokenStatus = Array.isArray(tokenStatusData) ? tokenStatusData[0] : tokenStatusData;
      if (tokenStatus && !rpcError) {
        const used = tokenStatus.tokens_used !== undefined ? tokenStatus.tokens_used : tokenStatus.tokens_used_today;
        const limit = tokenStatus.daily_limit !== undefined ? tokenStatus.daily_limit : tokenStatus.daily_token_limit;
        
        if (used !== undefined) data.tokens_used_today = Number(used);
        if (limit !== undefined) data.daily_token_limit = Number(limit);
      } else {
        // FALLBACK: Client side date check if RPC fails or is missing
        if (data.generations_reset_at) {
          const resetDate = new Date(data.generations_reset_at);
          const today = new Date();
          if (resetDate.getUTCFullYear() !== today.getUTCFullYear() ||
              resetDate.getUTCMonth() !== today.getUTCMonth() ||
              resetDate.getUTCDate() !== today.getUTCDate()) {
            data.tokens_used_today = 0;
          }
        }
      }
      setUserProfile(data);
    } else {
      console.error('Failed to fetch profile', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, userProfile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
