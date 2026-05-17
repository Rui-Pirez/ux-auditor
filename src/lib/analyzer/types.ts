export type Severity = 'critical' | 'high' | 'moderate' | 'low';

export type CategoryId =
  | 'accessibility'
  | 'usability'
  | 'visual'
  | 'cognitive'
  | 'conversion'
  | 'trust';

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  accessibility: 'Accessibility',
  usability: 'Usability',
  visual: 'Visual Hierarchy',
  cognitive: 'Cognitive Load',
  conversion: 'Conversion',
  trust: 'Trust & Credibility',
};

export const CATEGORY_BENCHMARKS: Record<CategoryId, number> = {
  accessibility: 62,
  usability: 71,
  visual: 68,
  cognitive: 74,
  conversion: 58,
  trust: 76,
};

export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  accessibility: 0.20,
  usability: 0.20,
  visual: 0.15,
  cognitive: 0.15,
  conversion: 0.20,
  trust: 0.10,
};

// ── Issue ──────────────────────────────────────────────────────────────────────

export interface Issue {
  id: string;
  title: string;
  category: CategoryId;
  severity: Severity;
  impact: 'High' | 'Medium' | 'Low';
  principle: string;
  whyItMatters: string;
  evidence: string;
  specificFix: string;
  quickWin: boolean;
  scoreDeduction: number;
}

export interface CategoryResult {
  id: CategoryId;
  label: string;
  score: number;
  issues: Issue[];
  industryBenchmark: number;
}

// ── Playwright browser capture ─────────────────────────────────────────────────

export interface ContrastIssue {
  text: string;
  textColor: string;
  bgColor: string;
  ratio: number;
  required: number;
  fontSize: number;
  isLargeText: boolean;
  tag: string;
}

export interface TouchTargetIssue {
  text: string;
  width: number;
  height: number;
  tag: string;
}

export interface HeadingEntry {
  level: number;
  text: string;
  fontSize: number;
}

export interface A11yNode {
  role?: string;
  name?: string;
  description?: string;
  level?: number;
  checked?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  required?: boolean;
  valuetext?: string;
  children?: A11yNode[];
}

export interface BrowserCapture {
  // Real screenshot from the browser (data URL)
  screenshotDataUrl: string;

  // Fully-rendered HTML (after JS execution)
  renderedHtml: string;

  // Actual final URL after redirects
  finalUrl: string;

  // HTTP status
  responseStatus: number;

  // Computed style analysis
  colorContrastIssues: ContrastIssue[];
  touchTargetIssues: TouchTargetIssue[];
  bodyFontSizePx: number;
  h1FontSizePx: number;
  ctaAboveFold: boolean;
  headingsFromDOM: HeadingEntry[];

  // Accessibility tree
  accessibilityTree: A11yNode | null;
  a11yViolations: string[];

  // Performance
  renderTimeMs: number;
  domContentLoadedMs: number;
  largestContentfulPaintMs: number;

  // Console & network
  consoleErrors: string[];
  brokenResources: string[];
  resourceCount: number;

  // Page metadata
  viewportWidth: number;
  viewportHeight: number;
  pageHeightPx: number;
}

// ── HTML-parsed page data ─────────────────────────────────────────────────────

export interface ParsedPage {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  lang: string;
  isHttps: boolean;
  hasViewport: boolean;
  hasLang: boolean;
  hasCanonical: boolean;
  hasFavicon: boolean;
  hasSchemaMarkup: boolean;
  h1Tags: string[];
  headings: Array<{ level: number; text: string }>;
  imagesTotal: number;
  imagesWithoutAlt: string[];
  imagesWithEmptyAlt: number;
  imagesWithoutDimensions: number;
  inputsTotal: number;
  inputsWithoutLabel: string[];
  buttons: string[];
  formFields: number;
  navItems: string[];
  hasSearch: boolean;
  hasBreadcrumbs: boolean;
  hasFooter: boolean;
  sectionCount: number;
  listCount: number;
  tableCount: number;
  totalLinks: number;
  externalLinksTotal: number;
  externalLinksWithoutNoopener: number;
  genericLinks: string[];
  iframesWithoutTitle: number;
  hasAutoplayMedia: boolean;
  hasPrivacyPolicy: boolean;
  hasTerms: boolean;
  hasContactInfo: boolean;
  hasCopyright: boolean;
  hasSocialMedia: boolean;
  hasSocialProof: boolean;
  hasSkipLink: boolean;
  wordCount: number;
  ctaButtons: string[];
}

// ── Final audit result ────────────────────────────────────────────────────────

export interface AuditResult {
  url: string;
  domain: string;
  analyzedAt: string;
  screenshotUrl: string;          // data URL from Playwright
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  categories: CategoryResult[];
  allIssues: Issue[];
  quickWins: Issue[];
  metadata: ParsedPage;
  browser: BrowserSummary;        // key browser metrics for the dashboard
  error?: string;
}

export interface BrowserSummary {
  renderTimeMs: number;
  domContentLoadedMs: number;
  largestContentfulPaintMs: number;
  colorContrastFailures: number;
  touchTargetFailures: number;
  consoleErrors: number;
  brokenResources: number;
  bodyFontSizePx: number;
  pageHeightPx: number;
  ctaAboveFold: boolean;
}
