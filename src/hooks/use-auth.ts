import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearKeyCache } from "@/lib/crypto";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    const exchangeCode = async () => {
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    exchangeCode();

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
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
      clearKeyCache();
      await supabase.auth.signOut();
    },
  };
}
