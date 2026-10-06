import { useMemo, useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, Layers, BookOpen, CreditCard, ExternalLink, Flag, Info, Crown, Activity, Globe, Megaphone,
  Receipt, Tag, Calendar, Copy, Check,
} from 'lucide-react';
import {
  useKmetaUsers, useKmetaTutorCounts, useKmetaTutorSubscriptions, kmetaEffectiveStatus,
  KMETA_STATUS_LABEL, statusBadgeClass, useKmetaTutorPublicProfile, useKmetaTutorBookingRequests,
  useKmetaTutorReports, kmetaAcquisitionChannel, KMETA_CHANNEL_LABEL,
  type KmetaPageReport, type KmetaPublicProfile,
} from '../../hooks/useKmetaData';
import { toJsDate } from '../../lib/date';
import { ConnectGate, LoadingSkeleton, Avatar, Panel, StackBar, AnimatedNumber } from './ui';
import { stagger } from './theme';

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
  actioned: 'bg-accent/15 text-accent',
};

const DAY = 24 * 60 * 60 * 1000;

// Visited within the last week (kept outside render for the purity lint).
function isRecent(d: Date | null) {
  return d ? Date.now() - d.getTime() < 7 * DAY : false;
}

function fmtDate(v: unknown) {
  const d = toJsDate(v);
  return d ? d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}
function fmtDateTime(v: unknown) {
  const d = toJsDate(v);
  return d ? d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function Block({ title, icon, right, i = 0, children }: { title: string; icon?: ReactNode; right?: ReactNode; i?: number; children: ReactNode }) {
  return (
    <Panel pad={false} i={i} title={title} icon={icon} right={right}>
      <div className="divide-y divide-border/60">{children}</div>
    </Panel>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 min-h-[42px] gap-4">
      <span className="text-sm text-text-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right break-all">{value}</span>
    </div>
  );
}

function CopyUid({ uid }: { uid: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(uid).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }); }}
      className="k-chip inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
    >
      UID: <span className="font-mono">{uid}</span>
      {done ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SnapshotView({ snap }: { snap: KmetaPublicProfile }) {
  return (
    <div className="k-fade mt-3 p-3 rounded-xl bg-surface border border-border text-sm">
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
    <div className="px-4 sm:px-5 py-3.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${REPORT_STATUS_TONE[status] ?? 'bg-surface-hover text-text-muted'}`}>{status}</span>
          <span className="text-sm text-text-primary">{REASON_LABEL[report.reason ?? 'other'] ?? report.reason}</span>
          <span className="text-xs text-text-muted">{fmtDateTime(report.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {report.snapshot && (
            <button onClick={() => setOpen(o => !o)} className="k-chip text-xs font-semibold text-accent hover:text-accent-light px-1">
              {open ? 'Hide snapshot' : 'Snapshot'}
            </button>
          )}
          {(['reviewed', 'dismissed', 'actioned'] as const).map(s => (
            <button
              key={s}
              disabled={saving || status === s}
              onClick={() => act(s)}
              className="k-chip text-xs font-semibold px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-accent/40 hover:text-accent disabled:opacity-35 disabled:pointer-events-none"
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

  if (!connected) return <ConnectGate title="Tutor" error={error} onConnect={connect} text="Підключи kmeta, щоб побачити дані тьютора." />;
  if (loading) return <LoadingSkeleton rows={2} />;
  if (!user) {
    return (
      <div className="k-fade">
        <Link to="/kmeta/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to users
        </Link>
        <div className="k-card p-8 text-text-muted">Tutor not found</div>
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
  const a = user.acquisition;
  const channel = kmetaAcquisitionChannel(user);

  const srcMap = new Map<string, { label: string; visits: number; requests: number; accepted: number }>();
  (user.bookingSources ?? []).forEach(s => { srcMap.set(s.id, { label: s.label || s.id, visits: 0, requests: 0, accepted: 0 }); });
  if (user.bookingVisits) {
    Object.values(user.bookingVisits).forEach(bs => Object.entries(bs).forEach(([src, v]) => {
      const e = srcMap.get(src) || { label: src, visits: 0, requests: 0, accepted: 0 };
      e.visits += Number(v) || 0;
      srcMap.set(src, e);
    }));
  }
  (requests ?? []).forEach(r => {
    const src = r.source || 'direct';
    const e = srcMap.get(src) || { label: src, visits: 0, requests: 0, accepted: 0 };
    e.requests++;
    if (r.status === 'accepted') e.accepted++;
    srcMap.set(src, e);
  });
  const srcRows = [...srcMap.entries()].map(([src, v]) => ({ src, ...v })).sort((x, y) => y.visits - x.visits || y.requests - x.requests);

  const isPro = status === 'pro' || status === 'pro_ending';
  const activeRecently = isRecent(toJsDate(user.lastVisitAt));

  return (
    <div className="max-w-6xl">
      <Link to="/kmeta/users" className="k-fade inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Users
      </Link>

      {/* Hero */}
      <section className={`k-card k-rise relative overflow-hidden p-5 sm:p-6 mb-4 ${isPro ? 'k-card-gold' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="relative w-fit">
            <Avatar src={user.photoURL} name={user.name || user.email} size={68} gold={isPro} />
            {activeRecently && <span title="Active in the last 7 days" className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green ring-[3px] ring-surface-card k-live" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-text-primary leading-tight break-words">{user.name || 'No name'}</h1>
            <div className="text-sm text-text-secondary break-all">{user.email}</div>
            <div className="flex flex-wrap gap-2 mt-2.5 items-center">
              <span className={statusBadgeClass(status)}>{isPro && <Crown className="w-3 h-3 mr-1" />}{KMETA_STATUS_LABEL[status]}</span>
              {daysLeft !== null && daysLeft > 0 && isPro && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-hover text-text-secondary">{daysLeft}d left</span>
              )}
              {user.specialization && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--k-teal)]/10 text-[var(--k-teal)]">{user.specialization}</span>}
              {channel !== 'unknown' && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-hover text-text-secondary">{KMETA_CHANNEL_LABEL[channel]}</span>}
            </div>
          </div>
          {pageUrl && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="k-btn-gold inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm shrink-0">
              <Globe className="w-4 h-4" /> Public page <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/70">
          {([
            ['Students', counts?.students, <GraduationCap className="w-3.5 h-3.5" />],
            ['Groups', counts?.groups, <Layers className="w-3.5 h-3.5" />],
            ['Lessons', counts?.lessons, <BookOpen className="w-3.5 h-3.5" />],
            ['Payments', counts?.payments, <CreditCard className="w-3.5 h-3.5" />],
          ] as const).map(([label, n, icon]) => (
            <div key={label} className="min-w-0">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary leading-none">
                {countsAvailable && counts ? <AnimatedNumber value={n ?? 0} /> : <span className="text-text-muted">{cnt(n)}</span>}
              </div>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-text-muted mt-1.5 truncate">{icon}{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Block i={1} title="General" icon={<Info className="w-4 h-4" />}>
          <Row label="Registered" value={fmtDateTime(user.createdAt)} />
          <Row label="Specialization" value={user.specialization || '—'} />
          <Row label="Lesson duration" value={user.lessonDuration ? `${user.lessonDuration} min` : '—'} />
          <Row label="Reminders before" value={reminders} />
        </Block>

        <Block i={2} title="Subscription" icon={<Crown className="w-4 h-4" />}>
          <Row label="Status" value={<span className={statusBadgeClass(status)}>{KMETA_STATUS_LABEL[status]}</span>} />
          <Row label="Raw plan" value={user.plan ?? 'free'} />
          <Row label="Pro expires" value={daysLeft !== null && daysLeft > 0 ? `${fmtDate(user.proExpiresAt)} · ${daysLeft}d` : fmtDate(user.proExpiresAt)} />
          <Row label="Last payment" value={fmtDateTime(user.lastPaymentAt)} />
          <Row label="Auto-renew" value={user.autoRenew === undefined ? '—' : user.autoRenew ? <span className="text-green">Yes</span> : <span className="text-red">No</span>} />
          <Row label="Order ref" value={<span className="font-mono text-xs">{user.subscriptionOrderRef || '—'}</span>} />
        </Block>

        <Block i={3} title="Public page" icon={<Globe className="w-4 h-4" />}>
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

        <Block i={4} title="Engagement" icon={<Activity className="w-4 h-4" />}>
          <Row label="Last visit" value={fmtDateTime(user.lastVisitAt)} />
          <Row label="Visits" value={user.visitCount ?? 0} />
          <Row label="Time on site" value={user.totalTimeOnSiteSec ? `${Math.round(user.totalTimeOnSiteSec / 60)} min` : '—'} />
          <Row label="Paywall views" value={user.paywallViews ?? 0} />
        </Block>

        <div className="md:col-span-2">
          <Block i={5} title="Acquisition" icon={<Megaphone className="w-4 h-4" />}>
            <div className="grid md:grid-cols-2 md:divide-x divide-border/60">
              <div className="divide-y divide-border/60">
                <Row label="Channel" value={<span className={channel === 'ads' ? 'text-blue' : channel === 'organic' ? 'text-green' : 'text-text-secondary'}>{KMETA_CHANNEL_LABEL[channel]}</span>} />
                <Row label="Source" value={a?.source || '—'} />
                <Row label="Medium" value={a?.utmMedium || '—'} />
                <Row label="Campaign" value={a?.utmCampaign || '—'} />
                <Row label="Keyword" value={a?.utmTerm || '—'} />
                <Row label="Google Ads" value={a?.gclid ? 'Yes' : 'No'} />
              </div>
              <div className="divide-y divide-border/60 border-t border-border/60 md:border-t-0">
                <Row label="Landing" value={<span className="text-xs break-all">{a?.landingPage || '—'}</span>} />
                <Row label="Referrer" value={<span className="text-xs break-all">{a?.referrer || '—'}</span>} />
                <Row label="Device" value={a?.deviceType || '—'} />
                <Row label="First visit" value={fmtDateTime(a?.capturedAt)} />
                {a?.lastTouch && <Row label="Last touch" value={`${a.lastTouch.source || '—'} · ${a.lastTouch.utmCampaign || '—'}`} />}
              </div>
            </div>
          </Block>
        </div>
      </div>

      {requests && requests.length > 0 && (
        <Panel i={6} className="mt-3 sm:mt-4" title={`Booking requests (${req.total})`} icon={<Calendar className="w-4 h-4" />}>
          <StackBar segments={[
            { label: 'New', value: req.new, color: '#5cb8ff' },
            { label: 'Accepted', value: req.accepted, color: '#3ddc97' },
            { label: 'Declined', value: req.declined, color: '#3a5257' },
          ]} />
        </Panel>
      )}

      {srcRows.length > 0 && (
        <Panel i={7} className="mt-3 sm:mt-4" title="Tagged links" icon={<Tag className="w-4 h-4" />}>
          <div className="-mx-1">
            <div className="flex text-[11px] uppercase tracking-wider text-text-muted px-1 pb-2">
              <span className="flex-1">Source</span>
              <span className="w-14 sm:w-20 text-right">Visits</span>
              <span className="w-16 sm:w-20 text-right">Req.</span>
              <span className="w-16 sm:w-20 text-right">Accept.</span>
            </div>
            {srcRows.map(r => (
              <div key={r.src} className="flex items-center text-sm px-1 py-2 border-t border-border/70">
                <span className="flex-1 text-text-primary truncate pr-2">{r.label}</span>
                <span className="w-14 sm:w-20 text-right text-text-secondary tabular-nums">{r.visits}</span>
                <span className="w-16 sm:w-20 text-right text-text-secondary tabular-nums">{r.requests}</span>
                <span className="w-16 sm:w-20 text-right font-semibold text-green tabular-nums">{r.accepted}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {subs && subs.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <Block i={8} title={`Subscription payments (${subs.length})`} icon={<Receipt className="w-4 h-4" />}
            right={<span className="text-accent font-bold">{subs.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString('uk-UA')} {subs[0]?.currency || 'UAH'}</span>}>
            {subs.map((p, i) => (
              <Row
                key={p.orderReference || i}
                label={
                  <span>
                    {fmtDate(p.createdAt)}
                    <span className={`ml-2 px-1.5 py-px rounded-full text-[10px] font-semibold ${p.isRenewal ? 'bg-green/10 text-green' : 'bg-accent/10 text-accent'}`}>{p.isRenewal ? 'renewal' : 'new'}</span>
                  </span>
                }
                value={<span className="font-bold text-text-primary">{Number(p.amount) || 0} {p.currency || 'UAH'}</span>}
              />
            ))}
          </Block>
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <Block i={9} title={`Page reports (${reports.length})`} icon={<Flag className="w-4 h-4" />}
            right={newReports > 0 ? <span className="px-2 py-0.5 bg-red/15 text-red rounded-full text-xs font-bold">{newReports} new</span> : undefined}>
            {reports.map(r => <ReportCard key={r.id} report={r} onSetStatus={setStatus} />)}
          </Block>
        </div>
      )}

      <div className="mt-5 k-fade" style={stagger(10)}>
        <CopyUid uid={user.uid} />
      </div>
    </div>
  );
}
