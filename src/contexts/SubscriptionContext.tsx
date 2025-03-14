import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

// Define the shape of our context
interface SubscriptionContextType {
  isSubscribed: boolean | null;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  mockSubscribe: () => Promise<boolean>;
}

// Create the context with a default undefined value
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// API base URL - using Vite's proxy
const API_BASE_URL = '/api';

// Provider component that wraps the app
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  
  // Function to check if user has an active subscription
  const checkSubscription = useCallback(async () => {
    if (!userId) {
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }
    
    // Skip rechecking if we already checked in the last 5 seconds
    const now = Date.now();
    if (lastChecked && now - lastChecked < 5000) {
      console.log('Skipping subscription check - checked recently');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Checking subscription status for user: ${userId}`);
      const response = await fetch(`${API_BASE_URL}/check-subscription/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error(`Server responded with status: ${response.status}`);
        throw new Error(`Failed to check subscription: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Subscription check response:', data);
      
      // Explicitly set to true or false based on the response
      setIsSubscribed(data.hasActiveSubscription === true);
      setLastChecked(now);
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, lastChecked]);
  
  // Function to create a mock subscription
  const mockSubscribe = async (): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      console.log(`Creating mock subscription for user: ${userId}`);
      const response = await fetch(`${API_BASE_URL}/mock-subscribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        console.error(`Server responded with status: ${response.status}`);
        throw new Error(`Failed to create subscription: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Mock subscription response:', data);
      
      if (data.success) {
        setIsSubscribed(true);
        setLastChecked(Date.now());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mock subscribe:', error);
      return false;
    }
  };
  
  // Check subscription when auth loads and we have a userId
  useEffect(() => {
    if (isAuthLoaded && userId) {
      checkSubscription();
    } else if (isAuthLoaded && !userId) {
      setIsLoading(false);
      setIsSubscribed(null);
    }
  }, [isAuthLoaded, userId, checkSubscription]);
  
  // Provide the subscription context to children
  return (
    <SubscriptionContext.Provider value={{ 
      isSubscribed, 
      isLoading, 
      checkSubscription, 
      mockSubscribe 
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Custom hook to use the subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
} 