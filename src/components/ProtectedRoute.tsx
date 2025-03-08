import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasAccess, isLoading } = useAuth();
  
  // Show loading state while checking token
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to access page if no valid token
  if (!hasAccess) {
    return <Navigate to="/access" replace />;
  }
  
  // Render children if token is valid
  return <>{children}</>;
} 