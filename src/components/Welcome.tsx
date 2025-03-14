import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

interface WelcomeProps {
  onComplete?: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  const [visible, setVisible] = useState(true);
  const { user } = useUser();
  const firstName = user?.firstName || 'there';

  useEffect(() => {
    // Automatically hide the welcome message after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md m-4 transform transition-all animate-scaleIn">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {firstName}!
          </h2>
          
          <p className="text-lg text-gray-600 mb-6">
            Thank you for subscribing. You now have full access to all the voice impersonation features.
          </p>
          
          <div className="text-sm text-gray-500">
            This message will disappear in a few seconds...
          </div>
        </div>
      </div>
    </div>
  );
}

// Add these animations to your CSS or index.css file:
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
// @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
// .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
// .animate-scaleIn { animation: scaleIn 0.3s ease-out; } 