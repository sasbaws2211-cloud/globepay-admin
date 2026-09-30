import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import type { AdminStuckCard } from './types';
import StuckCards from './pages/StuckCards';
import { Spinner } from './ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Transactions from './pages/Transactions';
import AuditLog from './pages/AuditLog';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/users', label: 'Users & KYC', icon: '◉' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/cards', label: 'Stuck cards', icon: '▭' },
  { to: '/audit', label: 'Audit log', icon: '☰' },
];

function Shell() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [stuckCards, setStuckCards] = useState(0);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  // Re-counted on every navigation, so the badge clears once cards are handled.
  useEffect(() => {
    api<AdminStuckCard[]>('/admin/cards/stuck')
      .then((cards) => setStuckCards(cards.filter((c) => c.status === 'delivery_failed').length))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">G</span>
          <div>
            <div className="brand-name">GlobePay</div>
            <div className="brand-sub">Admin console</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              {n.label}
              {n.to === '/cards' && stuckCards > 0 && (
                <span className="nav-count" aria-label={`${stuckCards} stuck`}>
                  {stuckCards}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{me?.full_name}</div>
            <div className="who-phone">{me?.phone_number}</div>
          </div>
          <button className="btn btn-sidebar" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <span className="topbar-title">GlobePay Admin</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { me, checking } = useAuth();
  if (checking) return <Spinner label="Loading…" />;
  if (!me) return <Login />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="cards" element={<StuckCards />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
