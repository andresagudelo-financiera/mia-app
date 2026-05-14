import type { Metadata } from 'next'
import { Suspense } from 'react'
import Navbar from '@/components/landing/Navbar'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminShell from '@/components/admin/AdminShell'
import AuthProvider from '@/components/providers/AuthProvider'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Panel administrativo de MIA.',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar variant="minimal" />
      <AuthProvider>
        <Suspense fallback={<AdminLoadingFallback />}>
          <AdminGuard>
            <AdminShell>{children}</AdminShell>
          </AdminGuard>
        </Suspense>
      </AuthProvider>
    </>
  )
}

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-mia-black pt-16 flex items-center justify-center px-4">
      <div className="glass rounded-3xl border border-mia-border px-8 py-6 text-center text-neutral">
        Cargando admin...
      </div>
    </div>
  )
}
