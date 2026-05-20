import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import AcademyAuthGate from '@/components/academy/AcademyAuthGate'
import CourseDetail from '@/components/academy/CourseDetail'

export const metadata: Metadata = { title: 'Curso', description: 'Detalle del curso en Academia Financieramente.' }

export default function CoursePage({ params }: { params: { slug: string } }) {
  return <><Navbar variant="user" /><main className="min-h-screen bg-mia-black px-4 pb-16 pt-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><AcademyAuthGate><CourseDetail slug={params.slug} /></AcademyAuthGate></div></main><Footer /></>
}
