import type { ConversionTrigger, ExportLang, UserProfile } from '../types';

export const LANG_LABELS: Record<ExportLang, string> = {
  ua: 'Ukrainian',
  en: 'English',
  pl: 'Polish',
  cs: 'Czech',
  de: 'German',
};

export const ALL_LANGS: ExportLang[] = ['ua', 'en', 'pl', 'cs', 'de'];

export const TRIGGER_LABELS: Record<ConversionTrigger, string> = {
  resume_export: 'Resume export',
  signature_export: 'Signature export',
  tracker_limit: 'Tracker limit',
  general: 'General CTA',
};

export const ALL_TRIGGERS: ConversionTrigger[] = [
  'resume_export',
  'signature_export',
  'tracker_limit',
  'general',
];

/** PDF with watermark (free user). New: stats.watermarkedExports, legacy: stats.freeDownloads. */
export function getWatermarkedExports(u: UserProfile): number {
  return u.stats?.watermarkedExports ?? u.stats?.freeDownloads ?? 0;
}

/** PDF without watermark (Pro user). New: stats.cleanExports, legacy: stats.premiumDownloads. */
export function getCleanExports(u: UserProfile): number {
  return u.stats?.cleanExports ?? u.stats?.premiumDownloads ?? 0;
}

export function getTotalExports(u: UserProfile): number {
  return getWatermarkedExports(u) + getCleanExports(u);
}

/** Total paywall views — new stats.totalPaywallViews mirrors legacy root paywallViews. */
export function getTotalPaywallViews(u: UserProfile): number {
  return u.stats?.totalPaywallViews ?? u.paywallViews ?? 0;
}

export type ProStatus = 'active' | 'expired' | 'never';

export function getProStatus(u: UserProfile): { status: ProStatus; daysLeft: number | null } {
  if (!u.isPro) return { status: 'never', daysLeft: null };
  if (!u.proExpiresAt) return { status: 'expired', daysLeft: null };
  const expiresAt = new Date(u.proExpiresAt).getTime();
  const now = Date.now();
  if (expiresAt <= now) return { status: 'expired', daysLeft: 0 };
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  return { status: 'active', daysLeft };
}

export function isProActive(u: UserProfile): boolean {
  return getProStatus(u).status === 'active';
}

export function getProPurchaseDate(u: UserProfile): string | null {
  return u.stats?.lastProPurchaseAt ?? u.stats?.firstProPurchaseAt ?? null;
}

export function getCustomThemeShare(u: UserProfile): { custom: number; total: number } {
  const usage = u.stats?.exportsByThemeUsage;
  const custom = usage?.custom ?? 0;
  const def = usage?.default ?? 0;
  return { custom, total: custom + def };
}
