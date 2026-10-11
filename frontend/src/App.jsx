import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Model from './pages/Model'
import { getHealth } from './services/api'

export default function App() {
  const [online, setOnline] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        const health = await getHealth()
        if (!cancelled) {
          setOnline(Boolean(health?.model_loaded) && health?.status === 'ok')
        }
      } catch {
        if (!cancelled) setOnline(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    ping()
    const timer = setInterval(ping, 8000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="app-shell">
      <Navbar online={online} checking={checking} />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard online={online} />} />
          <Route path="/model" element={<Model />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer>
        <span>CrowdSafe AI</span>
        <span>AI decision support • Not a replacement for trained safety personnel</span>
      </footer>
    </div>
  )
}
