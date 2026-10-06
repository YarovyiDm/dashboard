import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PullToRefresh } from './PullToRefresh';
import { KmetaMark, KrokyMark } from './BrandMarks';
import {
  LayoutDashboard, LogOut, FileText, Pen, QrCode, Briefcase, BarChart3, Users, ArrowLeft, X, Grid2x2, Menu,
} from 'lucide-react';

interface NavItem { to: string; label: string; icon: ReactNode }
interface Project {
  name: string;
  root: string;
  mark: ReactNode;
  nav: NavItem[];
  /** Items pinned to the mobile tab bar; the rest live behind "More". */
  tabs: string[];
}

const icon = (C: typeof Users) => <C className="w-4 h-4" />;

const PROJECTS: Record<'kmeta' | 'kroky', Project> = {
  kmeta: {
    name: 'kmeta',
    root: '/kmeta',
    mark: <KmetaMark />,
    nav: [
      { to: '/kmeta', label: 'Overview', icon: icon(LayoutDashboard) },
      { to: '/kmeta/users', label: 'Users', icon: icon(Users) },
    ],
    tabs: ['/kmeta', '/kmeta/users'],
  },
  kroky: {
    name: 'kroky',
    root: '/kroky',
    mark: <KrokyMark />,
    nav: [
      { to: '/kroky', label: 'Overview', icon: icon(LayoutDashboard) },
      { to: '/kroky/resume', label: 'Resume', icon: icon(FileText) },
      { to: '/kroky/users', label: 'Users', icon: icon(Users) },
      { to: '/kroky/signature', label: 'Signature', icon: icon(Pen) },
      { to: '/kroky/qr', label: 'QR Code', icon: icon(QrCode) },
      { to: '/kroky/tracker', label: 'Tracker', icon: icon(Briefcase) },
      { to: '/kroky/engagement', label: 'Engagement', icon: icon(BarChart3) },
    ],
    tabs: ['/kroky', '/kroky/resume', '/kroky/users'],
  },
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const path = location.pathname;
  const project = path.startsWith('/kroky') ? PROJECTS.kroky : path.startsWith('/kmeta') ? PROJECTS.kmeta : null;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [path]);

  // The shell owns scrolling, so start every page at the top instead of
  // inheriting the previous page's scroll offset.
  useEffect(() => { pageRef.current?.parentElement?.scrollTo(0, 0); }, [path]);

  const isActive = (to: string) => (project && to === project.root ? path === to : path.startsWith(to));

  // The projects page is a launcher: no sidebar, no top bar — it brings its own header.
  if (!project) {
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

  const tabs = project.nav.filter(n => project.tabs.includes(n.to));
  const moreActive = !tabs.some(t => isActive(t.to));
  const hasMore = project.nav.length > tabs.length;

  return (
    <div className="theme-pine flex h-full overflow-hidden">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 border-b border-border flex items-center gap-3 px-4 bg-surface/80 backdrop-blur-xl">
        <Link to={project.root} className="flex items-center gap-2 text-base font-extrabold tracking-tight text-text-primary">
          {project.mark} {project.name}
        </Link>
        {user?.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="ml-auto w-7 h-7 rounded-full ring-1 ring-border" />}
      </header>

      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar (drawer on mobile) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-surface-card border-r border-border flex flex-col shrink-0 transform transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to={project.root} className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-text-primary">
            {project.mark} {project.name}
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-text-muted hover:text-text-primary" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-accent transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> All projects
          </Link>
          {project.nav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.to)
                  ? 'bg-accent/12 text-accent font-semibold shadow-[inset_2px_0_0_var(--color-accent)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 px-2 py-1.5">
              {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />}
              <span className="text-xs text-text-secondary truncate flex-1">{user.displayName || user.email}</span>
              <button onClick={logout} className="k-chip p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/10" aria-label="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        <PullToRefresh className="h-full overflow-y-auto overscroll-y-contain p-4 pt-18 pb-28 sm:p-6 sm:pt-20 sm:pb-28 lg:p-8 lg:pt-8 lg:pb-10">
          {/* Keyed by route so each page fades in on navigation. */}
          <div ref={pageRef} key={path} className="k-fade">
            <Outlet />
          </div>
        </PullToRefresh>
      </main>

      {/* Mobile tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md flex items-center gap-1 p-1.5 rounded-2xl bg-surface-card/85 backdrop-blur-xl border border-border shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          {[{ to: '/', label: 'Projects', icon: <Grid2x2 className="w-4 h-4" /> }, ...tabs].map(item => (
            <TabLink key={item.to} to={item.to} label={item.label} icon={item.icon} active={item.to !== '/' && isActive(item.to)} />
          ))}
          {hasMore && (
            <button
              onClick={() => setOpen(true)}
              className={`k-chip flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold ${moreActive ? 'bg-accent text-[#1d1503] shadow-[0_6px_18px_-6px_var(--k-gold-glow)]' : 'text-text-muted'}`}
            >
              <Menu className="w-4 h-4" />
              More
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`k-chip flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold ${
        active ? 'bg-accent text-[#1d1503] shadow-[0_6px_18px_-6px_var(--k-gold-glow)]' : 'text-text-muted'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
