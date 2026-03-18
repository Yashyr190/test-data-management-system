import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Database, FlaskConical, Play,
  ClipboardList, FileText, Activity, Zap
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/datasets', icon: Database, label: 'Datasets' },
  { to: '/testcases', icon: FlaskConical, label: 'Test Cases' },
  { to: '/execution', icon: Play, label: 'Live Execution' },
  { to: '/manual', icon: ClipboardList, label: 'Manual Testing' },
  { to: '/reports', icon: FileText, label: 'Reports' },
]

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #0a84ff, #bf5af2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>TDMS</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>Test Data Manager</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-quaternary)', padding: '0 8px', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Navigation
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 6px var(--accent-green)',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>API Connected</span>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
