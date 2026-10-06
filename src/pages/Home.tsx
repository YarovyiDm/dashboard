import { LayoutGrid, LogOut, Footprints } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { KmetaMark } from '../components/KmetaMark';
import { useAuth } from '../hooks/useAuth';
import { useKrokyUsers, useKrokyPayments } from '../hooks/useKrokyData';
import { useKmetaUsers, useKmetaRevenue, isKmetaPro } from '../hooks/useKmetaData';
import { AnimatedNumber } from './kmeta/ui';
import { stagger, GOLD, TEAL } from './kmeta/theme';

function greeting(h: number) {
  if (h < 5) return 'Доброї ночі';
  if (h < 12) return 'Доброго ранку';
  if (h < 18) return 'Добрий день';
  return 'Добрий вечір';
}

export function Home() {
  const { user, logout } = useAuth();
  const { users } = useKrokyUsers();
  const { payments } = useKrokyPayments();
  const { users: kmetaUsers, connected: kmetaConnected } = useKmetaUsers();
  const { payments: kmetaPayments } = useKmetaRevenue(kmetaConnected);

  const approved = payments.filter(p => p.status === 'approved');
  const totalRevenue = approved.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const proCount = users.filter(u => u.isPro).length;
  const kmetaPro = kmetaUsers.filter(isKmetaPro).length;

  const now = new Date();
  const firstName = (user?.displayName || '').split(' ')[0];
  const date = now.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalUsers = users.length + (kmetaConnected ? kmetaUsers.length : 0);
  const totalPro = proCount + (kmetaConnected ? kmetaPro : 0);

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-[0.07]" style={{ background: GOLD }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-[max(16px,env(safe-area-inset-top))] pb-16">
        {/* Top bar */}
        <header className="k-fade flex items-center justify-between gap-3 h-16">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent text-[#1d1503] shadow-[0_6px_20px_-6px_var(--k-gold-glow)]">
              <LayoutGrid className="w-4.5 h-4.5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-text-primary">Dashboard</span>
          </div>
          {user && (
            <div className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-full bg-surface-card/80 border border-border">
              {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />}
              <span className="hidden sm:block text-sm font-medium text-text-secondary px-2 max-w-40 truncate">{user.displayName || user.email}</span>
              <button
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="k-chip grid place-items-center w-8 h-8 rounded-full text-text-muted hover:text-red hover:bg-red/10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Hero */}
        <section className="pt-8 sm:pt-14 pb-8 sm:pb-10">
          <div className="k-rise text-xs font-semibold uppercase tracking-[0.18em] text-accent mb-3 first-letter:uppercase" style={stagger(0)}>
            {date}
          </div>
          <h1 className="k-rise text-[34px] sm:text-5xl font-extrabold tracking-tight text-text-primary leading-[1.05]" style={stagger(1)}>
            {greeting(now.getHours())}{firstName ? <>,<br className="sm:hidden" /> <span className="text-accent">{firstName}</span></> : ''}
          </h1>
          <div className="k-rise flex flex-wrap items-center gap-2 mt-5" style={stagger(2)}>
            {[
              ['Проєкти', 2],
              ['Користувачі', totalUsers],
              ['Pro', totalPro],
            ].map(([label, v]) => (
              <span key={label} className="inline-flex items-baseline gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-card border border-border text-sm">
                <span className="font-extrabold text-text-primary"><AnimatedNumber value={v as number} /></span>
                <span className="text-text-muted">{label}</span>
              </span>
            ))}
          </div>
        </section>

        <div className="k-rise flex items-center gap-3 mb-4" style={stagger(3)}>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted shrink-0">Projects</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ProjectCard
            i={4}
            id="kmeta"
            name="Kmeta"
            description="Platform for tutors"
            accent={GOLD}
            mark={<KmetaMark className="w-7 h-7" />}
            stats={[
              { label: 'Users', value: kmetaConnected ? kmetaUsers.length : '—' },
              { label: 'Pro', value: kmetaConnected ? kmetaPro : '—' },
              // Every payment (new + auto-renewals), not unique payers.
              { label: 'Payments', value: kmetaPayments ? kmetaPayments.length : '—' },
            ]}
          />
          <ProjectCard
            i={5}
            id="kroky"
            name="Kroky"
            description="Resume builder, email signatures, job tracker"
            accent={TEAL}
            mark={<Footprints className="w-6 h-6" style={{ color: TEAL }} />}
            stats={[
              { label: 'Users', value: users.length },
              { label: 'Revenue', value: totalRevenue, suffix: 'UAH' },
              { label: 'Pro', value: proCount },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
