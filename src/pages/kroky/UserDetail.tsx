import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Crown, Pen, Smartphone, Monitor, Tablet } from 'lucide-react';
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 min-h-[40px]">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

function Tags({ items, color = 'text-text-secondary bg-surface-hover' }: { items: string[]; color?: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      {items.map(t => (
        <span key={t} className={`px-2 py-0.5 rounded text-xs ${color}`}>{t}</span>
      ))}
    </div>
  );
}

export function KrokyUserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const { users, loading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const user = useMemo(() => users.find(u => u.uid === uid), [users, uid]);

  if (loading || paymentsLoading) return <div className="text-text-muted p-8">Loading...</div>;
  if (!user) return <div className="text-text-muted p-8">User not found</div>;

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

  return (
    <div>
      {/* Back + header */}
      <Link to="/kroky/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="flex items-center gap-4 mb-6">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface-card border border-border flex items-center justify-center text-text-muted text-xl">
            {(user.displayName || user.email || '?')[0]}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-text-primary">{user.displayName || 'No name'}</h1>
          <div className="text-sm text-text-secondary">{user.email}</div>
          <div className="flex gap-2 mt-1.5">
            {proActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber/15 text-amber rounded text-xs font-medium">
                <Crown className="w-3 h-3" /> Pro (до {formatDate(user.proExpiresAt)})
              </span>
            )}
            {user.isPro && !proActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-text-muted/15 text-text-muted rounded text-xs">
                <Crown className="w-3 h-3" /> Pro expired
              </span>
            )}
            {user.signaturePurchased && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent rounded text-xs">
                <Pen className="w-3 h-3" /> Signature (legacy)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General */}
        <Block title="General">
          <Row label="Registered" value={formatDateTime(user.createdAt)} />
          <Row label="Last visit" value={formatDateTime(user.lastVisitAt)} />
          <Row label="Visits" value={user.visitCount ?? 0} />
          <Row label="Time on site" value={formatDuration(user.totalTimeOnSiteSec)} />
          <Row label="Last active" value={formatDateTime(user.stats?.lastActiveAt)} />
        </Block>

        {/* Acquisition */}
        <Block title="Acquisition">
          <Row label="Source" value={getSource(user)} />
          <Row label="Landing page" value={user.acquisition?.landingPage || '—'} />
          <Row label="Device" value={
            user.acquisition?.deviceType ? (
              <span className="inline-flex items-center gap-1.5">
                <DeviceIcon type={user.acquisition.deviceType} />
                {user.acquisition.deviceType}
              </span>
            ) : '—'
          } />
          <Row label="UTM Medium" value={user.acquisition?.utmMedium || '—'} />
          <Row label="UTM Campaign" value={user.acquisition?.utmCampaign || '—'} />
          <Row label="Referrer" value={
            user.acquisition?.referrer
              ? <span className="text-xs break-all max-w-[300px] text-right">{user.acquisition.referrer}</span>
              : '—'
          } />
        </Block>

        {/* Pro / Conversion */}
        <Block title="Pro / Conversion">
          <Row label="Status" value={
            proStatus.status === 'active' ? (
              <span className="text-amber">Active{proStatus.daysLeft !== null ? ` — ${proStatus.daysLeft}d left` : ''}</span>
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
          <Row label="Total spent" value={`${user.stats?.totalSpentUah ?? 0} грн`} />
          <Row label="Converted via" value={
            user.stats?.firstConversionTrigger
              ? TRIGGER_LABELS[user.stats.firstConversionTrigger]
              : '—'
          } />
          <Row label="Last trigger" value={
            user.stats?.convertedViaTrigger
              ? TRIGGER_LABELS[user.stats.convertedViaTrigger]
              : '—'
          } />
        </Block>

        {/* Paywall */}
        <Block title="Paywall">
          <Row label="Total views" value={totalPaywallViews} />
          {ALL_TRIGGERS.map(t => {
            const count = user.stats?.paywallViewsByTrigger?.[t] ?? 0;
            const pct = totalPaywallViews > 0 ? Math.round((count / totalPaywallViews) * 100) : 0;
            return (
              <Row
                key={t}
                label={TRIGGER_LABELS[t]}
                value={count === 0 ? '—' : `${count} (${pct}%)`}
              />
            );
          })}
          <Row label="Conversion rate" value={
            conversionRate !== null ? (
              <span className="text-accent">{conversionRate}%</span>
            ) : '—'
          } />
        </Block>

        {/* Resume */}
        <Block title="Resume">
          <Row label="Templates opened" value={user.stats?.templatesOpened?.length ?? 0} />
          {user.stats?.templatesOpened && user.stats.templatesOpened.length > 0 && (
            <div className="px-5 py-2.5">
              <Tags items={user.stats.templatesOpened} />
            </div>
          )}
          <Row label="Watermarked exports" value={getWatermarkedExports(user)} />
          <Row label="Clean exports (Pro)" value={getCleanExports(user)} />
          {(() => {
            const byLang = user.stats?.exportsByLang;
            const total = byLang ? ALL_LANGS.reduce((s, l) => s + (byLang[l] || 0), 0) : 0;
            if (total === 0) return null;
            return ALL_LANGS.map(l => {
              const count = byLang?.[l] ?? 0;
              if (count === 0) return null;
              const pct = Math.round((count / total) * 100);
              return <Row key={l} label={LANG_LABELS[l]} value={`${count} (${pct}%)`} />;
            });
          })()}
          {(() => {
            const usage = user.stats?.exportsByThemeUsage;
            const custom = usage?.custom ?? 0;
            const def = usage?.default ?? 0;
            const total = custom + def;
            if (total === 0) return null;
            const pct = Math.round((custom / total) * 100);
            return <Row label="Custom theme share" value={`${pct}% (${custom}/${total})`} />;
          })()}
          {user.stats?.exportsByTheme && Object.keys(user.stats.exportsByTheme).length > 0 && (
            <div className="px-5 py-2.5">
              <Tags items={Object.entries(user.stats.exportsByTheme).map(([id, n]) => `${id} · ${n}`)} />
            </div>
          )}
          {hasLegacyTemplates && (
            <>
              <Row label="Purchased templates (legacy)" value={user.purchasedTemplates.length} />
              <div className="px-5 py-2.5">
                <Tags items={user.purchasedTemplates} color="text-green bg-green/15" />
              </div>
            </>
          )}
        </Block>

        {/* Signature */}
        <Block title="Signature">
          <Row label="Editor opens" value={user.signatureOpened ?? 0} />
          <Row label="Copies" value={user.signatureCopies ?? 0} />
          <Row label="Templates viewed" value={user.signatureTemplatesViewed?.length ?? 0} />
          {user.signatureTemplatesViewed && user.signatureTemplatesViewed.length > 0 && (
            <div className="px-5 py-2.5">
              <Tags items={user.signatureTemplatesViewed} />
            </div>
          )}
          {hasLegacySignatureTemplates && (
            <>
              <Row label="Purchased templates (legacy)" value={user.purchasedSignatureTemplates!.length} />
              <div className="px-5 py-2.5">
                <Tags items={user.purchasedSignatureTemplates!} color="text-accent bg-accent/15" />
              </div>
            </>
          )}
        </Block>

        {/* QR Code */}
        <Block title="QR Code">
          <Row label="Editor opens" value={user.qrOpened ?? 0} />
          <Row label="Downloads" value={user.qrDownloads ?? 0} />
          <Row label="Styles viewed" value={user.qrStylesViewed?.length ?? 0} />
          {user.qrStylesViewed && user.qrStylesViewed.length > 0 && (
            <div className="px-5 py-2.5">
              <Tags items={user.qrStylesViewed} />
            </div>
          )}
        </Block>

        {/* Tracker */}
        <Block title="Job Tracker">
          <Row label="Tracker opens" value={user.trackerOpened ?? 0} />
          <Row label="Applications created" value={user.applicationsCreated ?? 0} />
          <Row label="Limit reached" value={user.stats?.trackerLimitReached ?? 0} />
        </Block>
      </div>

      {/* UID */}
      <div className="mt-4 text-xs text-text-muted">
        UID: <span className="font-mono">{user.uid}</span>
      </div>
    </div>
  );
}
