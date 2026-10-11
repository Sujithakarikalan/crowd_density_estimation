import { NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export default function Navbar({ online, checking }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">
          <ShieldCheck size={20} />
        </div>
        <div>
          <b>CrowdSafe AI</b>
          <span>Smart-city crowd intelligence</span>
        </div>
      </div>
      <nav className="nav">
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/model">Model</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      <div className={`status-pill ${online ? 'on' : checking ? 'wait' : 'off'}`}>
        <span />
        {online ? 'AI Model Online' : checking ? 'Checking backend…' : 'Backend Offline'}
      </div>
    </header>
  )
}
