import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <main className="w-screen">
        {children}
      </main>
    </div>
  )
} 