import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PullToRefresh } from './PullToRefresh';
import { KmetaMark } from './KmetaMark';
import { LayoutDashboard, LogOut, FileText, Pen, QrCode, Briefcase, BarChart3, Users, ArrowLeft, Menu, X, Grid2x2 } from 'lucide-react';

const kmetaNav = [
  { to: '/kmeta', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/kmeta/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
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
  const pageRef = useRef<HTMLDivElement>(null);
  const isKroky = location.pathname.startsWith('/kroky');
  const isKmeta = location.pathname.startsWith('/kmeta');
  const isHome = location.pathname === '/';
  const activeNav = isKroky ? krokyNav : isKmeta ? kmetaNav : null;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // The shell owns scrolling, so start every page at the top instead of
  // inheriting the previous page's scroll offset.
  useEffect(() => { pageRef.current?.parentElement?.scrollTo(0, 0); }, [location.pathname]);

  // Match the browser / PWA status bar to the kmeta theme.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isKmeta || isHome ? '#081113' : '#0f1117');
  }, [isKmeta, isHome]);

  const isActive = (to: string) =>
    to === '/kmeta' || to === '/kroky' ? location.pathname === to : location.pathname.startsWith(to);

  // The projects page is a launcher: no sidebar, no top bar — it brings its own header.
  if (isHome) {
    return (
      <div className="theme-pine h-full overflow-hidden">
        <PullToRefresh className="h-full overflow-y-auto overscroll-y-contain">
          <div ref={pageRef} className="k-fade min-h-full">
            <Outlet />
          </div>
        </PullToRefresh>
      </div>
    );
  }

  return (
    <div className={`flex h-full overflow-hidden ${isKmeta ? 'theme-pine' : ''}`}>
      {/* Mobile top bar */}
      <header className={`lg:hidden fixed top-0 inset-x-0 z-30 h-14 border-b border-border flex items-center gap-3 px-4 ${isKmeta ? 'bg-surface/80 backdrop-blur-xl' : 'bg-surface-card'}`}>
        <button onClick={() => setOpen(true)} className="text-text-secondary hover:text-text-primary" aria-label="Open menu">
          <Menu className="w-6 h-6" />
        </button>
        {isKmeta ? (
          <Link to="/kmeta" className="flex items-center gap-2 text-base font-extrabold tracking-tight text-text-primary">
            <KmetaMark /> kmeta
          </Link>
        ) : (
          <Link to="/" className="text-base font-bold text-text-primary">Dashboard</Link>
        )}
        {isKmeta && user?.photoURL && <img src={user.photoURL} alt="" className="ml-auto w-7 h-7 rounded-full ring-1 ring-border" />}
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
          {isKmeta ? (
            <Link to="/kmeta" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-text-primary">
              <KmetaMark /> kmeta
            </Link>
          ) : (
            <Link to="/" className="text-lg font-bold text-text-primary hover:text-accent transition-colors">
              Dashboard
            </Link>
          )}
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
                const active = isKmeta ? isActive(item.to) : location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? isKmeta
                          ? 'bg-accent/12 text-accent font-semibold shadow-[inset_2px_0_0_var(--color-accent)]'
                          : 'bg-accent/10 text-accent'
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
        <PullToRefresh className={`h-full overflow-y-auto overscroll-y-contain p-4 pt-18 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 ${isKmeta ? 'pb-28 lg:pb-10' : ''}`}>
          {/* Keyed by route so each kmeta page fades in on navigation. */}
          <div ref={pageRef} key={isKmeta ? location.pathname : undefined} className={isKmeta ? 'k-fade' : undefined}>
            <Outlet />
          </div>
        </PullToRefresh>
      </main>

      {/* kmeta mobile tab bar */}
      {isKmeta && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
          <div className="pointer-events-auto mx-auto max-w-sm flex items-center gap-1 p-1.5 rounded-2xl bg-surface-card/85 backdrop-blur-xl border border-border shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
            {[{ to: '/', label: 'Projects', icon: <Grid2x2 className="w-4 h-4" /> }, ...kmetaNav].map(item => {
              const active = item.to !== '/' && isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`k-chip flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold ${
                    active ? 'bg-accent text-[#1d1503] shadow-[0_6px_18px_-6px_var(--k-gold-glow)]' : 'text-text-muted'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
