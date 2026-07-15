export type ConversionTrigger = 'resume_export' | 'signature_export' | 'tracker_limit' | 'general';
export type ExportLang = 'ua' | 'en' | 'pl' | 'cs' | 'de';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;

  // Pro subscription (new monetization model — Apr 2026+)
  isPro?: boolean;
  proExpiresAt?: string;

  // Legacy per-template payments (pre-Apr 2026 model — kept for backward compat only)
  purchasedTemplates: string[];
  signaturePurchased?: boolean;
  purchasedSignatureTemplates?: string[];

  // Signature usage
  signatureOpened?: number;
  signatureTemplatesViewed?: string[];
  signatureCopies?: number;

  // Visit tracking
  visitCount?: number;
  lastVisitAt?: string;
  totalTimeOnSiteSec?: number;

  // Paywall (root-level legacy mirror; canonical lives in stats.totalPaywallViews)
  paywallViews?: number;

  // QR tracking
  qrOpened?: number;
  qrStylesViewed?: string[];
  qrDownloads?: number;
  qrData?: unknown;

  // Tracker tracking
  trackerOpened?: number;
  applicationsCreated?: number;

  // Activity stats
  stats?: {
    templatesOpened: string[];
    lastActiveAt: string;

    // Resume exports — legacy + new naming
    freeDownloads?: number;
    premiumDownloads?: number;
    watermarkedExports?: number;
    cleanExports?: number;

    // Resume exports breakdown
    exportsByLang?: Partial<Record<ExportLang, number>>;
    exportsByTheme?: Record<string, number>;
    exportsByThemeUsage?: { default?: number; custom?: number };

    // Pro / Conversion
    proPurchases?: number;
    firstProPurchaseAt?: string;
    lastProPurchaseAt?: string;
    totalSpentUah?: number;
    firstConversionTrigger?: ConversionTrigger;
    convertedViaTrigger?: ConversionTrigger;

    // Paywall breakdown
    totalPaywallViews?: number;
    paywallViewsByTrigger?: Partial<Record<ConversionTrigger, number>>;

    // Tracker
    trackerLimitReached?: number;
  };

  // Acquisition
  acquisition?: {
    referrer: string;
    landingPage: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    // Locale chosen at signup (added later; undefined on legacy users).
    signupLocale?: 'uk' | 'pl' | 'en';
  };
}

export interface PaymentRecord {
  orderReference: string;
  uid: string;
  templateId: string;
  amount: string;
  status: 'created' | 'pending' | 'approved' | 'failed';
  granted: boolean;
  createdAt: string;
  updatedAt?: string;
  // NEW (optional, present on newer records)
  productType?: 'pro' | 'resume_template' | 'signature_one_time' | 'legacy_migration';
  productId?: string;
  purchasedAt?: string;
  expiresAt?: string;
  trigger?: ConversionTrigger;
  locale?: 'uk' | 'pl' | 'en';
  currency?: 'UAH' | 'PLN' | 'USD';
}
