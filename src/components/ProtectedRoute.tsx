import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireSubscription = false 
}: ProtectedRouteProps) {
  const { isLoaded, userId } = useAuth();
  const { isSubscribed, isLoading, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  
  // Force a subscription check whenever this component is mounted
  useEffect(() => {
    if (isLoaded && userId && requireSubscription) {
      // Re-check subscription status to ensure it's up-to-date
      checkSubscription();
    }
  }, [isLoaded, userId, requireSubscription, checkSubscription]);
  
  // Show loading spinner when auth or subscription is loading
  if (!isLoaded || (requireSubscription && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Redirect to sign-in if not authenticated
  if (!userId) {
    console.log('User not authenticated, redirecting to sign-in');
    return <Navigate to="/sign-in" replace />;
  }
  
  // Redirect to subscription page if subscription is required but not active
  if (requireSubscription && isSubscribed === false) {
    console.log('Subscription required but not active, redirecting to subscription page');
    return <Navigate to="/subscription" replace />;
  }
  
  // If all checks pass, render the children
  return <>{children}</>;
} 