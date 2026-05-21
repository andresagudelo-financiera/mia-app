import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import AcademyAuthGate from '@/components/academy/AcademyAuthGate'
import AcademyComingSoon from '@/components/academy/AcademyComingSoon'
import { isAcademyEnabled } from '@/lib/feature-flags'
import DiplomaViewer from '@/components/academy/DiplomaViewer'

export const metadata: Metadata = { title: 'Diploma', description: 'Diploma emitido por Academia Financieramente.' }

export default function DiplomaPage({ params }: { params: { verificationCode: string } }) {
  if (!isAcademyEnabled()) return <><Navbar variant="user" /><main className="min-h-screen bg-mia-black px-4 pb-16 pt-24 sm:px-6 lg:px-8"><AcademyComingSoon /></main><Footer /></>

  return <><Navbar variant="user" /><main className="min-h-screen bg-mia-black px-4 pb-16 pt-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><AcademyAuthGate><DiplomaViewer verificationCode={params.verificationCode} /></AcademyAuthGate></div></main><Footer /></>
}
