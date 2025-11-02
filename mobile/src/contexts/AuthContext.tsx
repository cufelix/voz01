import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'react-native';
import { firebaseAuth } from '../services/firebase';
import { getUserDocument } from '../services/firebase';
import { User as UserType } from '@shared/types';

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUserDocument(firebaseUser.uid);
          if (userData) {
            setUser(userData as UserType);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (firebaseUser: User) => {
    try {
      const userData = await getUserDocument(firebaseUser.uid);
      if (userData) {
        setUser(userData as UserType);
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseAuth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const userData = await getUserDocument(user.uid);
        if (userData) {
          setUser(userData as UserType);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};