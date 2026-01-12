import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  toolsCount?: number;
  isAdmin?: boolean;
  twoFactorEnabled?: boolean;
  avatarUrl?: string | null;
  currency?: string;
  language?: string;
  emailVerifiedAt?: string | null;
  budgetThreshold?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  refreshUser: (silent?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    return stored && token ? JSON.parse(stored) : null;
  });

  // Initialize loading: true if we have a token, regardless of whether we have a user
  // We want to verify the token/user session on every hard reload to be safe
  const [isLoading, setIsLoading] = useState(() => {
    return !!localStorage.getItem("token");
  });



  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async (silent = false) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Only show global loader if not a silent background refresh
      if (!silent) {
        setIsLoading(true);
      }

      // GET user profile endpoint is `/api/user/profile` on the server
      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        // Ensure cookie is in sync for extension even on refresh
        document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; sameSite=Lax`;
      } else {
        // Token invalid, clear auth
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Auto-fetch user profile on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);
  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();

    // Check if 2FA is required
    if (data.requiresTwoFactor) {
      throw new Error("2FA_REQUIRED");
    }

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);

    // Set cookie for extension sync
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; sameSite=Lax`;
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);

    // Set cookie for extension sync
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; sameSite=Lax`;
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        setUser,
        refreshUser: fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}



