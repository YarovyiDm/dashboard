import { useMemo } from 'react';
import { Download, Crown, Droplets, Users, Filter, Star, Globe, Palette, Archive } from 'lucide-react';
import { useKrokyUsers, useKrokyPayments } from '../../hooks/useKrokyData';
import { getWatermarkedExports, getCleanExports, getTotalExports, ALL_LANGS, LANG_LABELS } from '../../lib/krokyFields';
import type { ExportLang } from '../../types';
import { PageHeader, Panel, Kpi, StackBar, BarList, Ring, LoadingSkeleton, AnimatedNumber, MiniStat } from '../../components/ui';
import { GOLD, TEAL, stagger, fmt } from '../../lib/theme';

const TEMPLATE_NAMES: Record<string, string> = {
  classic: 'Classic', modern: 'Modern', creative: 'Creative', minimal: 'Minimal',
  executive: 'Executive', tech: 'Tech', bold: 'Bold', startup: 'Startup',
  timeline: 'Timeline', academic: 'Academic', qa: 'QA', design: 'Design/UX',
  finance: 'Finance', twocol: 'Two Column', photo: 'Photo', infographic: 'Infographic',
  cover: 'Cover Letter', medical: 'Medical', teacher: 'Teacher', lawyer: 'Lawyer',
  marketing: 'Marketing', manager: 'Manager', darkminimal: 'Dark Minimal',
};

const LANG_FLAGS: Record<ExportLang, string> = { ua: '🇺🇦', en: '🇬🇧', pl: '🇵🇱', cs: '🇨🇿', de: '🇩🇪' };

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Legacy per-template purchases (pre-Pro model).
const isLegacyTemplatePayment = (p: { status: string; templateId: string; productType?: string }) =>
  p.status === 'approved' && p.templateId !== 'pro' && p.templateId !== 'sig_oneTime' &&
  p.productType !== 'pro' && p.productType !== 'signature_one_time';

export function KrokyResume() {
  const { users, loading: usersLoading } = useKrokyUsers();
  const { payments, loading: paymentsLoading } = useKrokyPayments();

  const data = useMemo(() => {
    const watermarked = users.reduce((s, u) => s + getWatermarkedExports(u), 0);
    const clean = users.reduce((s, u) => s + getCleanExports(u), 0);
    const total = watermarked + clean;

    // Funnel: signed up → opened a template → exported a PDF → exported clean (Pro).
    const opened = users.filter(u => (u.stats?.templatesOpened?.length ?? 0) > 0).length;
    const exporters = users.filter(u => getTotalExports(u) > 0).length;
    const proExporters = users.filter(u => getCleanExports(u) > 0).length;

    // Template popularity = how many users opened each template.
    const templateCount: Record<string, number> = {};
    users.forEach(u => u.stats?.templatesOpened?.forEach(t => { templateCount[t] = (templateCount[t] || 0) + 1; }));
    const topTemplates = Object.entries(templateCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ id, name: TEMPLATE_NAMES[id] || id, count }));

    const langTotals = ALL_LANGS.map(lang => ({
      lang,
      count: users.reduce((s, u) => s + (u.stats?.exportsByLang?.[lang] || 0), 0),
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    const langSum = langTotals.reduce((s, d) => s + d.count, 0);

    let custom = 0, def = 0;
    users.forEach(u => {
      custom += u.stats?.exportsByThemeUsage?.custom ?? 0;
      def += u.stats?.exportsByThemeUsage?.default ?? 0;
    });
    const themeCount: Record<string, number> = {};
    users.forEach(u => Object.entries(u.stats?.exportsByTheme ?? {}).forEach(([id, n]) => {
      themeCount[id] = (themeCount[id] || 0) + (n || 0);
    }));
    const topThemes = Object.entries(themeCount).sort(([, a], [, b]) => b - a).slice(0, 8);

    const legacy = payments.filter(isLegacyTemplatePayment);
    const legacyRevenue = legacy.reduce((s, p) => s + Number(p.amount || 0), 0);

    return {
      watermarked, clean, total, opened, exporters, proExporters, topTemplates,
      distinctTemplates: Object.keys(templateCount).length,
      langTotals, langSum, custom, def, topThemes,
      legacyCount: legacy.length, legacyRevenue,
    };
  }, [users, payments]);

  if (usersLoading || paymentsLoading) return <LoadingSkeleton />;

  const funnel = [
    { label: 'Зареєструвались', value: users.length, color: '#3a5257' },
    { label: 'Відкрили шаблон', value: data.opened, color: TEAL },
    { label: 'Експортували PDF', value: data.exporters, color: '#5cb8ff' },
    { label: 'Чистий експорт (Pro)', value: data.proExporters, color: GOLD },
  ];
  const themeTotal = data.custom + data.def;

  return (
    <div className="max-w-7xl">
      <PageHeader
        eyebrow="kroky"
        title="Resume"
        subtitle={<>Конструктор резюме · {users.length} користувачів · {data.distinctTemplates} шаблонів у використанні</>}
      />

      {/* Headline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi i={0} label="PDF exports" value={data.total} icon={<Download />} tone="gold"
          hint={data.exporters ? `${(data.total / data.exporters).toFixed(1)} на експортера` : undefined} />
        <Kpi i={1} label="Clean (Pro)" value={data.clean} icon={<Crown />} tone="gold" hint={`${pct(data.clean, data.total)}% від усіх`} />
        <Kpi i={2} label="Watermarked" value={data.watermarked} icon={<Droplets />} tone="muted" hint={`${pct(data.watermarked, data.total)}% від усіх`} />
        <Kpi i={3} label="Exporters" value={data.exporters} icon={<Users />} tone="teal" hint={`${pct(data.exporters, users.length)}% користувачів`} />
      </div>

      {/* Funnel + mix */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <Panel i={4} className="lg:col-span-3" title="Resume funnel" icon={<Filter className="w-4 h-4" />}
          right={<span>{pct(data.proExporters, users.length)}% до Pro-експорту</span>}>
          <div className="space-y-3.5">
            {funnel.map((step, idx) => {
              const prev = idx > 0 ? funnel[idx - 1].value : null;
              return (
                <div key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-sm text-text-secondary truncate">{step.label}</span>
                    <span className="flex items-baseline gap-2 shrink-0">
                      {prev !== null && (
                        <span className="text-[11px] font-semibold text-text-muted">{pct(step.value, prev)}% з попер.</span>
                      )}
                      <span className="text-lg font-extrabold text-text-primary tabular-nums"><AnimatedNumber value={step.value} /></span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-hover overflow-hidden">
                    <div className="k-grow h-full rounded-full"
                      style={{ width: `${Math.max(1.5, pct(step.value, users.length))}%`, background: step.color, ...stagger(idx) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel i={5} className="lg:col-span-2 flex flex-col" title="Export mix" icon={<Download className="w-4 h-4" />}>
          <div className="flex-1 flex items-center justify-center gap-6 py-2">
            <Ring value={data.total ? data.clean / data.total : 0}>
              <div>
                <div className="text-2xl font-extrabold text-accent leading-none"><AnimatedNumber value={pct(data.clean, data.total)} />%</div>
                <div className="text-[11px] text-text-muted mt-1">clean</div>
              </div>
            </Ring>
            <div className="space-y-3 min-w-0">
              <MiniStat label="Clean (Pro)" value={data.clean} className="text-accent" />
              <MiniStat label="Watermarked" value={data.watermarked} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Templates + languages */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <Panel i={6} className="lg:col-span-3" title="Top templates" icon={<Star className="w-4 h-4" />} right="users who opened">
          <BarList
            empty="Ще ніхто не відкривав шаблони"
            rows={data.topTemplates.map((t, idx) => ({
              key: t.id,
              value: t.count,
              label: (
                <span className="inline-flex items-center gap-2.5">
                  <span className={`w-5 text-center text-xs font-extrabold ${idx < 3 ? 'text-accent' : 'text-text-muted'}`}>{idx + 1}</span>
                  {t.name}
                </span>
              ),
              extra: <>{t.count} <span className="text-text-muted font-medium text-xs">· {pct(t.count, data.opened)}%</span></>,
            }))}
          />
        </Panel>

        <Panel i={7} className="lg:col-span-2" title="Export languages" icon={<Globe className="w-4 h-4" />} right={`${fmt(data.langSum)} total`}>
          <BarList
            color={TEAL}
            empty="Немає даних"
            rows={data.langTotals.map(d => ({
              key: d.lang,
              value: d.count,
              label: <span className="inline-flex items-center gap-2"><span className="text-base leading-none">{LANG_FLAGS[d.lang]}</span>{LANG_LABELS[d.lang]}</span>,
              extra: <>{d.count} <span className="text-text-muted font-medium text-xs">· {pct(d.count, data.langSum)}%</span></>,
            }))}
          />
        </Panel>
      </div>

      {/* Themes */}
      {themeTotal > 0 && (
        <Panel i={8} className="mt-3 sm:mt-4" title="Theme customization" icon={<Palette className="w-4 h-4" />}
          right={<span>Custom <span className="text-accent font-bold">{pct(data.custom, themeTotal)}%</span></span>}>
          <div className="grid md:grid-cols-5 gap-6 items-start">
            <div className="md:col-span-2">
              <StackBar segments={[
                { label: 'Custom theme', value: data.custom, color: GOLD },
                { label: 'Default theme', value: data.def, color: '#3a5257' },
              ]} />
            </div>
            <div className="md:col-span-3">
              <div className="text-[11px] uppercase tracking-wider text-text-muted mb-2 px-2.5">Top themes by exports</div>
              <BarList mono color={GOLD} rows={data.topThemes.map(([id, n]) => ({ key: id, label: id, value: n }))} />
            </div>
          </div>
        </Panel>
      )}

      {/* Legacy (pre-Pro) template sales — kept as a single footnote. */}
      {data.legacyCount > 0 && (
        <div className="k-rise flex items-center gap-2 mt-4 text-xs text-text-muted" style={stagger(9)}>
          <Archive className="w-3.5 h-3.5" />
          Legacy template sales: {data.legacyCount} · {fmt(data.legacyRevenue)} UAH
        </div>
      )}
    </div>
  );
}
