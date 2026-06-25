import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, LogOut, FileText, Pen, QrCode, Briefcase, BarChart3, Users, ArrowLeft } from 'lucide-react';

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
  const isKroky = location.pathname.startsWith('/kroky');
  const isUrok = location.pathname.startsWith('/urok');
  const activeNav = isKroky ? krokyNav : isUrok ? urokNav : null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Link to="/" className="text-lg font-bold text-text-primary hover:text-accent transition-colors">
            Dashboard
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
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
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
