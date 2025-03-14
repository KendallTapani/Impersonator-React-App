import React, { ReactNode } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { UserButton, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useStripe } from '../contexts/StripeContext'
// Auth-related imports removed for Clerk integration

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { userId } = useAuth();
  const { isSubscribed } = useSubscription();
  const { openCustomerPortal } = useStripe();
  
  // Style for nav links
  const navLinkStyle = "px-4 py-2 rounded-md border border-white text-white hover:bg-white hover:text-gray-800 transition-colors duration-200";
  const activeLinkStyle = "px-4 py-2 rounded-md bg-white text-gray-800 border border-white font-medium";
  const subscribeButtonStyle = "px-4 py-2 rounded-md bg-green-500 text-white border border-green-500 hover:bg-green-600 transition-colors duration-200 font-medium";
  const manageButtonStyle = "px-4 py-2 rounded-md bg-blue-500 text-white border border-blue-500 hover:bg-blue-600 transition-colors duration-200 font-medium";
  
  // Handle manage subscription button click
  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };
  
  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center px-6">
          <Link to="/" className="text-xl font-bold flex items-center">
            <span className="mr-2">🎤</span> Impersonator
          </Link>
          <nav className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={location.pathname === '/' ? activeLinkStyle : navLinkStyle}
            >
              Home
            </Link>
            
            <SignedIn>
              {/* Show these links only if user has active subscription */}
              {isSubscribed && (
                <>
                  <Link 
                    to="/dashboard" 
                    className={location.pathname === '/dashboard' ? activeLinkStyle : navLinkStyle}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/training" 
                    className={location.pathname === '/training' ? activeLinkStyle : navLinkStyle}
                  >
                    Training
                  </Link>
                  
                  {/* Add Manage Subscription button in the header */}
                  <button
                    onClick={handleManageSubscription}
                    className={manageButtonStyle}
                  >
                    Manage Subscription
                  </button>
                </>
              )}
              
              {/* Show subscribe button if user is signed in but doesn't have subscription */}
              {userId && !isSubscribed && (
                <Link 
                  to="/subscription" 
                  className={location.pathname === '/subscription' ? activeLinkStyle : subscribeButtonStyle}
                >
                  Subscribe Now
                </Link>
              )}
              
              <div className="ml-6 relative">
                <UserButton afterSignOutUrl="/" />
                <div className="mt-1 text-xs text-center">
                  <Link to="/" className="block text-blue-300 hover:text-white">Home</Link>
                </div>
              </div>
            </SignedIn>
            
            <SignedOut>
              <Link 
                to="/sign-in" 
                className={location.pathname === '/sign-in' ? activeLinkStyle : navLinkStyle}
              >
                Sign In
              </Link>
              <Link 
                to="/sign-up" 
                className={location.pathname === '/sign-up' ? activeLinkStyle : navLinkStyle}
              >
                Sign Up
              </Link>
            </SignedOut>
          </nav>
        </div>
      </header>
      <main className="w-screen">
        {children}
      </main>
    </div>
  )
} 