import { useMemo, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, Crown, GraduationCap, Layers, BookOpen, CreditCard } from 'lucide-react';
import { useKmetaUsers, useKmetaTutorCounts, isKmetaPro, planBadgeClass } from '../../hooks/useKmetaData';
import { toJsDate } from '../../lib/date';

const DAY = 24 * 60 * 60 * 1000;

function fmtDate(v: unknown) {
  const d = toJsDate(v);
  return d ? d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}
function fmtDateTime(v: unknown) {
  const d = toJsDate(v);
  return d ? d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 min-h-[40px] gap-4">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className="text-sm text-text-primary text-right break-all">{value}</span>
    </div>
  );
}

export function KmetaUserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, loading: countsLoading, available: countsAvailable } = useKmetaTutorCounts(uid, connected);

  const user = useMemo(() => users.find(u => u.uid === uid), [users, uid]);

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Kmeta User</h1>
        <div className="bg-surface-card border border-border rounded-xl p-6 max-w-md">
          <p className="text-text-secondary mb-4">Підключи kmeta, щоб побачити дані тьютора.</p>
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" /> Підключити kmeta
          </button>
          {error && <p className="text-red text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-text-muted p-8">Loading...</div>;
  if (!user) {
    return (
      <div className="p-8">
        <Link to="/kmeta/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to users
        </Link>
        <div className="text-text-muted">Tutor not found</div>
      </div>
    );
  }

  const pro = isKmetaPro(user);
  const exp = toJsDate(user.proExpiresAt);
  const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / DAY) : null;
  const reminders = [user.remindBefore30 && '30 днів', user.remindBefore10 && '10 днів'].filter(Boolean).join(', ') || '—';
  const cnt = (n: number | undefined): ReactNode => (!countsAvailable ? '—' : counts ? (n ?? 0) : (countsLoading ? '…' : '—'));

  return (
    <div>
      <Link to="/kmeta/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="flex items-center gap-4 mb-6">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface-card border border-border flex items-center justify-center text-text-muted text-xl">
            {(user.name || user.email || '?')[0]}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-text-primary">{user.name || 'No name'}</h1>
          <div className="text-sm text-text-secondary">{user.email}</div>
          <div className="flex gap-2 mt-1.5 items-center">
            <span className={planBadgeClass(user.plan)}>{user.plan ?? 'free'}</span>
            {pro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber/15 text-amber rounded text-xs font-medium">
                <Crown className="w-3 h-3" /> Pro{daysLeft !== null ? ` — ${daysLeft}d left` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block title="General">
          <Row label="Registered" value={fmtDateTime(user.createdAt)} />
          <Row label="Specialization" value={user.specialization || '—'} />
          <Row label="Lesson duration" value={user.lessonDuration ? `${user.lessonDuration} min` : '—'} />
          <Row label="Reminders before" value={reminders} />
        </Block>

        <Block title="Subscription">
          <Row label="Plan" value={<span className={planBadgeClass(user.plan)}>{user.plan ?? 'free'}</span>} />
          <Row label="Pro status" value={pro ? <span className="text-amber">Active{daysLeft !== null ? ` — ${daysLeft}d left` : ''}</span> : <span className="text-text-muted">Inactive</span>} />
          <Row label="Pro expires" value={fmtDate(user.proExpiresAt)} />
          <Row label="Last payment" value={fmtDateTime(user.lastPaymentAt)} />
          <Row label="Auto-renew" value={user.autoRenew === undefined ? '—' : user.autoRenew ? 'Yes' : 'No'} />
          <Row label="Order ref" value={<span className="font-mono text-xs">{user.subscriptionOrderRef || '—'}</span>} />
        </Block>

        <Block title="Activity">
          <Row label={<span className="inline-flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Students</span>} value={cnt(counts?.students)} />
          <Row label={<span className="inline-flex items-center gap-2"><Layers className="w-4 h-4" /> Groups</span>} value={cnt(counts?.groups)} />
          <Row label={<span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Lessons</span>} value={cnt(counts?.lessons)} />
          <Row label={<span className="inline-flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payments</span>} value={cnt(counts?.payments)} />
        </Block>
      </div>

      <div className="mt-4 text-xs text-text-muted">
        UID: <span className="font-mono">{user.uid}</span>
      </div>
    </div>
  );
}
