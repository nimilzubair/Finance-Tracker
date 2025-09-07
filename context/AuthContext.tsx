// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  userid: number;
  username: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (jwtToken: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        const isValid = await verifyToken(storedToken);
        if (isValid) {
          // Token is valid, user data is already set by verifyToken
          setToken(storedToken);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Verify token with backend
  const verifyToken = async (jwtToken: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/check", {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  };

  const login = (jwtToken: string, userData: User) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("authToken", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const checkAuth = async (): Promise<boolean> => {
    const currentToken = token || localStorage.getItem("authToken");
    if (!currentToken) {
      return false;
    }

    const isValid = await verifyToken(currentToken);
    if (!isValid) {
      logout();
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};