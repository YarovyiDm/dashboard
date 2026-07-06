import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PullToRefresh } from './PullToRefresh';
import { LayoutDashboard, LogOut, FileText, Pen, QrCode, Briefcase, BarChart3, Users, ArrowLeft, Menu, X } from 'lucide-react';

const urokNav = [
  { to: '/urok', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
];

const krokyNav = [
  { to: '/kroky', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/kroky/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { to: '/kroky/resume', label: 'Resume', icon: <FileText className="w-4 h-4" /> },
  { to: '/kroky/signature', label: 'Signature', icon: <Pen className="w-4 h-4" /> },
  { to: '/kroky/qr', label: 'QR Code', icon: <QrCode className="w-4 h-4" /> },
  { to: '/kroky/tracker', label: 'Tracker', icon: <Briefcase className="w-4 h-4" /> },
  { to: '/kroky/engagement', label: 'Engagement', icon: <BarChart3 className="w-4 h-4" /> },
];

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isKroky = location.pathname.startsWith('/kroky');
  const isUrok = location.pathname.startsWith('/urok');
  const activeNav = isKroky ? krokyNav : isUrok ? urokNav : null;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-surface-card border-b border-border flex items-center gap-3 px-4">
        <button onClick={() => setOpen(true)} className="text-text-secondary hover:text-text-primary" aria-label="Open menu">
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="text-base font-bold text-text-primary">Dashboard</Link>
      </header>

      {/* Backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-56 bg-surface-card border-r border-border flex flex-col shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-text-primary hover:text-accent transition-colors">
            Dashboard
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-text-muted hover:text-text-primary" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {activeNav && (
            <>
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-2"
              >
                <ArrowLeft className="w-3 h-3" /> All Projects
              </Link>
              {activeNav.map(item => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {user && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 px-3 py-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-xs text-text-secondary truncate flex-1">
                {user.displayName || user.email}
              </span>
              <button onClick={logout} className="text-text-muted hover:text-red transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        <PullToRefresh className="h-full overflow-y-auto overscroll-y-contain p-4 pt-18 sm:p-6 lg:p-8 lg:pt-8">
          <Outlet />
        </PullToRefresh>
      </main>
    </div>
  );
}
