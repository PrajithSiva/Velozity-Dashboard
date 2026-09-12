import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../types";
import * as authApi from "../api/auth.api";
import { setAccessToken } from "../api/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    (async () => {
      try {
        const result = await authApi.refresh();
        setAccessToken(result.accessToken);
        setUser(result.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function logout() {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
