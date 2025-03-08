import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AccessHeader } from './AccessHeader'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { hasAccess } = useAuth();
  const location = useLocation();
  
  // Don't show header on home or access page
  const showAccessHeader = hasAccess && 
    location.pathname !== '/' && 
    location.pathname !== '/access';
  
  return (
    <div className="min-h-screen">
      {showAccessHeader && <AccessHeader />}
      <main className="w-screen">
        {children}
      </main>
    </div>
  )
} 