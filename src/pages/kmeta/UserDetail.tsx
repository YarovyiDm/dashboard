import { useMemo, useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, GraduationCap, Layers, BookOpen, CreditCard, ExternalLink, Flag } from 'lucide-react';
import {
  useKmetaUsers, useKmetaTutorCounts, useKmetaTutorSubscriptions, kmetaEffectiveStatus,
  KMETA_STATUS_LABEL, statusBadgeClass, useKmetaTutorPublicProfile, useKmetaTutorBookingRequests,
  useKmetaTutorReports, type KmetaPageReport, type KmetaPublicProfile,
} from '../../hooks/useKmetaData';
import { toJsDate } from '../../lib/date';

const SITE = 'https://kmeta.com.ua';

const REASON_LABEL: Record<string, string> = {
  fake: 'Fake / impersonation',
  abuse: 'Abuse / threats',
  adult: 'Adult / violent',
  spam: 'Spam / scam',
  privacy: "Someone's private data",
  cheating: 'Cheating',
  other: 'Other',
};

const REPORT_STATUS_TONE: Record<string, string> = {
  new: 'bg-red/15 text-red',
  reviewed: 'bg-blue/15 text-blue',
  dismissed: 'bg-surface-hover text-text-muted',
  actioned: 'bg-amber/15 text-amber',
};

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

function SnapshotView({ snap }: { snap: KmetaPublicProfile }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-surface border border-border text-sm">
      <div className="flex items-center gap-3 mb-2">
        {snap.photo && <img src={snap.photo} alt="" className="w-12 h-12 rounded-full object-cover" />}
        <div>
          <div className="text-text-primary font-medium">{snap.name || '—'}</div>
          {(snap.city || snap.format) && <div className="text-xs text-text-muted">{[snap.city, snap.format].filter(Boolean).join(' · ')}</div>}
        </div>
      </div>
      {snap.subjects && snap.subjects.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {snap.subjects.map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary text-xs">{s}</span>)}
        </div>
      )}
      {snap.bio && <div className="text-text-secondary mb-2 whitespace-pre-wrap">{snap.bio}</div>}
      {(snap.price !== undefined || snap.trialPrice !== undefined) && (
        <div className="text-xs text-text-muted mb-1">Price: {snap.price ?? '—'} {snap.currency || ''} · Trial: {snap.trialPrice ?? '—'} {snap.currency || ''}</div>
      )}
      {snap.socials && Object.keys(snap.socials).length > 0 && (
        <div className="text-xs text-text-muted mb-1 break-all">Socials: {Object.entries(snap.socials).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
      )}
      {snap.links && snap.links.length > 0 && (
        <div className="text-xs text-text-muted break-all">Links: {snap.links.map(l => l.label || l.url).join(' · ')}</div>
      )}
    </div>
  );
}

function ReportCard({ report, onSetStatus }: { report: KmetaPageReport; onSetStatus: (id: string, status: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const status = report.status || 'new';
  const act = async (s: string) => {
    if (!report.id || saving) return;
    setSaving(true);
    try { await onSetStatus(report.id, s); } finally { setSaving(false); }
  };
  return (
    <div className="px-5 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${REPORT_STATUS_TONE[status] ?? 'bg-surface-hover text-text-muted'}`}>{status}</span>
          <span className="text-sm text-text-primary">{REASON_LABEL[report.reason ?? 'other'] ?? report.reason}</span>
          <span className="text-xs text-text-muted">{fmtDateTime(report.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {report.snapshot && (
            <button onClick={() => setOpen(o => !o)} className="text-xs text-text-muted hover:text-text-primary transition-colors">
              {open ? 'Hide snapshot' : 'Snapshot'}
            </button>
          )}
          {(['reviewed', 'dismissed', 'actioned'] as const).map(s => (
            <button
              key={s}
              disabled={saving || status === s}
              onClick={() => act(s)}
              className="text-xs px-2 py-0.5 rounded border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {report.details && <div className="text-sm text-text-secondary mt-1.5 whitespace-pre-wrap">{report.details}</div>}
      {report.contact && <div className="text-xs text-text-muted mt-1">Reporter: {report.contact}</div>}
      {open && report.snapshot && <SnapshotView snap={report.snapshot} />}
    </div>
  );
}

export function KmetaUserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { counts, loading: countsLoading, available: countsAvailable } = useKmetaTutorCounts(uid, connected);
  const { payments: subs } = useKmetaTutorSubscriptions(uid, connected);

  const user = useMemo(() => users.find(u => u.uid === uid), [users, uid]);
  const { profile } = useKmetaTutorPublicProfile(user?.publicSlug, connected);
  const { requests } = useKmetaTutorBookingRequests(uid, connected);
  const { reports, setStatus } = useKmetaTutorReports(uid, connected);

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

  const status = kmetaEffectiveStatus(user);
  const exp = toJsDate(user.proExpiresAt);
  const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / DAY) : null;
  const reminders = [user.remindBefore30 && '30 днів', user.remindBefore10 && '10 днів'].filter(Boolean).join(', ') || '—';
  const cnt = (n: number | undefined): ReactNode => (!countsAvailable ? '—' : counts ? (n ?? 0) : (countsLoading ? '…' : '—'));

  const pageUrl = user.publicSlug ? `${SITE}/t/${user.publicSlug}` : null;
  const req = { total: (requests ?? []).length, new: 0, accepted: 0, declined: 0 };
  (requests ?? []).forEach(r => {
    if (r.status === 'new') req.new++;
    else if (r.status === 'accepted') req.accepted++;
    else if (r.status === 'declined') req.declined++;
  });
  const newReports = (reports ?? []).filter(r => (r.status || 'new') === 'new').length;

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
            <span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span>
            {daysLeft !== null && daysLeft > 0 && (status === 'pro' || status === 'pro_ending') && (
              <span className="text-xs text-text-muted">{daysLeft}d left</span>
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
          <Row label="Status" value={<span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span>} />
          <Row label="Raw plan" value={user.plan ?? 'free'} />
          <Row label="Pro expires" value={daysLeft !== null && daysLeft > 0 ? `${fmtDate(user.proExpiresAt)} · ${daysLeft}d` : fmtDate(user.proExpiresAt)} />
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

        <Block title="Public page">
          {pageUrl ? (
            <>
              <Row
                label="Link"
                value={
                  <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                    /t/{user.publicSlug} <ExternalLink className="w-3 h-3" />
                  </a>
                }
              />
              <Row
                label="Status"
                value={profile ? (profile.enabled ? <span className="text-green">Published</span> : <span className="text-text-muted">Switched off</span>) : '—'}
              />
              {profile?.subjects && profile.subjects.length > 0 && <Row label="Subjects" value={profile.subjects.join(', ')} />}
              {profile?.price !== undefined && <Row label="Price" value={`${profile.price} ${profile.currency || ''}`} />}
            </>
          ) : (
            <Row label="Page" value="No page" />
          )}
        </Block>
      </div>

      {subs && subs.length > 0 && (
        <div className="mt-4">
          <Block title={`Subscription payments (${subs.length})`}>
            {subs.map((p, i) => (
              <Row
                key={p.orderReference || i}
                label={
                  <span>
                    {fmtDate(p.createdAt)}
                    <span className="text-text-muted ml-2">{p.isRenewal ? 'renewal' : 'new'}</span>
                  </span>
                }
                value={<span className="text-green">{Number(p.amount) || 0} {p.currency || 'UAH'}</span>}
              />
            ))}
          </Block>
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="mt-4">
          <Block title={`Booking requests (${req.total})`}>
            <div className="px-5 py-3 flex flex-wrap gap-x-8 gap-y-3">
              <div><div className="text-lg font-semibold text-blue">{req.new}</div><div className="text-xs text-text-muted">New</div></div>
              <div><div className="text-lg font-semibold text-green">{req.accepted}</div><div className="text-xs text-text-muted">Accepted</div></div>
              <div><div className="text-lg font-semibold text-text-muted">{req.declined}</div><div className="text-xs text-text-muted">Declined</div></div>
            </div>
          </Block>
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="mt-4">
          <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Flag className="w-4 h-4 text-text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Page reports ({reports.length})</h2>
              {newReports > 0 && <span className="px-1.5 py-0.5 bg-red/15 text-red rounded text-xs font-medium">{newReports} new</span>}
            </div>
            <div className="divide-y divide-border">
              {reports.map(r => <ReportCard key={r.id} report={r} onSetStatus={setStatus} />)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-text-muted">
        UID: <span className="font-mono">{user.uid}</span>
      </div>
    </div>
  );
}
