import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'ELEVE Trading Dashboard v4.3',
  description: 'Plataforma de trading automatizado con 6 estrategias activas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Sidebar />
        <main className="md:ml-64 p-3 md:p-4 pt-16 md:pt-4 min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}
