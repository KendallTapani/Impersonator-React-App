import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Training } from './pages/Training'
import { Dashboard } from './pages/Dashboard'
import { Person } from './pages/Person'
import { SignInPage } from './pages/SignIn'
import { SignUpPage } from './pages/SignUp'
import { NotFound } from './pages/NotFound'
import { SubscriptionPage } from './pages/Subscription'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { StripeProvider } from './contexts/StripeContext'
import { SubscriptionSuccess } from './pages/SubscriptionSuccess'

const queryClient = new QueryClient()

// Get the Clerk publishable key from environment variable
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  if (!clerkPubKey) {
    console.error("Missing Clerk publishable key!");
    return <div>Error: Missing Clerk publishable key</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <SubscriptionProvider>
        <StripeProvider>
          <QueryClientProvider client={queryClient}>
            <Router>
              <Layout>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/sign-in/*" element={<SignInPage />} />
                  <Route path="/sign-up/*" element={<SignUpPage />} />
                  
                  {/* Protected route that doesn't require subscription */}
                  <Route 
                    path="/subscription" 
                    element={
                      <ProtectedRoute>
                        <SubscriptionPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Subscription success route */}
                  <Route 
                    path="/subscription-success" 
                    element={
                      <ProtectedRoute>
                        <SubscriptionSuccess />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Protected routes that require subscription */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute requireSubscription>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/training" 
                    element={
                      <ProtectedRoute requireSubscription>
                        <Training />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/person/:personId" 
                    element={
                      <ProtectedRoute requireSubscription>
                        <Person />
                      </ProtectedRoute>
                    } 
                  />

                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </Router>
          </QueryClientProvider>
        </StripeProvider>
      </SubscriptionProvider>
    </ClerkProvider>
  )
}

export default App
