import { useMemo } from 'react';
import { Users, Wallet, Crown, UserPlus, TrendingUp, Percent, Globe2 } from 'lucide-react';
import { PageHeader, Panel, Kpi, MiniStat, SectionLabel, LoadingSkeleton, AnimatedNumber } from '../../components/ui';
import { GOLD, fmt } from '../../lib/theme';
import { usePersistentState, oneOf } from '../../hooks/usePersistentState';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { useExchangeRates, type Rates } from '../../hooks/useExchangeRates';
import { paymentNetUah, paymentNetIn, round2, TAX_RATE } from '../../lib/revenue';
import { toDayMonth, toDayMonthYear } from '../../lib/date';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CHART_MODES = ['signups', 'revenue'] as const;
type ChartMode = typeof CHART_MODES[number];

const COUNTRIES = [
  { key: 'uk', flag: '🇺🇦', name: 'Ukraine', currency: 'UAH' },
  { key: 'pl', flag: '🇵🇱', name: 'Poland', currency: 'USD' },
  { key: 'ro', flag: '🇷🇴', name: 'Romania', currency: 'USD' },
  { key: 'en', flag: '🌍', name: 'Rest of world', currency: 'USD' },
] as const;

export function KrokyOverview() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [chartMode, setChartMode] = usePersistentState<ChartMode>('kroky.overview.chart', 'signups', oneOf(CHART_MODES));

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const approved = payments.filter(p => p.status === 'approved');
    // Net of Creem fees, USD/PLN converted to UAH at the current NBU rate.
    const totalRevenue = round2(approved.reduce((s, p) => s + paymentNetUah(p, rates), 0));
    const netProfit = round2(totalRevenue * (1 - TAX_RATE));
    const activePro = users.filter(u => u.isPro && u.proExpiresAt && new Date(u.proExpiresAt) > now).length;
    const newThisWeek = users.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;

    // Week-over-week growth of new signups: this week vs the 7 days before it.
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const newLastWeek = users.filter(u => {
      if (!u.createdAt) return false;
      const t = new Date(u.createdAt);
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    const weekDelta = newThisWeek - newLastWeek;
    const weekTrendPct = newLastWeek === 0
      ? (newThisWeek > 0 ? 100 : 0)
      : Math.round((weekDelta / newLastWeek) * 100);

    const proPayments = approved.filter(p => p.templateId === 'pro' || p.productType === 'pro');
    const totalProPurchases = proPayments.length;
    const proBuyers = new Set(proPayments.map(p => p.uid)).size;
    const conversionRate = users.length > 0
      ? ((proBuyers / users.length) * 100).toFixed(1)
      : '0';

    // Pro buyers whose first purchase came more than a week after they registered
    // (counts every Pro buyer, active or not).
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const userByUid = new Map(users.map(u => [u.uid, u]));
    const firstProAt = new Map<string, number>();
    proPayments.forEach(p => {
      const t = new Date(p.purchasedAt || p.createdAt).getTime();
      const prev = firstProAt.get(p.uid);
      if (prev === undefined || t < prev) firstProAt.set(p.uid, t);
    });
    const slowConverterEmails: string[] = [];
    firstProAt.forEach((purchasedAt, uid) => {
      const u = userByUid.get(uid);
      if (!u || !u.createdAt) return;
      if (purchasedAt - new Date(u.createdAt).getTime() > WEEK_MS) {
        slowConverterEmails.push(u.email || uid);
      }
    });

    // Busiest single day by number of Pro purchases.
    const purchasesByDay = new Map<string, number>();
    proPayments.forEach(p => {
      const day = (p.purchasedAt || p.createdAt || '').slice(0, 10);
      if (day) purchasesByDay.set(day, (purchasesByDay.get(day) || 0) + 1);
    });
    let peakDay = '';
    let peakPurchases = 0;
    purchasesByDay.forEach((count, day) => {
      if (count > peakPurchases) { peakPurchases = count; peakDay = day; }
    });

    const ukPayments = approved.filter(p => !p.locale || p.locale === 'uk');
    const plPayments = approved.filter(p => p.locale === 'pl');
    const roPayments = approved.filter(p => p.locale === 'ro');
    const enPayments = approved.filter(p => p.locale === 'en');

    // Signups per locale (acquisition.signupLocale). Legacy users without it
    // fall to UA, mirroring how UA payments treat a missing locale.
    const regByLocale = { uk: 0, pl: 0, ro: 0, en: 0 };
    users.forEach(u => {
      const loc = u.acquisition?.signupLocale;
      if (loc === 'pl') regByLocale.pl++;
      else if (loc === 'ro') regByLocale.ro++;
      else if (loc === 'en') regByLocale.en++;
      else regByLocale.uk++;
    });

    // Revenue shown in each block's own currency, net of Creem fees.
    // After-tax is always reported in UAH.
    const countryStats = (list: typeof approved, currency: keyof Rates, registrations: number) => {
      const revenue = round2(list.reduce((s, p) => s + paymentNetIn(p, currency, rates), 0));
      const revenueUah = list.reduce((s, p) => s + paymentNetUah(p, rates), 0);
      return {
        count: list.length,
        revenue,
        afterTaxUah: round2(revenueUah * (1 - TAX_RATE)),
        buyers: new Set(list.map(p => p.uid)).size,
        registrations,
      };
    };

    return {
      totalUsers: users.length,
      totalRevenue,
      netProfit,
      activePro,
      newThisWeek,
      newLastWeek,
      weekDelta,
      weekTrendPct,
      totalProPurchases,
      proBuyers,
      slowConverters: slowConverterEmails.length,
      slowConverterEmails,
      peakPurchases,
      peakDay,
      conversionRate,
      uk: countryStats(ukPayments, 'UAH', regByLocale.uk),
      pl: countryStats(plPayments, 'USD', regByLocale.pl),
      ro: countryStats(roPayments, 'USD', regByLocale.ro),
      en: countryStats(enPayments, 'USD', regByLocale.en),
    };
  }, [users, payments, rates]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    users.forEach(u => {
      if (u.createdAt) {
        const day = u.createdAt.slice(0, 10);
        if (day in days) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date: toDayMonth(date), count }));
  }, [users]);

  // Net revenue (UAH, after Creem fees) taken in per day — the money pulse of
  // the last 30 days. Unlike a user count, this actually rises and falls.
  const revenueData = useMemo(() => {
    const now = new Date();
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      days[new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)] = 0;
    }
    payments
      .filter(p => p.status === 'approved')
      .forEach(p => {
        const day = (p.purchasedAt || p.createdAt || '').slice(0, 10);
        if (day in days) days[day] += paymentNetUah(p, rates);
      });
    return Object.entries(days).map(([date, uah]) => ({ date: toDayMonth(date), uah: Math.round(uah) }));
  }, [payments, rates]);

  if (usersLoading || paymentsLoading || ratesLoading) return <LoadingSkeleton />;

  const isRevenue = chartMode === 'revenue';
  const color = isRevenue ? '#3ddc97' : GOLD;
  const series = isRevenue
    ? revenueData.map(d => ({ date: d.date, v: d.uah }))
    : chartData.map(d => ({ date: d.date, v: d.count }));
  const seriesTotal = series.reduce((s, d) => s + d.v, 0);

  return (
    <div className="max-w-7xl">
      <PageHeader eyebrow="kroky" title="Overview" subtitle={<>{stats.totalUsers} користувачів · USD @ {rates.USD.toFixed(2)} (НБУ)</>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={0} label="Total users" value={stats.totalUsers} icon={<Users />} tone="teal" />
        <Kpi i={1} label="Active Pro" value={stats.activePro} icon={<Crown />} tone="gold" />
        <Kpi i={2} label="New this week" value={stats.newThisWeek} icon={<UserPlus />} tone="green"
          hint={<span className={stats.weekTrendPct >= 0 ? 'text-green' : 'text-red'}>{stats.weekTrendPct >= 0 ? '+' : ''}{stats.weekTrendPct}% vs мин. тиждень</span>} />
        <Kpi i={3} label="Conversion" value={`${stats.conversionRate}%`} icon={<Percent />} tone="blue" hint={`${stats.proBuyers} Pro-покупців`} />
      </div>

      <Panel i={4} gold className="mt-3 sm:mt-4" title="Revenue" icon={<Wallet className="w-4 h-4" />} right="net of Creem fees">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <div className="text-xs text-text-muted mb-1">Total</div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-accent leading-none">
              <AnimatedNumber value={stats.totalRevenue} /> <span className="text-lg font-bold text-accent/70">UAH</span>
            </div>
          </div>
          <div className="sm:border-l sm:border-border sm:pl-5">
            <div className="text-xs text-text-muted mb-1">Net profit (after 5% tax)</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-green leading-none">
              <AnimatedNumber value={stats.netProfit} /> <span className="text-base font-bold text-green/70">UAH</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel i={5} className="mt-3 sm:mt-4" title={isRevenue ? 'Revenue, 30 days' : 'New registrations, 30 days'} icon={<TrendingUp className="w-4 h-4" />}
        right={
          <div className="flex bg-surface rounded-lg p-0.5 border border-border">
            {CHART_MODES.map(m => (
              <button key={m} onClick={() => setChartMode(m)}
                className={`k-chip px-2.5 py-1 rounded-md text-xs font-semibold ${chartMode === m ? 'bg-accent text-[#1d1503]' : 'text-text-muted hover:text-text-primary'}`}>
                {m === 'signups' ? 'Sign-ups' : 'Revenue'}
              </button>
            ))}
          </div>
        }>
        <div className="flex items-baseline gap-2 -mt-1 mb-3">
          <span className="text-2xl font-extrabold text-text-primary"><AnimatedNumber value={seriesTotal} /></span>
          <span className="text-xs text-text-muted">{isRevenue ? 'UAH за 30 днів' : 'за 30 днів'}</span>
        </div>
        <div className="-mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="krokyArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1c3035" strokeDasharray="3 6" />
              <XAxis dataKey="date" tick={{ fill: '#6a8783', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: '#6a8783', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={44}
                tickFormatter={(v) => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`} />
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.35, strokeDasharray: '3 3' }}
                contentStyle={{ background: '#0e1a1d', border: '1px solid #1c3035', borderRadius: 12, color: '#ecf3f1' }}
                labelStyle={{ color: '#a3b8b4', fontSize: 12 }}
                itemStyle={{ color, fontWeight: 700 }}
                formatter={(v) => [isRevenue ? `${fmt(Number(v))} UAH` : v, isRevenue ? 'revenue' : 'sign-ups']}
              />
              <Area key={chartMode} type="monotone" dataKey="v" stroke={color} fill="url(#krokyArea)" strokeWidth={2.5}
                activeDot={{ r: 5, fill: color, stroke: '#081113', strokeWidth: 2 }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <SectionLabel i={6}>By country</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {COUNTRIES.map((c, idx) => {
          const st = stats[c.key];
          return (
            <Panel key={c.key} i={7 + idx} className="k-card-hover" title={<span className="flex items-center gap-2"><span className="text-lg leading-none">{c.flag}</span>{c.name}</span>}>
              <div className="text-2xl font-extrabold tracking-tight text-text-primary leading-none">
                <AnimatedNumber value={st.revenue} /> <span className="text-sm font-bold text-text-muted">{c.currency}</span>
              </div>
              <div className="text-xs text-green font-semibold mt-1.5">{fmt(st.afterTaxUah)} UAH після податку</div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/70">
                <MiniStat label="Sign-ups" value={st.registrations} />
                <MiniStat label="Payments" value={st.count} />
                <MiniStat label="Buyers" value={st.buyers} className="text-accent" />
              </div>
            </Panel>
          );
        })}
      </div>

      <SectionLabel i={11}>Conversion</SectionLabel>
      <Panel i={12} title="User → Pro" icon={<Globe2 className="w-4 h-4" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <MiniStat label="Pro buyers" value={stats.proBuyers} className="text-accent" />
          <MiniStat label="Pro purchases" value={stats.totalProPurchases} />
          <div className="relative group">
            <MiniStat label="Bought >1 week after signup" value={stats.slowConverters} />
            {stats.slowConverterEmails.length > 0 && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 k-card p-3 max-h-64 max-w-[calc(100vw-2rem)] overflow-auto">
                <div className="text-xs text-text-muted mb-1">Users ({stats.slowConverterEmails.length})</div>
                {stats.slowConverterEmails.map(email => (
                  <div key={email} className="text-xs text-text-primary whitespace-nowrap">{email}</div>
                ))}
              </div>
            )}
          </div>
          <div title={stats.peakDay ? `on ${toDayMonthYear(stats.peakDay)}` : undefined}>
            <MiniStat label={`Peak purchases / day${stats.peakDay ? ` (${toDayMonth(stats.peakDay)})` : ''}`} value={stats.peakPurchases} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
