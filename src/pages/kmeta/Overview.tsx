import { useMemo } from 'react';
import {
  Users, Crown, UserPlus, BookOpen, Layers, GraduationCap, Wallet, Globe, Calendar, UserCheck, Flag, Tag,
  Activity, Bell, Eye, TrendingUp, PieChart, Megaphone, Search, Sparkles, CalendarRange, Radio,
} from 'lucide-react';
import {
  useKmetaUsers, useKmetaSubcounts, useKmetaRevenue, isKmetaPro, kmetaEffectiveStatus,
  useKmetaPublicProfiles, useKmetaBookingRequests, useKmetaPageReports, useKmetaConvertedTrials,
  kmetaAcquisitionChannel, useKmetaPushTutors, type KmetaChannel,
} from '../../hooks/useKmetaData';
import { toDayMonth, toJsDate } from '../../lib/date';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  PageHeader, SectionLabel, Panel, Kpi, StackBar, BarList, MiniStat, ConnectGate, LoadingSkeleton,
  AnimatedNumber,
} from '../../components/ui';
import { fmt, GOLD, TEAL } from '../../lib/theme';

// Of each 149 UAH charge, this much reaches the account after WayForPay's fee.
const WAYFORPAY_PAYOUT_RATIO = 146 / 149;
// 5% ФОП single tax + 1% військовий збір.
const TOTAL_TAX = 0.06;

const RANGES = [7, 30, 90] as const;
type Range = typeof RANGES[number];
const isRange = (v: unknown): v is Range => RANGES.includes(v as Range);

export function KmetaOverview() {
  const { users, loading, connected, connect, error } = useKmetaUsers();
  const { totals, loading: countsLoading, available: countsAvailable } = useKmetaSubcounts(users);
  const { payments: subPayments } = useKmetaRevenue(connected);
  const { profiles } = useKmetaPublicProfiles(connected);
  const { requests } = useKmetaBookingRequests(connected);
  const { reports } = useKmetaPageReports(connected);
  const { count: convertedTrials, available: convertedAvailable } = useKmetaConvertedTrials(connected);
  const { uids: pushUids } = useKmetaPushTutors(connected);
  const [range, setRange] = usePersistentState<Range>('kmeta.overview.range', 30, isRange);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const newThisWeek = users.filter(u => {
      const d = toJsDate(u.createdAt);
      return d ? d >= weekAgo : false;
    }).length;
    const proUsers = users.filter(isKmetaPro).length;

    const statusCounts: Record<'free' | 'pro' | 'pro_ending' | 'cancelled', number> =
      { free: 0, pro: 0, pro_ending: 0, cancelled: 0 };
    users.forEach(u => { statusCounts[kmetaEffectiveStatus(u)]++; });

    return { totalUsers: users.length, proUsers, newThisWeek, statusCounts };
  }, [users]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    users.forEach(u => {
      const d = toJsDate(u.createdAt);
      if (d) {
        const day = d.toISOString().slice(0, 10);
        if (day in days) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date: toDayMonth(date), count }));
  }, [users, range]);

  // Subscription revenue from the collection-group read, split by currency and
  // new vs renewal.
  const revenue = useMemo(() => {
    const list = subPayments ?? [];
    let uahGross = 0, eur = 0, renewals = 0, newCount = 0;
    list.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.currency === 'EUR') eur += amt; else uahGross += amt;
      if (p.isRenewal) renewals++; else newCount++;
    });
    return {
      uahGross,
      uahNet: uahGross * WAYFORPAY_PAYOUT_RATIO * (1 - TOTAL_TAX),
      eur,
      paymentsCount: list.length,
      newCount,
      renewals,
    };
  }, [subPayments]);

  const bookingStats = useMemo(() => {
    const list = requests ?? [];
    const by = { new: 0, accepted: 0, declined: 0 };
    list.forEach(r => {
      if (r.status === 'new') by.new++;
      else if (r.status === 'accepted') by.accepted++;
      else if (r.status === 'declined') by.declined++;
    });
    return { total: list.length, ...by };
  }, [requests]);

  const reportStats = useMemo(() => {
    const list = reports ?? [];
    return {
      total: list.length,
      newCount: list.filter(r => r.status === 'new').length,
      tutors: new Set(list.map(r => r.uid || r.slug)).size,
    };
  }, [reports]);

  const acq = useMemo(() => {
    const channels: Record<KmetaChannel, number> = { ads: 0, organic: 0, direct: 0, unknown: 0 };
    const byCampaign = new Map<string, { signups: number; pro: number }>();
    const byTerm = new Map<string, { signups: number; pro: number }>();
    const bump = (m: Map<string, { signups: number; pro: number }>, key: string | undefined, pro: boolean) => {
      if (!key) return;
      const e = m.get(key) || { signups: 0, pro: 0 };
      e.signups++; if (pro) e.pro++;
      m.set(key, e);
    };
    users.forEach(u => {
      channels[kmetaAcquisitionChannel(u)]++;
      const pro = isKmetaPro(u);
      bump(byCampaign, u.acquisition?.utmCampaign, pro);
      bump(byTerm, u.acquisition?.utmTerm, pro);
    });
    const top = (m: Map<string, { signups: number; pro: number }>) =>
      [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.signups - a.signups).slice(0, 8);
    return { channels, topCampaigns: top(byCampaign), topTerms: top(byTerm) };
  }, [users]);

  // Tagged links — visits and requests per source, summed over all tutors.
  const sources = useMemo(() => {
    const label = new Map<string, string>();
    const visits = new Map<string, number>();
    const reqBySrc = new Map<string, number>();
    let tutorsWithTags = 0;
    users.forEach(u => {
      if (u.bookingSources && u.bookingSources.length > 0) {
        tutorsWithTags++;
        u.bookingSources.forEach(s => { if (s.label) label.set(s.id, s.label); });
      }
      if (u.bookingVisits) {
        Object.values(u.bookingVisits).forEach(bySrc => {
          Object.entries(bySrc).forEach(([src, v]) => visits.set(src, (visits.get(src) || 0) + (Number(v) || 0)));
        });
      }
    });
    (requests ?? []).forEach(r => { const s = r.source || 'direct'; reqBySrc.set(s, (reqBySrc.get(s) || 0) + 1); });
    const all = new Set([...visits.keys(), ...reqBySrc.keys()]);
    const rows = [...all].map(src => ({ src, label: label.get(src) || src, visits: visits.get(src) || 0, requests: reqBySrc.get(src) || 0 }))
      .sort((a, b) => b.visits - a.visits || b.requests - a.requests);
    return { tutorsWithTags, rows };
  }, [users, requests]);

  const engagement = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 86400000, d30 = now - 30 * 86400000;
    let active7 = 0, active30 = 0, paywall = 0;
    users.forEach(u => {
      const t = u.lastVisitAt ? new Date(u.lastVisitAt).getTime() : NaN;
      if (Number.isFinite(t)) { if (t >= d7) active7++; if (t >= d30) active30++; }
      paywall += u.paywallViews || 0;
    });
    return { active7, active30, paywall };
  }, [users]);

  const whatsNew = useMemo(() => {
    const m = new Map<string, { opened: number; more: number; dismissed: number }>();
    users.forEach(u => {
      if (!u.updatesLog) return;
      Object.entries(u.updatesLog).forEach(([id, v]) => {
        const e = m.get(id) || { opened: 0, more: 0, dismissed: 0 };
        if (v?.action === 'more') e.more++;
        else if (v?.action === 'dismissed') e.dismissed++;
        else e.opened++;
        m.set(id, e);
      });
    });
    return [...m.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.opened + b.more + b.dismissed) - (a.opened + a.more + a.dismissed));
  }, [users]);

  const cohorts = useMemo(() => {
    const m = new Map<string, { signups: number; pro: number }>();
    users.forEach(u => {
      const d = toJsDate(u.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 7);
      const e = m.get(key) || { signups: 0, pro: 0 };
      e.signups++; if (isKmetaPro(u)) e.pro++;
      m.set(key, e);
    });
    return [...m.entries()].map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
  }, [users]);

  if (!connected) return <ConnectGate title="Overview" error={error} onConnect={connect} />;
  if (loading) return <LoadingSkeleton />;
  if (error) return <ConnectGate title="Overview" error={error} onConnect={connect} retry />;

  const total = (n: number): string | number => (!countsAvailable ? '—' : countsLoading ? '…' : n);
  const createdPages = users.filter(u => u.publicSlug).length;
  const publishedPages = (profiles ?? []).filter(p => p.enabled).length;
  const pushOn = pushUids ? users.filter(u => pushUids.has(u.uid)).length : null;
  const proRate = stats.totalUsers ? Math.round((stats.proUsers / stats.totalUsers) * 1000) / 10 : 0;
  const rangeTotal = chartData.reduce((s, d) => s + d.count, 0);
  const acceptRate = bookingStats.total ? Math.round((bookingStats.accepted / bookingStats.total) * 100) : 0;

  return (
    <div className="max-w-7xl">
      <PageHeader
        eyebrow="kmeta"
        title="Overview"
        subtitle={<>{stats.totalUsers} tutors · оновлено {new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</>}
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={0} label="Total users" value={stats.totalUsers} icon={<Users />} tone="teal" />
        <Kpi i={1} label="Active Pro" value={stats.proUsers} icon={<Crown />} tone="gold" hint={`${proRate}% конверсія`} />
        <Kpi i={2} label="New this week" value={stats.newThisWeek} icon={<UserPlus />} tone="green" />
        <Kpi i={3} label="Active 7d" value={engagement.active7} icon={<Activity />} tone="blue" hint={`${engagement.active30} за 30 днів`} />
      </div>

      {/* Revenue + plan split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <Panel i={4} gold className="lg:col-span-3" title="Revenue" icon={<Wallet className="w-4 h-4" />}
          right={<span>{revenue.paymentsCount} оплат</span>}>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <div className="text-xs text-text-muted mb-1">Gross</div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-accent leading-none">
                <AnimatedNumber value={revenue.uahGross} /> <span className="text-lg font-bold text-accent/70">UAH</span>
              </div>
              {revenue.eur > 0 && <div className="text-sm font-semibold text-text-primary mt-2">+ {fmt(revenue.eur)} EUR</div>}
            </div>
            <div className="sm:border-l sm:border-border sm:pl-5">
              <div className="text-xs text-text-muted mb-1">Net (after fees & tax)</div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-green leading-none">
                <AnimatedNumber value={revenue.uahNet} /> <span className="text-base font-bold text-green/70">UAH</span>
              </div>
              <div className="text-[11px] text-text-muted mt-2">WayForPay 146/149 · −5% ФОП −1% ЗЗ</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              [`${revenue.newCount} нові`, 'bg-accent/10 text-accent'],
              [`автосписання: ${revenue.renewals}`, 'bg-green/10 text-green'],
            ].map(([t, c]) => <span key={t} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c}`}>{t}</span>)}
          </div>
        </Panel>
        <Panel i={5} className="lg:col-span-2" title="Subscription status" icon={<PieChart className="w-4 h-4" />}>
          <StackBar segments={[
            { label: 'Pro', value: stats.statusCounts.pro, color: GOLD },
            { label: 'Pro ending', value: stats.statusCounts.pro_ending, color: '#5cb8ff' },
            { label: 'Cancelled', value: stats.statusCounts.cancelled, color: '#ff6b6b' },
            { label: 'Free', value: stats.statusCounts.free, color: '#3a5257' },
          ]} />
        </Panel>
      </div>

      {/* Registrations chart */}
      <Panel i={6} className="mt-3 sm:mt-4" title="New registrations" icon={<TrendingUp className="w-4 h-4" />}
        right={
          <div className="flex bg-surface rounded-lg p-0.5 border border-border">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`k-chip px-2.5 py-1 rounded-md text-xs font-semibold ${range === r ? 'bg-accent text-[#1d1503]' : 'text-text-muted hover:text-text-primary'}`}>
                {r}d
              </button>
            ))}
          </div>
        }>
        <div className="flex items-baseline gap-2 -mt-1 mb-3">
          <span className="text-2xl font-extrabold text-text-primary"><AnimatedNumber value={rangeTotal} /></span>
          <span className="text-xs text-text-muted">за {range} днів</span>
        </div>
        <div className="-mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="kmetaGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1c3035" strokeDasharray="3 6" />
              <XAxis dataKey="date" tick={{ fill: '#6a8783', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: '#6a8783', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: GOLD, strokeOpacity: 0.35, strokeDasharray: '3 3' }}
                contentStyle={{ background: '#0e1a1d', border: '1px solid #1c3035', borderRadius: 12, color: '#ecf3f1', boxShadow: '0 12px 30px -10px rgba(0,0,0,.7)' }}
                labelStyle={{ color: '#a3b8b4', fontSize: 12 }}
                itemStyle={{ color: GOLD, fontWeight: 700 }}
                formatter={(v) => [v, 'sign-ups']}
              />
              <Area type="monotone" dataKey="count" stroke={GOLD} fill="url(#kmetaGold)" strokeWidth={2.5}
                activeDot={{ r: 5, fill: GOLD, stroke: '#081113', strokeWidth: 2 }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Product activity */}
      <SectionLabel i={7}>Activity</SectionLabel>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi i={8} compact label="Lessons" value={total(totals.lessons)} icon={<BookOpen />} tone="teal" />
        <Kpi i={9} compact label="Groups" value={total(totals.groups)} icon={<Layers />} tone="teal" />
        <Kpi i={10} compact label="Students" value={total(totals.students)} icon={<GraduationCap />} tone="teal" />
      </div>
      {!countsAvailable && (
        <p className="text-xs text-text-muted mt-3">
          Уроки / групи / студенти недоступні — треба дозволити адміну <code>read</code> підколекцій
          у Firestore rules kmeta (isAdmin на <code>{'/users/{uid}/{document=**}'}</code>).
        </p>
      )}

      {/* Booking pages + trial requests + page reports */}
      <SectionLabel i={11}>Booking</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={12} label="Booking pages" value={createdPages} icon={<Globe />} tone="muted" />
        <Kpi i={13} label="Published" value={publishedPages} icon={<Radio />} tone="green" />
        <Kpi i={14} label="Trial requests" value={bookingStats.total} icon={<Calendar />} tone="blue" />
        <Kpi i={15} label="Became students" value={convertedAvailable && convertedTrials !== null ? convertedTrials : '—'} icon={<UserCheck />} tone="gold" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <Panel i={16} title="Trial requests" icon={<Calendar className="w-4 h-4" />} right={bookingStats.total ? `${acceptRate}% прийнято` : undefined}>
          <StackBar segments={[
            { label: 'New', value: bookingStats.new, color: '#5cb8ff' },
            { label: 'Accepted', value: bookingStats.accepted, color: '#3ddc97' },
            { label: 'Declined', value: bookingStats.declined, color: '#3a5257' },
          ]} />
        </Panel>
        <Panel i={17} title="Page reports" icon={<Flag className="w-4 h-4" />}
          right={reportStats.newCount > 0 ? <span className="px-2 py-0.5 bg-red/15 text-red rounded-full text-xs font-bold">{reportStats.newCount} new</span> : undefined}
          className={reportStats.newCount > 0 ? 'ring-1 ring-red/25' : ''}>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Total" value={reportStats.total} />
            <MiniStat label="Unreviewed" value={reportStats.newCount} className={reportStats.newCount > 0 ? 'text-red' : 'text-text-primary'} />
            <MiniStat label="Tutors" value={reportStats.tutors} />
          </div>
        </Panel>
      </div>

      {/* Acquisition */}
      <SectionLabel i={18}>Acquisition</SectionLabel>
      <Panel i={19} title="Channels" icon={<Megaphone className="w-4 h-4" />}>
        <StackBar segments={[
          { label: 'Google Ads', value: acq.channels.ads, color: '#5cb8ff' },
          { label: 'Organic', value: acq.channels.organic, color: '#3ddc97' },
          { label: 'Direct', value: acq.channels.direct, color: TEAL },
          ...(acq.channels.unknown > 0 ? [{ label: 'Unknown', value: acq.channels.unknown, color: '#3a5257' }] : []),
        ]} />
      </Panel>
      {(acq.topCampaigns.length > 0 || acq.topTerms.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          {acq.topCampaigns.length > 0 && (
            <Panel i={20} title="Top campaigns" icon={<Megaphone className="w-4 h-4" />} right="sign-ups / Pro">
              <BarList mono color="#5cb8ff" rows={acq.topCampaigns.map(c => ({
                key: c.name, label: c.name, value: c.signups,
                extra: <>{c.signups} <span className="text-text-muted">/</span> <span className="text-accent">{c.pro}</span></>,
              }))} />
            </Panel>
          )}
          {acq.topTerms.length > 0 && (
            <Panel i={21} title="Top keywords" icon={<Search className="w-4 h-4" />} right="sign-ups / Pro">
              <BarList color="#5cb8ff" rows={acq.topTerms.map(t => ({
                key: t.name, label: t.name, value: t.signups,
                extra: <>{t.signups} <span className="text-text-muted">/</span> <span className="text-accent">{t.pro}</span></>,
              }))} />
            </Panel>
          )}
        </div>
      )}

      {/* Tagged links — where visitors come from */}
      <Panel i={22} className="mt-3 sm:mt-4" title="Tagged links" icon={<Tag className="w-4 h-4" />} right={`${sources.tutorsWithTags} tutors using tags`}>
        {sources.rows.length > 0 ? (
          <div className="-mx-1">
            <div className="flex text-[11px] uppercase tracking-wider text-text-muted px-1 pb-2">
              <span className="flex-1">Source</span>
              <span className="w-16 sm:w-24 text-right">Visits</span>
              <span className="w-20 sm:w-24 text-right">Requests</span>
            </div>
            {sources.rows.map(r => (
              <div key={r.src} className="flex items-center text-sm px-1 py-2 border-t border-border/70">
                <span className="flex-1 text-text-primary truncate pr-2">{r.label}</span>
                <span className="w-16 sm:w-24 text-right text-text-secondary tabular-nums">{r.visits}</span>
                <span className="w-20 sm:w-24 text-right font-semibold text-accent tabular-nums">{r.requests}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-muted">No tagged-link data yet</div>
        )}
      </Panel>

      {/* Engagement */}
      <SectionLabel i={23}>Engagement</SectionLabel>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi i={24} compact label="Active 30d" value={engagement.active30} icon={<Activity />} tone="blue" />
        <Kpi i={25} compact label="Push on" value={pushOn ?? '—'} icon={<Bell />} tone="green" />
        <Kpi i={26} compact label="Paywall views" value={engagement.paywall} icon={<Eye />} tone="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 mb-4">
        <Panel i={27} title="What's new" icon={<Sparkles className="w-4 h-4" />}>
          {whatsNew.length > 0 ? (
            <div className="-mx-1">
              <div className="flex text-[11px] uppercase tracking-wider text-text-muted px-1 pb-2">
                <span className="flex-1">Update</span>
                <span className="w-14 text-right">Opened</span>
                <span className="w-14 text-right">More</span>
                <span className="w-16 text-right">Dismiss</span>
              </div>
              {whatsNew.map(w => (
                <div key={w.id} className="flex items-center text-sm px-1 py-2 border-t border-border/70">
                  <span className="flex-1 text-text-primary truncate pr-2">{w.id}</span>
                  <span className="w-14 text-right text-text-secondary tabular-nums">{w.opened}</span>
                  <span className="w-14 text-right font-semibold text-green tabular-nums">{w.more}</span>
                  <span className="w-16 text-right text-text-muted tabular-nums">{w.dismissed}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-text-muted">No data</div>}
        </Panel>
        <Panel i={28} title="Cohorts by month" icon={<CalendarRange className="w-4 h-4" />} right="sign-ups / Pro">
          <BarList color={TEAL} rows={[...cohorts].reverse().map(c => ({
            key: c.month, label: c.month, value: c.signups,
            extra: <>{c.signups} <span className="text-text-muted">/</span> <span className="text-accent">{c.pro}</span></>,
          }))} />
        </Panel>
      </div>
    </div>
  );
}
