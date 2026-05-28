import { Routes, Route } from 'react-router'
import Header from '@/components/layout/Header'
import Home from '@/pages/Home'
import Tutorial from '@/pages/Tutorial'
import GateLab from '@/pages/GateLab'
import TimelineLab from '@/pages/TimelineLab'
import Protocols from '@/pages/Protocols'

export default function App() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/lab" element={<GateLab />} />
          <Route path="/timeline" element={<TimelineLab />} />
          <Route path="/protocols" element={<Protocols />} />
        </Routes>
      </main>
    </div>
  )
}
