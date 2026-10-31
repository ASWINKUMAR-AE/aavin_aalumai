import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  role: "worker" | "supervisor" | "official" | "admin";
  token: string;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (username: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem("@aavin_user_session");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load user session", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, defaultRole: string = "worker") => {
    // Map demo accounts or API payload
    let role: "worker" | "supervisor" | "official" | "admin" = "worker";
    let fullName = "Murugan K. (Operator)";

    if (username.toLowerCase().includes("super")) {
      role = "supervisor";
      fullName = "Venkatesh R. (Shift Supervisor)";
    } else if (username.toLowerCase().includes("offici")) {
      role = "official";
      fullName = "Dr. Meenakshi S. (GM Quality)";
    } else if (username.toLowerCase().includes("admin")) {
      role = "admin";
      fullName = "Aswin Kumar (System Admin)";
    } else {
      role = (defaultRole as any) || "worker";
      fullName = "Murugan K. (Operator)";
    }

    const session: UserSession = {
      userId: `USR-${username.toUpperCase()}`,
      username: username,
      fullName: fullName,
      role: role,
      token: "demo_jwt_token_aavin_aalumai_2026",
    };

    await AsyncStorage.setItem("@aavin_user_session", JSON.stringify(session));
    setUser(session);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("@aavin_user_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

