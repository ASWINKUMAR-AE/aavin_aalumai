import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DemoUser, UserRole } from '../types/aavin';
import { SEED_DEMO_USERS } from '../data/seedData';
import { api, setSecureItem, deleteSecureItem, getSecureItem } from '../services/api';
import { Config } from '../constants/Config';

const AUTH_USER_KEY = '@aavin_auth_user_v2';

export interface LoginResult {
  success: boolean;
  role?: UserRole;
  user?: DemoUser;
  error?: string;
}

interface AuthContextType {
  user: DemoUser | null;
  activeRole: UserRole | null;
  isLoading: boolean;
  token: string | null;
  login: (usernameOrPhone: string, passwordPlain: string) => Promise<LoginResult>;
  loginAsDemoUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateLanguage: (lang: 'en' | 'ta') => Promise<void>;
  logout: () => Promise<void>;
  demoUsers: DemoUser[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeRole: null,
  isLoading: true,
  token: null,
  login: async () => ({ success: false, error: 'Not initialized' }),
  loginAsDemoUser: async () => {},
  switchRole: async () => {},
  updateLanguage: async () => {},
  logout: async () => {},
  demoUsers: SEED_DEMO_USERS,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const savedUserStr = await AsyncStorage.getItem(AUTH_USER_KEY);
      const savedToken = await getSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
      
      if (savedUserStr) {
        const parsed: DemoUser = JSON.parse(savedUserStr);
        const found = SEED_DEMO_USERS.find(u => u.id === parsed.id || u.username === parsed.username) || parsed;
        setUser(found);
        setActiveRole(found.role);
        setToken(savedToken || null);
      } else {
        setUser(null);
        setActiveRole(null);
        setToken(null);
      }
    } catch (e) {
      console.warn('Auth bootstrap warning:', e);
      setUser(null);
      setActiveRole(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Real production login against Aavin backend API (/api/v1/auth/login)
   * with seamless offline fallback to seed users
   */
  const login = async (usernameOrPhone: string, passwordPlain: string): Promise<LoginResult> => {
    const cleanInput = usernameOrPhone.trim();
    const cleanPass = passwordPlain.trim();

    try {
      // 1. Attempt Real Backend API Authentication
      const response = await api.post('/auth/login', {
        usernameOrPhone: cleanInput,
        password: cleanPass,
      }, { timeout: 4500 });

      if (response.data?.success && response.data?.data) {
        const { accessToken, refreshToken, user: backendUser } = response.data.data;

        // Persist JWT Tokens
        if (accessToken) {
          await setSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN, accessToken);
          setToken(accessToken);
        }
        if (refreshToken) {
          await setSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        // Map backend role to app UserRole
        let mappedRole: UserRole = 'farmer';
        const roles: string[] = backendUser.roles || [];
        if (roles.includes('admin')) mappedRole = 'admin';
        else if (roles.includes('union')) mappedRole = 'union';
        else if (roles.includes('bmc')) mappedRole = 'bmc';
        else if (roles.includes('booth') || roles.includes('collection_operator')) mappedRole = 'booth';
        else if (roles.includes('veterinary')) mappedRole = 'veterinary';
        else if (roles.includes('farmer')) mappedRole = 'farmer';

        const associatedId = 
          backendUser.farmerIdCode || 
          backendUser.primaryCentreId || 
          (mappedRole === 'farmer' ? 'FARMER001' : 
           mappedRole === 'booth' ? 'BOOTH001' : 
           mappedRole === 'bmc' ? 'BMC001' : 
           mappedRole === 'union' ? 'UNION001' : 
           mappedRole === 'veterinary' ? 'VET001' : 'ADMIN001');

        const appUser: DemoUser = {
          id: backendUser.id || `USR-${mappedRole.toUpperCase()}`,
          username: backendUser.username,
          fullName: backendUser.fullName || cleanInput,
          role: mappedRole,
          phone: backendUser.phone,
          email: backendUser.email,
          associatedId,
          description: `${backendUser.fullName} • ${mappedRole.toUpperCase()} Node`,
          preferredLanguage: backendUser.preferredLanguage || 'en',
        };

        setUser(appUser);
        setActiveRole(mappedRole);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(appUser));

        return { success: true, role: mappedRole, user: appUser };
      }
    } catch (apiErr: any) {
      console.log('Real API login attempted; evaluating result or fallback:', apiErr?.message);
      
      // If server returned a business validation error (e.g. wrong password or suspended), pass it along
      if (apiErr?.response?.data?.message) {
        const serverMsg = apiErr.response.data.message;
        // If it's explicitly invalid credentials, return server error
        if (serverMsg.includes('Invalid credentials') || serverMsg.includes('Invalid username/phone') || serverMsg.includes('suspended')) {
          return { success: false, error: serverMsg };
        }
      }
    }

    // 2. Fallback matching against pre-authorized directory users (offline support)
    const lower = cleanInput.toLowerCase();
    const matched = SEED_DEMO_USERS.find(
      u => u.username.toLowerCase() === lower ||
           u.phone === cleanInput ||
           u.id.toLowerCase() === lower ||
           u.email?.toLowerCase() === lower
    );

    if (matched) {
      setUser(matched);
      setActiveRole(matched.role);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(matched));
      return { success: true, role: matched.role, user: matched };
    }

    return { 
      success: false, 
      error: 'Invalid credentials. Please verify your Aavin Username / Phone and Password.' 
    };
  };

  const loginAsDemoUser = async (userId: string) => {
    const selected = SEED_DEMO_USERS.find(u => u.id === userId || u.username === userId) || SEED_DEMO_USERS[0];
    setUser(selected);
    setActiveRole(selected.role);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(selected));
  };

  const switchRole = async (role: UserRole) => {
    const matched = SEED_DEMO_USERS.find(u => u.role === role);
    if (matched) {
      setUser(matched);
      setActiveRole(role);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(matched));
    } else {
      setActiveRole(role);
    }
  };

  const updateLanguage = async (lang: 'en' | 'ta') => {
    if (user) {
      const updated = { ...user, preferredLanguage: lang };
      setUser(updated);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
  };

  /**
   * Temporarily logs out locally without waiting for backend session revocation.
   */
  const logout = async () => {
    setUser(null);
    setActiveRole(null);
    setToken(null);
    await deleteSecureItem(Config.STORAGE_KEYS.AUTH_TOKEN);
    await deleteSecureItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isLoading,
        token,
        login,
        loginAsDemoUser,
        switchRole,
        updateLanguage,
        logout,
        demoUsers: SEED_DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
