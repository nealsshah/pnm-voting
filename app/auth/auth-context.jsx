"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

const AuthContext = createContext(undefined);

export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const checkAdminStatus = async (userId) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data: userRole, error } = await supabase
        .from('users_metadata')
        .select('role')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setIsAdmin(userRole?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Quickly get the session from local storage. This avoids a network request.
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          // Fetch admin status in background to avoid blocking UI
          checkAdminStatus(session.user.id);
        }
      } catch (e) {
        console.error('Error getting session:', e);
      } finally {
        if (mounted) setLoading(false);
      }

      // Validate the session with Supabase Auth server for extra security (non-blocking)
      supabase.auth.getUser()
        .then(async ({ data: { user }, error }) => {
          if (!mounted) return;
          if (error) {
            console.error('Error validating user:', error);
            setUser(null);
            setIsAdmin(false);
          } else if (user) {
            setUser(user);
            checkAdminStatus(user.id);
          }
        })
        .catch((err) => console.error('Error in getUser():', err));
    }

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user.id);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        // Non-blocking admin status fetch
        checkAdminStatus(data.user.id);
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      router.push('/login');
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

