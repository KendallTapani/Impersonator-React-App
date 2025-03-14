import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessToken {
  granted: boolean;
  expiresAt: number;
}

interface AuthContextType {
  hasAccess: boolean;
  isLoading: boolean;
  remainingDays: number;
  grantAccess: (durationDays?: number) => void;
  revokeAccess: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<AccessToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      try {
        const parsedToken = JSON.parse(savedToken) as AccessToken;
        if (parsedToken.granted && Date.now() < parsedToken.expiresAt) {
          setToken(parsedToken);
        } else {
          // Clear expired token
          localStorage.removeItem('access_token');
        }
      } catch (e) {
        localStorage.removeItem('access_token');
      }
    }
    setIsLoading(false);
  }, []);
  
  const grantAccess = (durationDays = 30) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    const newToken: AccessToken = {
      granted: true,
      expiresAt: expiryDate.getTime()
    };
    
    setToken(newToken);
    localStorage.setItem('access_token', JSON.stringify(newToken));
  };
  
  const revokeAccess = () => {
    setToken(null);
    localStorage.removeItem('access_token');
  };
  
  const getRemainingDays = (): number => {
    if (!token || !token.granted) return 0;
    
    const msRemaining = token.expiresAt - Date.now();
    return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  };
  
  return (
    <AuthContext.Provider value={{ 
      hasAccess: !!token?.granted && Date.now() < token.expiresAt,
      isLoading,
      remainingDays: getRemainingDays(),
      grantAccess,
      revokeAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 