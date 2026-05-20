import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import AcademyAuthGate from '@/components/academy/AcademyAuthGate'
import AcademyHome from '@/components/academy/AcademyHome'

export const metadata: Metadata = { title: 'Academia', description: 'Cursos, lives y roadmaps financieros de Moneyflow by MIA.' }

export default function AcademiaPage() {
  return <><Navbar variant="user" /><main className="min-h-screen bg-mia-black px-4 pb-16 pt-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><AcademyAuthGate><AcademyHome /></AcademyAuthGate></div></main><Footer /></>
}
