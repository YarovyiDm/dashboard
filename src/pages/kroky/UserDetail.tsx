import { useMemo, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Crown, Pen, Smartphone, Monitor, Tablet, Info, Megaphone, Eye, FileText, Wrench, Download, Clock } from 'lucide-react';
import { Panel, Avatar, LoadingSkeleton, AnimatedNumber } from '../../components/ui';
import { stagger } from '../../lib/theme';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import {
  getWatermarkedExports,
  getCleanExports,
  getTotalPaywallViews,
  getProStatus,
  isProActive,
  TRIGGER_LABELS,
  ALL_TRIGGERS,
  LANG_LABELS,
  ALL_LANGS,
} from '../../lib/krokyFields';
import type { UserProfile } from '../../types';

function getSource(u: UserProfile): string {
  if (u.acquisition?.utmSource) return u.acquisition.utmSource;
  if (u.acquisition?.referrer) {
    try {
      const url = new URL(u.acquisition.referrer);
      const utm = url.searchParams.get('utm_source');
      if (utm) return utm;
      const host = url.hostname.replace(/^www\./, '');
      if (host && host !== 'kroky.com.ua') return host;
    } catch { /* */ }
  }
  return 'direct';
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDuration(sec?: number) {
  if (!sec) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const DeviceIcon = ({ type }: { type?: string }) => {
  if (type === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
};

function Block({ title, icon, i = 0, children }: { title: string; icon?: ReactNode; i?: number; children: ReactNode }) {
  return (
    <Panel pad={false} i={i} title={title} icon={icon}>
      <div className="divide-y divide-border/60">{children}</div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-2.5 min-h-[42px]">
      <span className="text-sm text-text-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right min-w-0">{value}</span>
    </div>
  );
}

function Tags({ items, color = 'text-text-secondary bg-surface-hover' }: { items: string[]; color?: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap px-4 sm:px-5 py-2.5">
      {items.map(t => (
        <span key={t} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>{t}</span>
      ))}
    </div>
  );
}

export function KrokyUserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const { users, loading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const user = useMemo(() => users.find(u => u.uid === uid), [users, uid]);

  if (loading || paymentsLoading) return <LoadingSkeleton rows={2} />;
  if (!user) {
    return (
      <div className="k-fade">
        <Link to="/kroky/users" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Users
        </Link>
        <div className="k-card p-8 text-text-muted">User not found</div>
      </div>
    );
  }

  const proActive = isProActive(user);
  const proStatus = getProStatus(user);
  const totalPaywallViews = getTotalPaywallViews(user);
  const userProPayments = payments.filter(p => p.uid === user.uid && p.status === 'approved' && (p.templateId === 'pro' || p.productType === 'pro'));
  const proPurchases = userProPayments.length;
  const conversionRate = totalPaywallViews > 0
    ? ((proPurchases / totalPaywallViews) * 100).toFixed(1)
    : null;
  const hasLegacyTemplates = (user.purchasedTemplates?.length ?? 0) > 0;
  const hasLegacySignatureTemplates = (user.purchasedSignatureTemplates?.length ?? 0) > 0;

  const byLang = user.stats?.exportsByLang;
  const langTotal = byLang ? ALL_LANGS.reduce((acc, l) => acc + (byLang[l] || 0), 0) : 0;
  const usage = user.stats?.exportsByThemeUsage;
  const themeTotal = (usage?.custom ?? 0) + (usage?.default ?? 0);

  return (
    <div className="max-w-6xl">
      <Link to="/kroky/users" className="k-fade inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Users
      </Link>

      {/* Hero */}
      <section className={`k-card k-rise relative overflow-hidden p-5 sm:p-6 mb-4 ${proActive ? 'k-card-gold' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <Avatar src={user.photoURL ?? undefined} name={user.displayName || user.email || '?'} size={68} gold={proActive} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-text-primary leading-tight break-words">{user.displayName || 'No name'}</h1>
            <div className="text-sm text-text-secondary break-all">{user.email}</div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {proActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent rounded-full text-[11px] font-semibold">
                  <Crown className="w-3 h-3" /> Pro до {formatDate(user.proExpiresAt)}{proStatus.daysLeft !== null ? ` · ${proStatus.daysLeft}d` : ''}
                </span>
              )}
              {user.isPro && !proActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-hover text-text-muted rounded-full text-[11px] font-semibold">
                  <Crown className="w-3 h-3" /> Pro expired
                </span>
              )}
              {user.signaturePurchased && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--k-teal)]/15 text-[var(--k-teal)] rounded-full text-[11px] font-semibold">
                  <Pen className="w-3 h-3" /> Signature (legacy)
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-hover text-text-secondary">{getSource(user)}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/70">
          {([
            ['Visits', user.visitCount ?? 0, <Eye className="w-3.5 h-3.5" />],
            ['Exports', getWatermarkedExports(user) + getCleanExports(user), <Download className="w-3.5 h-3.5" />],
            ['Pro buys', proPurchases, <Crown className="w-3.5 h-3.5" />],
            ['Minutes', Math.round((user.totalTimeOnSiteSec ?? 0) / 60), <Clock className="w-3.5 h-3.5" />],
          ] as const).map(([label, n, ic]) => (
            <div key={label} className="min-w-0">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary leading-none"><AnimatedNumber value={n} /></div>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-text-muted mt-1.5 truncate">{ic}{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Block i={1} title="Resume" icon={<FileText className="w-4 h-4" />}>
          <Row label="Templates opened" value={user.stats?.templatesOpened?.length ?? 0} />
          {user.stats?.templatesOpened && user.stats.templatesOpened.length > 0 && <Tags items={user.stats.templatesOpened} />}
          <Row label="Watermarked exports" value={getWatermarkedExports(user)} />
          <Row label="Clean exports (Pro)" value={<span className="text-accent">{getCleanExports(user)}</span>} />
          {langTotal > 0 && ALL_LANGS.map(l => {
            const count = byLang?.[l] ?? 0;
            if (count === 0) return null;
            return <Row key={l} label={LANG_LABELS[l]} value={`${count} (${Math.round((count / langTotal) * 100)}%)`} />;
          })}
          {themeTotal > 0 && (
            <Row label="Custom theme share" value={`${Math.round(((usage?.custom ?? 0) / themeTotal) * 100)}% (${usage?.custom ?? 0}/${themeTotal})`} />
          )}
          {user.stats?.exportsByTheme && Object.keys(user.stats.exportsByTheme).length > 0 && (
            <Tags items={Object.entries(user.stats.exportsByTheme).map(([id, n]) => `${id} · ${n}`)} />
          )}
          {hasLegacyTemplates && (
            <>
              <Row label="Purchased templates (legacy)" value={user.purchasedTemplates.length} />
              <Tags items={user.purchasedTemplates} color="text-green bg-green/15" />
            </>
          )}
        </Block>

        <Block i={2} title="Pro / Conversion" icon={<Crown className="w-4 h-4" />}>
          <Row label="Status" value={
            proStatus.status === 'active' ? (
              <span className="text-accent">Active{proStatus.daysLeft !== null ? ` — ${proStatus.daysLeft}d left` : ''}</span>
            ) : proStatus.status === 'expired' ? (
              <span className="text-text-muted">Expired</span>
            ) : (
              <span className="text-text-muted">Never</span>
            )
          } />
          <Row label="Expires" value={formatDate(user.proExpiresAt)} />
          <Row label="Purchases" value={proPurchases} />
          <Row label="First purchase" value={formatDateTime(user.stats?.firstProPurchaseAt)} />
          <Row label="Last purchase" value={formatDateTime(user.stats?.lastProPurchaseAt)} />
          <Row label="Total spent" value={<span className="text-green">{user.stats?.totalSpentUah ?? 0} грн</span>} />
          <Row label="Converted via" value={user.stats?.firstConversionTrigger ? TRIGGER_LABELS[user.stats.firstConversionTrigger] : '—'} />
          <Row label="Last trigger" value={user.stats?.convertedViaTrigger ? TRIGGER_LABELS[user.stats.convertedViaTrigger] : '—'} />
        </Block>

        <Block i={3} title="General" icon={<Info className="w-4 h-4" />}>
          <Row label="Registered" value={formatDateTime(user.createdAt)} />
          <Row label="Last visit" value={formatDateTime(user.lastVisitAt)} />
          <Row label="Visits" value={user.visitCount ?? 0} />
          <Row label="Time on site" value={formatDuration(user.totalTimeOnSiteSec)} />
          <Row label="Last active" value={formatDateTime(user.stats?.lastActiveAt)} />
        </Block>

        <Block i={4} title="Paywall" icon={<Eye className="w-4 h-4" />}>
          <Row label="Total views" value={totalPaywallViews} />
          {ALL_TRIGGERS.map(t => {
            const count = user.stats?.paywallViewsByTrigger?.[t] ?? 0;
            if (count === 0) return null;
            const pct = totalPaywallViews > 0 ? Math.round((count / totalPaywallViews) * 100) : 0;
            return <Row key={t} label={TRIGGER_LABELS[t]} value={`${count} (${pct}%)`} />;
          })}
          <Row label="Conversion rate" value={conversionRate !== null ? <span className="text-accent">{conversionRate}%</span> : '—'} />
        </Block>

        <Block i={5} title="Acquisition" icon={<Megaphone className="w-4 h-4" />}>
          <Row label="Source" value={getSource(user)} />
          <Row label="Landing page" value={<span className="text-xs break-all">{user.acquisition?.landingPage || '—'}</span>} />
          <Row label="Device" value={
            user.acquisition?.deviceType ? (
              <span className="inline-flex items-center gap-1.5"><DeviceIcon type={user.acquisition.deviceType} />{user.acquisition.deviceType}</span>
            ) : '—'
          } />
          <Row label="UTM Medium" value={user.acquisition?.utmMedium || '—'} />
          <Row label="UTM Campaign" value={user.acquisition?.utmCampaign || '—'} />
          <Row label="Referrer" value={user.acquisition?.referrer ? <span className="text-xs break-all">{user.acquisition.referrer}</span> : '—'} />
        </Block>

        <Block i={6} title="Other tools" icon={<Wrench className="w-4 h-4" />}>
          <Row label="Signature — opens / copies" value={`${user.signatureOpened ?? 0} / ${user.signatureCopies ?? 0}`} />
          {hasLegacySignatureTemplates && (
            <Row label="Signature templates (legacy)" value={user.purchasedSignatureTemplates!.length} />
          )}
          <Row label="QR — opens / downloads" value={`${user.qrOpened ?? 0} / ${user.qrDownloads ?? 0}`} />
          <Row label="Tracker — opens / apps" value={`${user.trackerOpened ?? 0} / ${user.applicationsCreated ?? 0}`} />
          <Row label="Tracker limit reached" value={user.stats?.trackerLimitReached ?? 0} />
        </Block>
      </div>

      <div className="mt-5 k-fade text-xs text-text-muted" style={stagger(7)}>
        UID: <span className="font-mono">{user.uid}</span>
      </div>
    </div>
  );
}
