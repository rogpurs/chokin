import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchProfile, login as apiLogin, setToken, clearToken, getToken } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string>(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const profile = await fetchProfile();
      setUser(profile);
    } catch {
      setUser(null);
      clearToken();
      setTokenState("");
    }
  }, []);

  useEffect(() => {
    const existing = getToken();
    if (existing) {
      setTokenState(existing);
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await apiLogin({ email, password });
    setToken(result.token);
    setTokenState(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    setTokenState("");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
