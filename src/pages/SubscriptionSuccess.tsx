import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

export function SubscriptionSuccess() {
  const [countdown, setCountdown] = useState(5);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { checkSubscription } = useSubscription();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Set the "just subscribed" flag for welcome message
    sessionStorage.setItem('justSubscribed', 'true');
    
    // Check subscription status
    checkSubscription();
    
    console.log(`Subscription successful! Session ID: ${sessionId}`);
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [checkSubscription, navigate, sessionId]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Subscription Activated!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for subscribing. You now have full access to all features.
        </p>
        
        <p className="text-sm text-gray-500">
          Redirecting to dashboard in {countdown} seconds...
        </p>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  );
} 