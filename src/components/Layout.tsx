import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="bg-white px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Voice Impersonator Trainer</h1>
      </header>
      <main className="w-screen">
        {children}
      </main>
    </div>
  )
} 