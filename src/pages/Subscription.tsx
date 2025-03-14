import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useStripe } from '../contexts/StripeContext';

// Add logging utility
const log = {
  info: (msg: string, data?: any) => console.log(`[Subscription] INFO: ${msg}`, data || ''),
  error: (msg: string, err?: any) => console.error(`[Subscription] ERROR: ${msg}`, err || ''),
  debug: (msg: string, data?: any) => console.log(`[Subscription] DEBUG: ${msg}`, data || '')
};

export function SubscriptionPage() {
  const { isSubscribed } = useSubscription();
  const { createCheckoutSession } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already subscribed
  useEffect(() => {
    if (isSubscribed) {
      log.info('User already has active subscription, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isSubscribed, navigate]);

  const handleSubscribe = async () => {
    log.info('Subscribe button clicked');
    setIsLoading(true);
    
    try {
      log.debug('Requesting checkout session from Stripe');
      const checkoutUrl = await createCheckoutSession();
      
      if (checkoutUrl) {
        log.info('Redirecting to Stripe Checkout', { 
          url: checkoutUrl.substring(0, 50) + '...' 
        });
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session - no URL returned');
      }
    } catch (error) {
      log.error('Subscription error', error);
      alert('There was an error creating your subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Subscribe to Access
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Pro Plan</h2>
          <p className="text-blue-700 mb-2">Full access to voice impersonation features</p>
          <ul className="text-blue-600 space-y-1 mb-4">
            <li>• Access to all training modules</li>
            <li>• Premium voice personality library</li>
            <li>• Advanced audio visualizations</li>
          </ul>
          <p className="text-xl font-bold text-blue-900">$5.00/month</p>
        </div>
        
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </button>
        
        <p className="text-sm text-gray-500 text-center mt-4">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
} 