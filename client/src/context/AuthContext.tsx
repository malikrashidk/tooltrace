import { createContext, useContext, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "standard" | "premium";
  toolsCount?: number;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo accounts for testing
const DEMO_ACCOUNTS = {
  "admin@demo.com": { name: "Admin User", plan: "premium" as const, isAdmin: true },
  "free@demo.com": { name: "Free User", plan: "free" as const, isAdmin: false },
  "standard@demo.com": { name: "Standard User", plan: "standard" as const, isAdmin: false },
  "premium@demo.com": { name: "Premium User", plan: "premium" as const, isAdmin: false },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // todo: remove mock functionality - replace with real API calls
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, _password: string) => {
    // todo: remove mock functionality - replace with real API call
    const demoAccount = DEMO_ACCOUNTS[email as keyof typeof DEMO_ACCOUNTS];
    
    if (!demoAccount) {
      throw new Error("Invalid email. Use one of the demo accounts.");
    }

    const mockUser = {
      id: `user-${email.split("@")[0]}`,
      email,
      name: demoAccount.name,
      plan: demoAccount.plan,
      toolsCount: 0,
      isAdmin: demoAccount.isAdmin,
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const signup = async (email: string, _password: string, name: string) => {
    // todo: remove mock functionality - replace with real API call
    const mockUser = {
      id: "user-1",
      email,
      name,
      plan: "free" as const,
      toolsCount: 0,
      isAdmin: false,
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
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
