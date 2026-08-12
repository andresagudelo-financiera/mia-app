import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import NumeroDoradoV2Simulator from '@/components/simuladores/NumeroDoradoV2Simulator'
export const metadata: Metadata={title:'Número Dorado | Moneyflow',description:'Descubre el capital que necesitas y construye un plan para alcanzarlo.'}
export default function NumeroDoradoV2Page(){return <><Navbar variant="user"/><div className="pt-16"><NumeroDoradoV2Simulator/></div></>}
