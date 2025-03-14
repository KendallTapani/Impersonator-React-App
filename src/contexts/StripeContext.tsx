import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';

// Add logging utility
const log = {
  info: (msg: string, data?: any) => console.log(`[Stripe] INFO: ${msg}`, data || ''),
  error: (msg: string, err?: any) => console.error(`[Stripe] ERROR: ${msg}`, err || ''),
  debug: (msg: string, data?: any) => console.log(`[Stripe] DEBUG: ${msg}`, data || '')
};

// Define the context type
interface StripeContextType {
  createCheckoutSession: () => Promise<string | null>;
  openCustomerPortal: () => Promise<void>;
}

// Create context with default undefined value
const StripeContext = createContext<StripeContextType | undefined>(undefined);

// Provider component
export function StripeProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  
  // Create checkout session and redirect to Stripe
  const createCheckoutSession = async (): Promise<string | null> => {
    if (!userId) {
      log.error('Cannot create checkout session - no user ID available');
      return null;
    }
    
    try {
      log.info('Creating checkout session...', { userId });
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create checkout session: ${response.status} ${errorData.error || ''}`);
      }
      
      const { url } = await response.json();
      log.info('Checkout session created successfully', { url: url.substring(0, 50) + '...' });
      return url;
    } catch (error) {
      log.error('Error creating checkout session', error);
      return null;
    }
  };
  
  // Open customer portal for subscription management
  const openCustomerPortal = async (): Promise<void> => {
    if (!userId) {
      log.error('Cannot open customer portal - no user ID available');
      return;
    }
    
    try {
      log.info('Opening customer portal...', { userId });
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create portal session: ${response.status} ${errorData.error || ''}`);
      }
      
      const { url } = await response.json();
      log.info('Customer portal session created', { url: url.substring(0, 50) + '...' });
      window.location.href = url;
    } catch (error) {
      log.error('Error opening customer portal', error);
    }
  };
  
  return (
    <StripeContext.Provider value={{ createCheckoutSession, openCustomerPortal }}>
      {children}
    </StripeContext.Provider>
  );
}

// Custom hook to use the Stripe context
export function useStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
} 