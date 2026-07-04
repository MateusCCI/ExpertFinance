import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (e) {
          console.error("Auth code exchange failed:", e);
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname);
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        },
      );

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      return () => listener?.subscription.unsubscribe();
    };

    handleAuth();
  }, []);

  return {
    isLoading: loading,
    isAuthenticated: !!user,
    user: user
      ? { id: user.id, name: user.user_metadata?.name, email: user.email }
      : null,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    signUp: async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
