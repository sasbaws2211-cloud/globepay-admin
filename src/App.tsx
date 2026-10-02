import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import type { StuckTransaction } from './types';
import { Spinner } from './ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import StuckPayments from './pages/StuckPayments';
import AuditLog from './pages/AuditLog';

// Only pages backed by endpoints the deployed backend has. The Transactions
// page and richer dashboard live in git history (commit a316976) until the
// backend with /admin/dashboard, /admin/transactions, /admin/cards/stuck ships.
const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/users', label: 'Users & KYC', icon: '◉' },
  { to: '/stuck', label: 'Stuck payments', icon: '▭' },
  { to: '/audit', label: 'Audit log', icon: '☰' },
];

function Shell() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [stuckCount, setStuckCount] = useState(0);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  // Re-counted on every navigation, so the badge clears once they're handled.
  useEffect(() => {
    api<StuckTransaction[]>('/admin/stuck-transactions')
      .then((rows) => setStuckCount(rows.length))
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
              {n.to === '/stuck' && stuckCount > 0 && (
                <span className="nav-count" aria-label={`${stuckCount} stuck`}>
                  {stuckCount}
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
        <Route path="stuck" element={<StuckPayments />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
