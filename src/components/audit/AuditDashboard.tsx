'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { AuditResult, Issue, CategoryId } from '@/lib/analyzer';
import { IssueCard } from './IssueCard';
import {
  Download, RefreshCw, ToggleLeft, ToggleRight, ChevronRight,
  ExternalLink, AlertCircle, AlertTriangle, Info, Zap,
  ShieldCheck, MousePointerClick, LayoutDashboard, Brain, TrendingUp, BadgeCheck,
  Filter, ImageOff, Timer, Gauge, MonitorSmartphone, Terminal,
} from 'lucide-react';

// ── CONSTANTS ──────────────────────────────────────────────────────────────────

// Maps each issue ID to its approximate page region as a percentage of the viewport
// x = horizontal %, y = vertical % of the screenshot height
const ISSUE_COORDS: Record<string, { x: number; y: number; zone: string }> = {
  // Browser chrome / meta (conceptually at very top)
  'a11y-missing-title':       { x: 52, y: 2,  zone: 'Browser title bar' },
  'usability-meta-desc':      { x: 70, y: 2,  zone: 'Search snippet' },
  'usability-title-long':     { x: 52, y: 2,  zone: 'Browser title' },
  'usability-title-short':    { x: 52, y: 2,  zone: 'Browser title' },
  'a11y-lang':                { x: 90, y: 2,  zone: 'HTML root' },
  'a11y-viewport':            { x: 78, y: 2,  zone: 'Meta viewport' },
  'usability-canonical':      { x: 60, y: 2,  zone: 'Canonical tag' },
  'usability-favicon':        { x: 8,  y: 2,  zone: 'Browser favicon' },
  'trust-no-https':           { x: 10, y: 2,  zone: 'URL bar (not secure)' },
  'usability-og-tags':        { x: 85, y: 2,  zone: 'Social share preview' },

  // Navigation bar (top ~5-14%)
  'cognitive-nav-overload':   { x: 55, y: 8,  zone: 'Navigation bar' },
  'usability-no-search':      { x: 80, y: 8,  zone: 'Nav search area' },
  'a11y-skip-link':           { x: 6,  y: 5,  zone: 'Skip nav button' },
  'usability-breadcrumbs':    { x: 16, y: 16, zone: 'Breadcrumb area' },

  // Hero / above-fold (14–38%)
  'visual-missing-h1':        { x: 42, y: 24, zone: 'Hero heading' },
  'visual-multiple-h1':       { x: 42, y: 22, zone: 'Primary heading' },
  'visual-heading-hierarchy': { x: 36, y: 32, zone: 'Content headings' },
  'conversion-no-cta':        { x: 50, y: 34, zone: 'Above-fold CTA area' },
  'conversion-weak-cta':      { x: 50, y: 36, zone: 'CTA button' },
  'conversion-weak-value-prop':{ x: 44, y: 20, zone: 'Hero headline' },
  'usability-generic-buttons':{ x: 48, y: 38, zone: 'Action buttons' },

  // Mid-page content (38–65%)
  'a11y-missing-alt':         { x: 44, y: 43, zone: 'Image elements' },
  'a11y-generic-links':       { x: 30, y: 46, zone: 'Content links' },
  'visual-no-structure':      { x: 50, y: 48, zone: 'Content sections' },
  'visual-no-lists':          { x: 38, y: 52, zone: 'Content body' },
  'cognitive-content-density':{ x: 46, y: 54, zone: 'Content body' },
  'cognitive-cta-overload':   { x: 54, y: 44, zone: 'Multiple CTAs' },
  'conversion-no-social-proof':{ x: 56, y: 60, zone: 'Social proof section' },
  'a11y-iframe-title':        { x: 58, y: 50, zone: 'Embedded content' },
  'cognitive-autoplay':       { x: 60, y: 42, zone: 'Media element' },

  // Form area (52–72%)
  'a11y-input-labels':        { x: 42, y: 60, zone: 'Form inputs' },
  'cognitive-long-form':      { x: 46, y: 64, zone: 'Form section' },

  // Footer (78–97%)
  'trust-no-privacy':         { x: 36, y: 88, zone: 'Footer — privacy' },
  'trust-no-contact':         { x: 56, y: 90, zone: 'Footer — contact' },
  'trust-no-copyright':       { x: 50, y: 94, zone: 'Footer — copyright' },
  'trust-no-social':          { x: 72, y: 88, zone: 'Footer — social links' },

  // Security (overlays link elements)
  'a11y-noopener':            { x: 32, y: 46, zone: 'External links' },
};

// ── HELPERS ────────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#84cc16';
  if (s >= 50) return '#f59e0b';
  if (s >= 35) return '#f97316';
  return '#ef4444';
}

function severityLabel(s: string): string {
  return s === 'moderate' ? 'MEDIUM' : s.toUpperCase();
}

const SEV: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  critical: { bg: 'bg-red-100',    text: 'text-red-600',    dot: '#ef4444', ring: '#ef4444' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-600', dot: '#f97316', ring: '#f97316' },
  moderate: { bg: 'bg-violet-100', text: 'text-violet-600', dot: '#7c3aed', ring: '#7c3aed' },
  low:      { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: '#94a3b8', ring: '#94a3b8' },
};

const CAT_LABELS: Record<string, string> = {
  accessibility: 'ACCESSIBILITY',
  usability:     'USABILITY',
  visual:        'VISUAL HIERARCHY',
  cognitive:     'COGNITIVE LOAD',
  conversion:    'CONVERSION',
  trust:         'TRUST & CREDIBILITY',
};

const CAT_ICONS: Record<string, React.ElementType> = {
  accessibility: ShieldCheck,
  usability:     MousePointerClick,
  visual:        LayoutDashboard,
  cognitive:     Brain,
  conversion:    TrendingUp,
  trust:         BadgeCheck,
};

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

function RingGauge({ score, size = 52, color }: { score: number; size?: number; color: string }) {
  const sw = 5, r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

/** Colored circular pin for the screenshot heatmap */
function IssuePin({
  issue, index, active, pos,
  onClick,
}: {
  issue: Issue; index: number; active: boolean;
  pos: { x: number; y: number; zone: string };
  onClick: () => void;
}) {
  const sev = SEV[issue.severity] ?? SEV.low;
  return (
    <button
      onClick={onClick}
      title={`${pos.zone}: ${issue.title}`}
      className="absolute z-10 focus:outline-none group"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {/* Pulse ring */}
      {(issue.severity === 'critical' || issue.severity === 'high') && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ backgroundColor: sev.dot, animationDuration: '2s' }}
        />
      )}
      {/* Pin body */}
      <span
        className="relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white shadow-lg transition-transform duration-200"
        style={{
          backgroundColor: sev.dot,
          transform: active ? 'scale(1.35)' : 'scale(1)',
        }}
      >
        {index + 1}
      </span>
      {/* Tooltip — flips direction based on pin position to stay inside the container */}
      <span className={[
        'pointer-events-none absolute z-20 w-max max-w-[190px] rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100',
        // vertical: below pin when near the top, above otherwise
        pos.y < 18 ? 'top-full mt-2' : 'bottom-full mb-2',
        // horizontal: right-align when near right edge, left-align when near left edge, centre otherwise
        pos.x > 68 ? 'right-0' : pos.x < 32 ? 'left-0' : 'left-1/2 -translate-x-1/2',
      ].join(' ')}>
        <span className="block font-semibold leading-snug">{pos.zone}</span>
        <span className="block text-zinc-400 leading-snug break-words">{issue.title}</span>
      </span>
    </button>
  );
}

/** Full-page scrollable screenshot with zoom and heatmap markers */
function VisualAuditPanel({
  result, activePin, setActivePin,
}: {
  result: AuditResult;
  activePin: string | null;
  setActivePin: (id: string | null) => void;
}) {
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [scale, setScale]       = useState(1.0);
  const scrollRef               = useRef<HTMLDivElement>(null);

  const severityOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
  const pins = result.allIssues
    .filter(i => ISSUE_COORDS[i.id])
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 10);

  function changeScale(delta: number) {
    setScale(prev => Math.min(3, Math.max(0.25, parseFloat((prev + delta).toFixed(2)))));
  }

  function openFullPage() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>Full Page — ${result.domain}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}
        body{background:#111;display:flex;justify-content:center;min-height:100vh}
        img{display:block;max-width:100%;height:auto}
      </style></head><body>
      <img src="${result.screenshotUrl}" alt="Full page screenshot of ${result.domain}" />
      </body></html>`);
    win.document.close();
  }

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2">
        {/* Zoom controls */}
        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mr-1">Zoom</span>
        <button
          onClick={() => changeScale(-0.25)}
          disabled={scale <= 0.25}
          className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
        >−</button>
        <span className="w-10 text-center text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => changeScale(0.25)}
          disabled={scale >= 3}
          className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
        >+</button>
        <button
          onClick={() => setScale(1)}
          className="ml-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >Fit</button>

        <div className="ml-auto flex items-center gap-2">
          {imgState === 'ok' && (
            <>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:block">↕ Scroll to view full page</span>
              <button
                onClick={openFullPage}
                className="flex items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Full page
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Scrollable preview ── */}
      <div
        ref={scrollRef}
        className="overflow-auto bg-zinc-100 dark:bg-zinc-800"
        style={{ maxHeight: '620px', minHeight: '200px' }}
      >
        {/* Loading skeleton */}
        {imgState === 'loading' && (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="text-xs text-zinc-400">Rendering full page screenshot…</p>
          </div>
        )}

        {/* Error state */}
        {imgState === 'error' && (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <ImageOff className="h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-400">{result.domain}</p>
            <p className="text-xs text-zinc-300">Screenshot unavailable</p>
          </div>
        )}

        {/* Image + markers at zoom level */}
        <div
          className="relative origin-top-left"
          style={{
            width:    `${scale * 100}%`,
            minWidth: `${scale * 100}%`,
          }}
        >
          <img
            src={result.screenshotUrl}
            alt={`Full page screenshot of ${result.domain}`}
            className={`w-full h-auto block transition-opacity duration-500 select-none ${imgState === 'ok' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
            draggable={false}
            onLoad={() => setImgState('ok')}
            onError={() => setImgState('error')}
          />

          {/* Subtle overlay so markers are readable */}
          {imgState === 'ok' && (
            <div className="absolute inset-0 pointer-events-none bg-black/5" />
          )}

          {/* Issue markers */}
          {imgState === 'ok' && pins.map((issue, i) => {
            const pos = ISSUE_COORDS[issue.id]!;
            return (
              <IssuePin
                key={issue.id}
                issue={issue}
                index={i}
                pos={pos}
                active={activePin === issue.id}
                onClick={() => setActivePin(activePin === issue.id ? null : issue.id)}
              />
            );
          })}

          {/* Viewport fold line */}
          {imgState === 'ok' && (
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-violet-400/50 pointer-events-none"
              style={{ top: `${(800 / 4200) * 100}%` }}  // approx first viewport fold
            >
              <span className="absolute right-2 -top-4 rounded bg-violet-500/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                ↑ Above fold
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      {imgState === 'ok' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2">
          {(['critical', 'high', 'moderate', 'low'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEV[s].dot }} />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{s === 'moderate' ? 'Medium' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          ))}
          <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">{pins.length} issues mapped · Playwright full-page JPEG</span>
        </div>
      )}
    </div>
  );
}

// ── After-mockup generator ────────────────────────────────────────────────────

const ISSUE_BEFORE_AFTER: Record<string, (r: AuditResult) => { before: string; after: string }> = {
  'a11y-missing-alt': r => ({
    before: `${r.metadata.imagesWithoutAlt.length} &lt;img&gt; tags have no alt attribute:\n&lt;img src="${r.metadata.imagesWithoutAlt[0] ?? 'banner.jpg'}"&gt;`,
    after:  `Add descriptive alt text to every non-decorative image:\n&lt;img src="${r.metadata.imagesWithoutAlt[0] ?? 'banner.jpg'}" alt="[What the image shows in context]"&gt;`,
  }),
  'a11y-missing-title': () => ({
    before: 'No &lt;title&gt; tag in &lt;head&gt; — browser tab shows blank or URL',
    after:  '&lt;title&gt;Page Purpose — Brand Name&lt;/title&gt;\nKeep under 60 characters, lead with the page descriptor.',
  }),
  'a11y-input-labels': r => ({
    before: `${r.metadata.inputsWithoutLabel.length} inputs have no label:\n&lt;input type="email" placeholder="Email"&gt;`,
    after:  '&lt;label for="email"&gt;Email address&lt;/label&gt;\n&lt;input type="email" id="email"&gt;',
  }),
  'a11y-viewport': () => ({
    before: 'No &lt;meta name="viewport"&gt; — mobile browsers render at desktop width',
    after:  '&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;',
  }),
  'a11y-lang': () => ({
    before: '&lt;html&gt; — no lang attribute, screen readers use OS default',
    after:  '&lt;html lang="en"&gt;',
  }),
  'a11y-color-contrast': r => ({
    before: `${r.browser.colorContrastFailures} element(s) fail WCAG 1.4.3\nExample: light gray text #999 on white = 2.9:1 contrast`,
    after:  'Darken gray text: #999 → #767676 achieves 4.54:1 (AA pass)\nUse WebAIM Contrast Checker to verify every text/bg pair.',
  }),
  'a11y-touch-targets': r => ({
    before: `${r.browser.touchTargetFailures} buttons/links under 44×44px\nExample: icon buttons rendered at 28×28px`,
    after:  'Add padding to hit 44px minimum:\n.icon-btn { padding: 10px; min-height: 44px; min-width: 44px; }',
  }),
  'usability-meta-desc': r => ({
    before: 'No &lt;meta name="description"&gt; — Google auto-generates snippet from body text',
    after:  `&lt;meta name="description" content="[Primary benefit] for [audience]. [Secondary differentiator]. [Soft CTA]."&gt;\nTarget: 130–155 characters.`,
  }),
  'usability-og-tags': r => ({
    before: 'Missing og:title, og:description, og:image — social shares show raw URL',
    after:  `&lt;meta property="og:title" content="${r.metadata.title || 'Page Title'}"&gt;\n&lt;meta property="og:image" content="https://${r.domain}/og-image.jpg"&gt; (1200×630px)`,
  }),
  'usability-title-long': r => ({
    before: `"${(r.metadata.title ?? '').substring(0, 70)}…"\nAt ${r.metadata.title?.length} chars, Google truncates after ~60`,
    after:  `Trim to under 60 chars:\n"${(r.metadata.title ?? '').substring(0, 55)}…"\nLead with the unique page descriptor, then brand.`,
  }),
  'usability-favicon': () => ({
    before: 'No &lt;link rel="icon"&gt; — browser shows generic blank-page icon in tabs',
    after:  '&lt;link rel="icon" href="/favicon.ico"&gt;\n&lt;link rel="icon" type="image/svg+xml" href="/icon.svg"&gt;\n&lt;link rel="apple-touch-icon" href="/apple-icon.png"&gt;',
  }),
  'visual-missing-h1': r => ({
    before: 'Zero &lt;h1&gt; elements on the page — no primary topic signal for SEO or screen readers',
    after:  `Add one H1 that clearly states the page purpose:\n&lt;h1&gt;${r.metadata.title ? r.metadata.title.split('|')[0].split('–')[0].trim() : 'Your Primary Value Proposition Here'}&lt;/h1&gt;`,
  }),
  'visual-multiple-h1': r => ({
    before: `${r.metadata.h1Tags.length} H1 tags compete for SEO authority:\n${r.metadata.h1Tags.slice(0,2).map(h=>`"${h}"`).join(' and ')}`,
    after:  `Keep one H1 — your primary page purpose. Demote others to H2:\n&lt;h2&gt;${r.metadata.h1Tags[1] ?? 'Section Heading'}&lt;/h2&gt;`,
  }),
  'visual-no-structure': () => ({
    before: 'All content in generic &lt;div&gt; wrappers — no semantic meaning for crawlers or a11y',
    after:  '&lt;main&gt; for primary content\n&lt;section&gt; for thematic groups\n&lt;article&gt; for standalone content\n&lt;aside&gt; for supplementary content',
  }),
  'cognitive-nav-overload': r => ({
    before: `Navigation has ${r.metadata.navItems.length} items — exceeds Miller's Law (7±2):\n${r.metadata.navItems.slice(0,6).join(' | ')}…`,
    after:  `Reduce to 5 top-level items. Group related pages under dropdowns:\n${r.metadata.navItems.slice(0, 4).join(' | ')} | More ▾`,
  }),
  'conversion-no-cta': () => ({
    before: 'No call-to-action button detected — intent-driven visitors have no next step',
    after:  'Add one prominent above-fold CTA:\n[Action Verb] + [My/Your] + [Value]\ne.g. "Start My Free Trial" or "Get My Free Audit"',
  }),
  'conversion-weak-cta': r => ({
    before: `CTA button labeled "${r.metadata.ctaButtons[0] ?? 'Submit'}" — focuses on effort, not value`,
    after:  '"Submit" → "Send My Request"\n"Go" → "See My Results"\n"Continue" → "Build My Plan"',
  }),
  'conversion-no-social-proof': () => ({
    before: 'No testimonials, ratings, or client logos — visitors must trust claims without validation',
    after:  '1. Add 2–3 specific testimonials (name + role + company)\n2. A recognisable client logo strip\n3. An aggregate stat: "4.9/5 on G2" or "2,400+ teams"',
  }),
  'trust-no-https': () => ({
    before: 'Site served over HTTP — browsers display "Not Secure" warning',
    after:  '1. Get free SSL via Let\'s Encrypt (certbot)\n2. Redirect all HTTP → HTTPS (301)\n3. Add HSTS header: Strict-Transport-Security: max-age=31536000',
  }),
  'trust-no-privacy': () => ({
    before: 'No privacy policy link — required by GDPR, CCPA if any tracking/forms exist',
    after:  'Add to footer on every page:\n&lt;a href="/privacy"&gt;Privacy Policy&lt;/a&gt;\nGenerate compliant text at iubenda.com or termly.io',
  }),
  'trust-no-contact': () => ({
    before: 'No email, phone, or contact page link — #2 reason users distrust sites',
    after:  'Add to footer: email address + /contact link\nOptionally: physical city, phone number\nFor high-intent pages: live chat widget',
  }),
  'trust-no-copyright': () => ({
    before: 'No © notice in footer — page looks unfinished or abandoned',
    after:  '&copy; 2025 Company Name. All rights reserved.\nUse a dynamic year: &copy; ${new Date().getFullYear()} …',
  }),
  'usability-slow-lcp': r => ({
    before: `LCP: ${r.browser.largestContentfulPaintMs}ms — Google rates anything over 2500ms as needing improvement`,
    after:  '1. Preload hero image: &lt;link rel="preload" as="image" href="hero.jpg"&gt;\n2. Use next/image with priority={true}\n3. Serve images as WebP/AVIF (30-80% smaller)',
  }),
  'usability-console-errors': r => ({
    before: `${r.browser.consoleErrors} JS console error(s) — broken features that users encounter silently`,
    after:  'Open DevTools → Console and fix each error.\nWrap fetch calls in try/catch. Add null checks before DOM access.',
  }),
};

function buildAfterMockup(result: AuditResult): string {
  const lift     = Math.min(35, result.quickWins.slice(0, 5).reduce((s, i) => s + i.scoreDeduction, 0));
  const estScore = Math.min(100, result.overallScore + lift);
  const wins     = result.quickWins.slice(0, 5);

  // Issue lookup — only things actually detected on this page
  const issueIds = new Set(result.allIssues.map(i => i.id));
  const has = (id: string) => issueIds.has(id);

  const SEV_COLOR: Record<string, string> = { critical: '#ef4444', high: '#f97316', moderate: '#7c3aed', low: '#94a3b8' };
  const SEV_BG:    Record<string, string> = { critical: '#fef2f2', high: '#fff7ed', moderate: '#f5f3ff', low: '#f8fafc' };

  const fixBadge = (label: string) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;margin-bottom:6px;"><span style="background:#7c3aed;color:white;padding:1px 6px;border-radius:4px;">FIXED</span>${label}</span>`;

  // ── Nav ──────────────────────────────────────────────────────────────────────
  // Only trim if cognitive-nav-overload was actually detected
  const rawNav  = result.metadata.navItems;
  const navItems = has('cognitive-nav-overload') && rawNav.length > 7
    ? rawNav.slice(0, 5)
    : rawNav.length > 0
      ? rawNav
      : [];
  const navFixed = has('cognitive-nav-overload') && rawNav.length > 7;

  // ── H1 ───────────────────────────────────────────────────────────────────────
  const missingH1   = has('visual-missing-h1');
  const multipleH1s = has('visual-multiple-h1');
  const currentH1   = result.metadata.h1Tags[0] ?? '';
  const proposedH1  = missingH1
    ? (result.metadata.title ? result.metadata.title.split(/[|–\-]/)[0].trim() : result.domain)
    : multipleH1s
      ? currentH1   // keep the first one — just remove extras
      : currentH1;  // no change needed

  // ── Description ──────────────────────────────────────────────────────────────
  const missingDesc = has('usability-meta-desc');
  const desc = result.metadata.metaDescription
    || (missingDesc ? `Discover how ${result.domain} helps you achieve your goals faster. Get started today — no credit card required.` : '');

  // ── CTA ──────────────────────────────────────────────────────────────────────
  const missingCta  = has('conversion-no-cta');
  const weakCta     = has('conversion-weak-cta');
  const existingCta = result.metadata.ctaButtons[0] ?? '';
  const ctaLabel    = missingCta ? 'Start Free Trial'
    : weakCta        ? 'Get Started Now'
    : existingCta;
  const showCta     = missingCta || weakCta || !!ctaLabel;

  // ── Social proof ─────────────────────────────────────────────────────────────
  const missingSocialProof = has('conversion-no-social-proof');

  // ── Footer ───────────────────────────────────────────────────────────────────
  const missingPrivacy   = has('trust-no-privacy');
  const missingCopyright = has('trust-no-copyright');
  const missingContact   = has('trust-no-contact');
  const showFooterFix    = missingPrivacy || missingCopyright || missingContact;

  // ── Fix cards ────────────────────────────────────────────────────────────────
  const fixCards = wins.map((win, i) => {
    const ba = ISSUE_BEFORE_AFTER[win.id]?.(result);
    if (!ba) return '';
    const color = SEV_COLOR[win.severity] ?? '#94a3b8';
    const bg    = SEV_BG[win.severity]   ?? '#f8fafc';
    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:12px;">
        <div style="background:${bg};border-bottom:1px solid #e5e7eb;padding:10px 14px;display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:white;font-size:10px;font-weight:800;flex-shrink:0;">${i + 1}</span>
          <span style="font-size:11px;font-weight:700;color:#111827;flex:1;">${win.title}</span>
          <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${color};padding:2px 8px;border-radius:999px;background:white;border:1px solid ${color};">${win.severity === 'moderate' ? 'MEDIUM' : win.severity.toUpperCase()}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
          <div style="padding:12px 14px;border-right:1px solid #f3f4f6;">
            <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#ef4444;margin-bottom:6px;">✗ Before</div>
            <pre style="font-family:ui-monospace,monospace;font-size:10px;line-height:1.5;color:#6b7280;margin:0;white-space:pre-wrap;word-break:break-word;">${ba.before}</pre>
          </div>
          <div style="padding:12px 14px;">
            <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#16a34a;margin-bottom:6px;">✓ After</div>
            <pre style="font-family:ui-monospace,monospace;font-size:10px;line-height:1.5;color:#166534;margin:0;white-space:pre-wrap;word-break:break-word;">${ba.after}</pre>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Redesign — ${result.domain}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f0f5;color:#111;font-size:13px}
  code,pre{font-family:ui-monospace,'Cascadia Code',monospace}
</style>
</head>
<body>

<!-- ── Header ── -->
<div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%);padding:20px 20px 16px;text-align:center;">
  <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,.25);border:1px solid rgba(139,92,246,.4);border-radius:999px;padding:4px 12px;margin-bottom:10px;">
    <span style="font-size:11px;">⚡</span>
    <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">AI Redesign Concept</span>
  </div>
  <div style="font-size:17px;font-weight:900;color:white;margin-bottom:3px;">${result.domain}</div>
  <div style="font-size:11px;color:rgba(255,255,255,.5);">Applying ${wins.length} fix${wins.length !== 1 ? 'es' : ''} · Est. score: <strong style="color:#a78bfa">${estScore}/100</strong> <span style="color:#86efac">(+${lift} pts)</span></div>
</div>

<!-- ── Simulated page — only modified elements are shown ── -->
<div style="background:white;border-bottom:3px solid #7c3aed;">

  <!-- Nav: only rendered if nav issue was detected -->
  ${navItems.length > 0 ? `
  <div style="padding:12px 20px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #f3f4f6;">
    <div style="font-size:13px;font-weight:900;color:#1a1a2e;">${result.domain.split('.')[0]}</div>
    ${navFixed ? `<div style="font-size:9px;margin-left:8px;">${fixBadge(`Reduced from ${rawNav.length} → 5 items`)}</div>` : ''}
    <div style="display:flex;gap:14px;margin-left:auto;">
      ${navItems.slice(0, 6).map(n =>
        `<span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${n}</span>`
      ).join('')}
    </div>
  </div>` : ''}

  <!-- Hero: only elements with detected issues are modified -->
  <div style="padding:32px 20px 28px;text-align:center;background:linear-gradient(to bottom,#fafafa,white);">

    ${missingH1 || multipleH1s ? `<div style="margin-bottom:8px;">${fixBadge(missingH1 ? 'Added missing H1' : 'Removed duplicate H1s — kept one')}</div>` : ''}
    ${proposedH1 ? `<h1 style="font-size:22px;font-weight:900;color:#111827;line-height:1.2;max-width:480px;margin:0 auto 10px;">${proposedH1}</h1>` : ''}

    ${missingDesc ? `<div style="margin-bottom:6px;">${fixBadge('Added meta description')}</div>` : ''}
    ${desc ? `<p style="font-size:12px;color:#6b7280;max-width:400px;margin:0 auto 20px;line-height:1.6;">${desc.substring(0, 140)}</p>` : '<div style="height:20px;"></div>'}

    ${(missingCta || weakCta) ? `<div style="margin-bottom:8px;">${fixBadge(missingCta ? 'Added primary CTA above fold' : 'Rewrote CTA copy for value')}</div>` : ''}
    ${showCta ? `<button style="background:#7c3aed;color:white;font-size:12px;font-weight:700;padding:11px 28px;border-radius:999px;border:none;cursor:pointer;">${ctaLabel}</button>` : ''}

    ${missingSocialProof ? `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #f3f4f6;">
      <div style="margin-bottom:10px;">${fixBadge('Added social proof section')}</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        ${['★★★★★ "Changed how we work" — Sarah K., Product Lead', '★★★★★ "Results in minutes" — Mark T., CTO'].map(t =>
          `<div style="background:#f8f8ff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:10px;color:#374151;max-width:200px;text-align:left;">${t}</div>`
        ).join('')}
      </div>
    </div>` : ''}
  </div>

  <!-- Footer: only shown if footer trust issues were detected -->
  ${showFooterFix ? `
  <div style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:12px 20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
    <div style="margin-bottom:4px;width:100%;">${fixBadge('Added missing footer elements')}</div>
    ${missingCopyright ? `<span style="font-size:10px;color:#9ca3af;">© 2025 ${result.domain.split('.')[0]}. All rights reserved.</span>` : ''}
    <div style="display:flex;gap:12px;margin-left:auto;">
      ${missingPrivacy ? `<span style="font-size:10px;color:#7c3aed;text-decoration:underline;">Privacy Policy</span>` : ''}
      ${missingContact ? `<span style="font-size:10px;color:#7c3aed;text-decoration:underline;">Contact Us</span>` : ''}
    </div>
  </div>` : ''}
</div>

<!-- ── Fix cards ── -->
<div style="padding:16px 16px 24px;">
  <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;margin-bottom:12px;padding:0 2px;">Specific fixes (${wins.length})</div>
  ${fixCards}
</div>

</body>
</html>`;
}

// ── Improvement Concept ───────────────────────────────────────────────────────

type PreviewTab = 'before' | 'after' | 'annotated';

function ImprovementConcept({ result }: { result: AuditResult }) {
  const [tab, setTab] = useState<PreviewTab>('before');

  const lift      = Math.min(35, result.quickWins.slice(0, 5).reduce((s, i) => s + i.scoreDeduction, 0));
  const estScore  = Math.min(100, result.overallScore + lift);
  const suggestions = result.quickWins.slice(0, 4);

  // Annotated: top issues that have known viewport positions
  const annotatedPins = result.allIssues
    .filter(i => ISSUE_COORDS[i.id])
    .sort((a, b) => ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.severity] - { critical: 0, high: 1, moderate: 2, low: 3 }[b.severity]))
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Improvement Concept</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxHeight: 840 }}>
        {/* ── Left: AI suggestion cards ── */}
        <div className="flex flex-col bg-zinc-900 p-6 overflow-y-auto" style={{ maxHeight: 840 }}>
          {/* Badge */}
          <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-600/25 px-3 py-1.5">
            <Zap className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">AI Redesign Suggestions</span>
          </div>

          {/* Suggestion cards */}
          <div className="flex-1 space-y-3">
            {suggestions.length > 0 ? suggestions.map((win, i) => (
              <div key={win.id} className="rounded-xl border border-white/8 bg-white/6 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white leading-snug">{win.title}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                      {win.specificFix}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-zinc-400">No quick wins detected — page is already well optimised.</p>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="mt-6 flex items-center gap-0 divide-x divide-zinc-700 rounded-xl border border-white/8 bg-white/5 overflow-hidden">
            {[
              { label: 'Est. Score',   value: `${estScore}%`,  color: 'text-white' },
              { label: 'Points now',   value: `+${lift}`,       color: 'text-violet-400' },
              { label: 'Points Lift',  value: `+${lift}`,       color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="flex-1 py-3 text-center">
                <p className={`text-lg font-black leading-none ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Before / After / Annotated tabs ── */}
        <div className="flex flex-col bg-zinc-800 overflow-hidden" style={{ maxHeight: 840 }}>
          {/* Tab bar */}
          <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-4 py-3">
            {(['before', 'after', 'annotated'] as PreviewTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content — flex column so annotated legend can be pinned at bottom */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* BEFORE — real screenshot */}
            {tab === 'before' && (
              <div className="flex-1 overflow-y-auto">
                {result.screenshotUrl ? (
                  <img
                    src={result.screenshotUrl}
                    alt="Current page screenshot"
                    className="w-full h-auto block"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-zinc-500">Screenshot unavailable</p>
                  </div>
                )}
              </div>
            )}

            {/* AFTER — AI-generated redesign mockup */}
            {tab === 'after' && (
              <iframe
                srcDoc={buildAfterMockup(result)}
                title="AI Redesign Preview"
                className="flex-1 w-full border-0"
                style={{ minHeight: 700 }}
                sandbox="allow-same-origin"
              />
            )}

            {/* ANNOTATED — scrollable screenshot + legend always visible at bottom */}
            {tab === 'annotated' && (
              <>
                {/* Scrollable image area */}
                <div className="flex-1 overflow-y-auto relative">
                  {result.screenshotUrl ? (
                    <div className="relative">
                      <img
                        src={result.screenshotUrl}
                        alt="Annotated screenshot"
                        className="w-full h-auto block opacity-75"
                      />
                      {annotatedPins.map((issue, i) => {
                        const pos = ISSUE_COORDS[issue.id]!;
                        const sev = SEV[issue.severity];
                        return (
                          <div
                            key={issue.id}
                            className="absolute flex items-center gap-1.5 group"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ring-white text-[9px] font-bold text-white shadow-lg"
                              style={{ backgroundColor: sev.dot }}
                            >
                              {i + 1}
                            </span>
                            <span
                              className="hidden group-hover:flex rounded-md px-2 py-0.5 text-[9px] font-semibold text-white shadow whitespace-nowrap"
                              style={{ backgroundColor: sev.dot }}
                            >
                              {issue.title.substring(0, 40)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-xs text-zinc-500">Screenshot unavailable</p>
                    </div>
                  )}
                </div>

                {/* Legend — pinned at bottom, always visible, never scrolls */}
                <div className="shrink-0 flex flex-wrap gap-x-3 gap-y-2 border-t border-white/10 bg-zinc-900 px-4 py-3">
                  {annotatedPins.map((issue, i) => (
                    <div key={issue.id} className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: SEV[issue.severity].dot }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[9px] text-zinc-400 max-w-[130px] truncate">{issue.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateImprovement(result: AuditResult) {
  const worst = [...result.categories].sort((a, b) => a.score - b.score)[0];
  const lift  = Math.min(30, result.quickWins.slice(0, 4).reduce((s, i) => s + i.scoreDeduction, 0));
  const estScore = Math.min(100, result.overallScore + lift);
  const titleMap: Record<string, string> = {
    conversion:    'Optimization: CTA Visibility & Value Proposition',
    accessibility: 'Optimization: Accessibility & WCAG Compliance',
    visual:        'Optimization: Heading Structure & Semantic Layout',
    trust:         'Optimization: Trust Signals & Legal Compliance',
    usability:     'Optimization: Navigation & Form Usability',
    cognitive:     'Optimization: Cognitive Load Reduction',
  };
  const descMap: Record<string, string> = {
    conversion:    'Move the primary CTA into a high-contrast container with 48px of negative space. Rewrite button copy to [Verb] + [My] + [Value] formula. This reduces cognitive competition and is projected to lift conversion ~14% based on similar patterns.',
    accessibility: 'Add alt text to all images, associate labels with every form input, and add a skip-to-content link. These changes bring the page into WCAG 2.1 AA compliance and open it to the ~26% of users with disabilities.',
    visual:        'Consolidate to a single H1, establish a strict H1→H2→H3 heading hierarchy, and wrap content regions in semantic <main> and <section> elements. This immediately improves document structure for search engines and assistive tech.',
    trust:         'Add a visible privacy policy link, an email address in the footer, and a copyright notice. These three changes require under 30 minutes and directly increase perceived legitimacy for skeptical visitors.',
    usability:     'Replace generic button labels with action-outcome text. Reduce meta title to under 60 characters. Add Open Graph tags for social sharing. These high-leverage changes reduce user hesitation at key decision points.',
    cognitive:     'Reduce navigation to 5–7 items. Add a subheading every 150–200 words. Establish one clear primary CTA per page. Hick\'s Law predicts a measurable drop in decision latency after these changes.',
  };
  return { title: titleMap[worst?.id ?? 'conversion'], description: descMap[worst?.id ?? 'conversion'], estScore, lift };
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

interface AuditDashboardProps { result: AuditResult; onReanalyze: () => void; }

export function AuditDashboard({ result, onReanalyze }: AuditDashboardProps) {
  const [activePin,  setActivePin]  = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [issueTab,   setIssueTab]   = useState<'all' | 'critical' | 'high' | 'moderate' | 'low' | 'quick-wins'>('all');
  const [catFilter,  setCatFilter]  = useState<CategoryId | 'all'>('all');

  const critCount = result.allIssues.filter(i => i.severity === 'critical').length;
  const highCount = result.allIssues.filter(i => i.severity === 'high').length;
  const modCount  = result.allIssues.filter(i => i.severity === 'moderate').length;
  const lowCount  = result.allIssues.filter(i => i.severity === 'low').length;

  const topInsights = result.allIssues
    .sort((a, b) => ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.severity] - { critical: 0, high: 1, moderate: 2, low: 3 }[b.severity]))
    .slice(0, 6);

  const filteredIssues = useCallback((): Issue[] => {
    let issues =
      issueTab === 'quick-wins' ? result.quickWins :
      issueTab === 'all'        ? result.allIssues :
      result.allIssues.filter(i => i.severity === issueTab);
    if (catFilter !== 'all') issues = issues.filter(i => i.category === catFilter);
    return [...issues].sort((a, b) =>
      ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.severity]) -
      ({ critical: 0, high: 1, moderate: 2, low: 3 }[b.severity])
    );
  }, [issueTab, catFilter, result]);

  function handleDownload() {
    const win = window.open('', '_blank');
    if (!win) return;
    const sorted = [...result.allIssues].sort((a, b) =>
      ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.severity]) - ({ critical: 0, high: 1, moderate: 2, low: 3 }[b.severity])
    );
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
      <title>UX Audit — ${result.domain}</title>
      <style>body{font-family:-apple-system,sans-serif;max-width:820px;margin:0 auto;padding:40px 24px;color:#111}
      h1{font-size:26px;margin-bottom:4px}.meta{color:#666;font-size:13px;margin-bottom:28px}
      .score{font-size:72px;font-weight:900;margin:16px 0 4px}
      .cats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:28px 0}
      .cat{border:1px solid #e5e7eb;border-radius:12px;padding:14px}
      .cat-name{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase}.cat-score{font-size:24px;font-weight:800}
      .issue{border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:14px;break-inside:avoid}
      .tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px}
      .critical{background:#fef2f2;color:#dc2626}.high{background:#fff7ed;color:#ea580c}
      .moderate{background:#f5f3ff;color:#7c3aed}.low{background:#f8fafc;color:#64748b}
      h2{font-size:15px;margin:10px 0 4px}.lbl{font-size:10px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:2px}
      p{font-size:13px;color:#374151;margin:2px 0 12px;line-height:1.65}
      @media print{.no-print{display:none}}</style></head><body>
      <h1>UX Audit Report — Executive Dashboard</h1>
      <div class="meta">${result.url} · Analyzed ${new Date(result.analyzedAt).toLocaleString()}</div>
      <div class="score" style="color:${scoreColor(result.overallScore)}">${result.overallScore}<span style="font-size:24px;color:#9ca3af"> / 100 · Grade ${result.grade}</span></div>
      <p style="color:#6b7280;margin-bottom:0">${result.summary}</p>
      <div class="cats">${result.categories.map(c => `<div class="cat"><div class="cat-name">${c.label}</div><div class="cat-score" style="color:${scoreColor(c.score)}">${c.score}</div><div style="font-size:11px;color:#9ca3af;margin-top:2px">${c.issues.length} issue${c.issues.length !== 1 ? 's' : ''} · Avg ${c.industryBenchmark}</div></div>`).join('')}</div>
      <h1 style="font-size:20px;margin:32px 0 16px">All Issues (${result.allIssues.length})</h1>
      ${sorted.map(i => `<div class="issue"><span class="tag ${i.severity}">${severityLabel(i.severity)}</span><span class="tag" style="background:#f3f4f6;color:#374151">${CAT_LABELS[i.category]?.split(' ')[0] ?? i.category}</span><h2>${i.title}</h2><div class="lbl">Why it matters</div><p>${i.whyItMatters}</p><div class="lbl">Detected on your page</div><p style="font-family:monospace;background:#f9fafb;padding:10px;border-radius:6px;border:1px solid #e5e7eb">${i.evidence}</p><div class="lbl">Specific fix</div><p>${i.specificFix}</p></div>`).join('')}
      <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  }

  const improvement = generateImprovement(result);
  const vsAvg = result.overallScore - 74;

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-zinc-950">
      {/* ── App header ── */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-[11px] font-bold text-white">U</div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">UX Auditor AI</span>
          </Link>
          <div className="flex items-center gap-2 no-print">
            <span className="hidden rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 sm:block">Dashboard Beta v1.2</span>
            <button onClick={() => setExpertMode(v => !v)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${expertMode ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}>
              {expertMode ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {expertMode ? 'Expert Mode' : 'Standard Mode'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950 transition-colors">
              <Download className="h-3.5 w-3.5" /> PDF Export
            </button>
            <button onClick={onReanalyze} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
            </button>
            <Link href="/" className="rounded-full bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors">+ New Audit</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* ── Page title ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 transition-colors">
                {result.domain.toUpperCase()}
              </a>
              <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>UX AUDIT REPORT
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Executive Dashboard</h1>
          </div>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-2">
            <ExternalLink className="h-3.5 w-3.5" /> Visit site
          </a>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Overall UX Score</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black leading-none" style={{ color: scoreColor(result.overallScore) }}>{result.overallScore}</span>
              <span className="mb-1 text-sm font-medium text-zinc-400">/ 100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.overallScore}%`, backgroundColor: scoreColor(result.overallScore) }} />
            </div>
            <p className={`mt-2 text-[11px] font-semibold ${vsAvg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {vsAvg >= 0 ? '↑ Above' : '↓ Below'} Industry Avg ({vsAvg >= 0 ? '+' : ''}{vsAvg}%)
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Critical Issues</p>
            <div className="mt-3 flex items-end gap-2">
              <span className={`text-5xl font-black leading-none ${critCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{critCount}</span>
            </div>
            <p className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500">{critCount > 0 ? 'Requires immediate attention' : 'No critical issues'}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Quick Wins</p>
            <div className="mt-3">
              <span className="text-5xl font-black leading-none text-violet-600 dark:text-violet-400">{result.quickWins.length}</span>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <Zap className="h-3 w-3 text-violet-500 dark:text-violet-400" />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">High impact / Low effort</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Industry Benchmark</p>
            <div className="mt-4 space-y-2.5">
              {[{ label: 'SaaS Avg', value: 74, color: '#94a3b8' },
                { label: 'Your Site', value: result.overallScore, color: scoreColor(result.overallScore) }].map(b => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">{b.label}</span>
                    <span className="font-semibold" style={{ color: b.color }}>{b.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.value}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Browser Performance Metrics ── */}
        {result.browser && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-6 py-3.5">
              <Gauge className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Browser Performance — Captured by Playwright</p>
              <span className="ml-auto rounded-full bg-violet-50 dark:bg-violet-950/50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">Real Browser Data</span>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  icon: Timer, label: 'LCP', unit: 'ms',
                  value: result.browser.largestContentfulPaintMs,
                  color: result.browser.largestContentfulPaintMs < 2500 ? '#22c55e' : result.browser.largestContentfulPaintMs < 4000 ? '#f59e0b' : '#ef4444',
                  tip: '< 2500ms Good · Google ranking signal',
                },
                {
                  icon: Timer, label: 'DOM Ready', unit: 'ms',
                  value: result.browser.domContentLoadedMs,
                  color: result.browser.domContentLoadedMs < 1500 ? '#22c55e' : result.browser.domContentLoadedMs < 3000 ? '#f59e0b' : '#ef4444',
                  tip: 'DOMContentLoaded event',
                },
                {
                  icon: MonitorSmartphone, label: 'Body Font', unit: 'px',
                  value: result.browser.bodyFontSizePx,
                  color: result.browser.bodyFontSizePx >= 14 ? '#22c55e' : '#f59e0b',
                  tip: 'Computed body font-size — 16px ideal',
                },
                {
                  icon: ShieldCheck, label: 'Contrast Fails', unit: '',
                  value: result.browser.colorContrastFailures,
                  color: result.browser.colorContrastFailures === 0 ? '#22c55e' : result.browser.colorContrastFailures < 3 ? '#f59e0b' : '#ef4444',
                  tip: 'Elements failing WCAG 1.4.3',
                },
                {
                  icon: Terminal, label: 'JS Errors', unit: '',
                  value: result.browser.consoleErrors,
                  color: result.browser.consoleErrors === 0 ? '#22c55e' : '#ef4444',
                  tip: 'Console errors during page load',
                },
                {
                  icon: AlertCircle, label: 'Broken Res.', unit: '',
                  value: result.browser.brokenResources,
                  color: result.browser.brokenResources === 0 ? '#22c55e' : '#f97316',
                  tip: 'Failed network requests',
                },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center justify-center p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" title={m.tip}>
                  <m.icon className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mb-1.5" />
                  <span className="text-2xl font-black" style={{ color: m.color }}>{m.value}{m.unit}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Visual UI Audit + Detailed Insights ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-stretch">
          {/* Screenshot with heatmap — full-page scrollable */}
          <div className="lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Visual UI Audit</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Full page · scroll to explore · click markers for details</p>
              </div>
              <div className="flex items-center gap-2">
                {critCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600">{critCount} critical</span>}
                {highCount > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600">{highCount} high</span>}
              </div>
            </div>
            <VisualAuditPanel result={result} activePin={activePin} setActivePin={setActivePin} />
          </div>

          {/* Detailed Insights */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Detailed Insights</p>
              <Filter className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800 overflow-y-auto flex-1">
              {topInsights.map((issue, i) => {
                const sc = SEV[issue.severity];
                const isActive = activePin === issue.id;
                const hasPin = !!ISSUE_COORDS[issue.id];
                const pinIdx = result.allIssues
                  .filter(iss => ISSUE_COORDS[iss.id])
                  .sort((a, b) => ({ critical: 0, high: 1, moderate: 2, low: 3 }[a.severity] - { critical: 0, high: 1, moderate: 2, low: 3 }[b.severity]))
                  .slice(0, 10)
                  .findIndex(iss => iss.id === issue.id);

                return (
                  <div
                    key={issue.id}
                    className={`px-5 py-4 transition-colors cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${isActive ? 'bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-50 dark:hover:bg-violet-950/30' : ''}`}
                    onClick={() => setActivePin(isActive ? null : issue.id)}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${sc.bg} ${sc.text}`}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                          {severityLabel(issue.severity)}
                        </span>
                        {hasPin && pinIdx >= 0 && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: sc.dot }}>
                            {pinIdx + 1}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-300">
                        {CAT_LABELS[issue.category]?.split(' ')[0]}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="mt-2 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{issue.title}</p>

                    {/* Expanded evidence — full text, no clamp */}
                    {isActive && (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Evidence</p>
                        <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-100 dark:border-zinc-700 whitespace-pre-wrap break-words">
                          {issue.evidence}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mt-2">Fix</p>
                        <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 break-words">{issue.specificFix}</p>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-violet-600">
                      {isActive ? 'Collapse' : 'View Solution'}
                      <ChevronRight className={`h-3 w-3 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Category Performance ── */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Category Performance</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-3">
            {result.categories.map(cat => {
              const Icon = CAT_ICONS[cat.id] ?? ShieldCheck;
              const color = scoreColor(cat.score);
              const vsInd = cat.score - cat.industryBenchmark;
              const critInCat = cat.issues.filter(i => i.severity === 'critical').length;
              const highInCat = cat.issues.filter(i => i.severity === 'high').length;
              return (
                <div key={cat.id}
                  className="flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => { setCatFilter(cat.id); document.getElementById('issues-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/50">
                      <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{cat.label}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{cat.score}% Optimized</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {critInCat > 0 && <span className="text-[9px] font-semibold text-red-500">{critInCat} crit</span>}
                        {highInCat > 0 && <span className="text-[9px] font-semibold text-orange-500">{highInCat} high</span>}
                        <span className={`text-[9px] font-semibold ${vsInd >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {vsInd >= 0 ? '+' : ''}{vsInd} vs avg
                        </span>
                      </div>
                    </div>
                  </div>
                  <RingGauge score={cat.score} color={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Improvement Concept ── */}
        <ImprovementConcept result={result} />

        {/* ── Full issue list ── */}
        <div id="issues-section" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
              All Issues ({result.allIssues.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', ...result.categories.map(c => c.id)] as (CategoryId | 'all')[]).map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${catFilter === cat ? 'border-violet-300 bg-violet-600 text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                  {cat === 'all' ? 'All' : result.categories.find(c => c.id === cat)?.label?.split(' ')[0] ?? cat}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-zinc-100 dark:border-zinc-800 px-4 pt-3">
            <div className="flex gap-1 overflow-x-auto">
              {([
                { key: 'all',        label: `All (${result.allIssues.length})` },
                { key: 'critical',   label: `Critical (${critCount})`, icon: AlertCircle, color: 'text-red-500' },
                { key: 'high',       label: `High (${highCount})`, icon: AlertTriangle, color: 'text-orange-500' },
                { key: 'moderate',   label: `Medium (${modCount})`, icon: AlertTriangle, color: 'text-violet-500' },
                { key: 'low',        label: `Low (${lowCount})`, icon: Info, color: 'text-slate-400' },
                { key: 'quick-wins', label: `Quick Wins (${result.quickWins.length})`, icon: Zap, color: 'text-violet-600' },
              ] as { key: typeof issueTab; label: string; icon?: React.ElementType; color?: string }[]).map(t => (
                <button key={t.key} onClick={() => setIssueTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all border-b-2 ${issueTab === t.key ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
                  {t.icon && <t.icon className={`h-3 w-3 ${t.color}`} />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-3">
            {filteredIssues().length === 0 ? (
              <div className="rounded-xl bg-green-50 border border-green-100 p-6 text-center">
                <p className="text-sm font-medium text-green-700">No issues for this filter.</p>
              </div>
            ) : (
              filteredIssues().map(issue => (
                <IssueCard key={issue.id} issue={issue}
                  isQuickWin={result.quickWins.some(q => q.id === issue.id)}
                  expertMode={expertMode}
                  defaultOpen={activePin === issue.id}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between py-4 text-[11px] text-zinc-400 dark:text-zinc-500">
          <p>UX Auditor AI · {new Date(result.analyzedAt).toLocaleString()}</p>
          <p>{result.allIssues.length} issues · {result.quickWins.length} quick wins</p>
        </div>
      </div>
    </div>
  );
}
