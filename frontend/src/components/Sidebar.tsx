import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Inbox, CheckSquare, Settings, Zap } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox', icon: Inbox, label: 'Smart Inbox' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>LazyFlow</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: -2 }}>AI Assistant</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1 }}>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 500,
                color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                borderRight: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Local AI · Privacy-first
        </div>
      </div>
    </nav>
  );
}
