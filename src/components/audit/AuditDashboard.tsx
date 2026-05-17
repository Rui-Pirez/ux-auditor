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
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        <span className="block font-semibold">{pos.zone}</span>
        <span className="block text-zinc-400 max-w-[180px] truncate">{issue.title}</span>
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
      <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        {/* Zoom controls */}
        <span className="text-[10px] font-medium text-zinc-400 mr-1">Zoom</span>
        <button
          onClick={() => changeScale(-0.25)}
          disabled={scale <= 0.25}
          className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-xs font-bold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
        >−</button>
        <span className="w-10 text-center text-[11px] font-mono font-semibold text-zinc-700">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => changeScale(0.25)}
          disabled={scale >= 3}
          className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-xs font-bold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
        >+</button>
        <button
          onClick={() => setScale(1)}
          className="ml-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100"
        >Fit</button>

        <div className="ml-auto flex items-center gap-2">
          {imgState === 'ok' && (
            <>
              <span className="text-[10px] text-zinc-400 hidden sm:block">↕ Scroll to view full page</span>
              <button
                onClick={openFullPage}
                className="flex items-center gap-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
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
        className="overflow-auto bg-zinc-100"
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 bg-zinc-50 px-4 py-2">
          {(['critical', 'high', 'moderate', 'low'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEV[s].dot }} />
              <span className="text-[10px] text-zinc-500">{s === 'moderate' ? 'Medium' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          ))}
          <span className="ml-auto text-[10px] text-zinc-400">{pins.length} issues mapped · Playwright full-page JPEG</span>
        </div>
      )}
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
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* ── App header ── */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-[11px] font-bold text-white">U</div>
            <span className="text-sm font-semibold text-zinc-900">UX Auditor AI</span>
          </Link>
          <div className="flex items-center gap-2 no-print">
            <span className="hidden rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:block">Dashboard Beta v1.2</span>
            <button onClick={() => setExpertMode(v => !v)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${expertMode ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
              {expertMode ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {expertMode ? 'Expert Mode' : 'Standard Mode'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
              <Download className="h-3.5 w-3.5" /> PDF Export
            </button>
            <button onClick={onReanalyze} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
            </button>
            <Link href="/" className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors">+ New Audit</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* ── Page title ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 transition-colors">
                {result.domain.toUpperCase()}
              </a>
              <span className="mx-2 text-zinc-300">/</span>UX AUDIT REPORT
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900">Executive Dashboard</h1>
          </div>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-2">
            <ExternalLink className="h-3.5 w-3.5" /> Visit site
          </a>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Overall UX Score</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black leading-none" style={{ color: scoreColor(result.overallScore) }}>{result.overallScore}</span>
              <span className="mb-1 text-sm font-medium text-zinc-400">/ 100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${result.overallScore}%`, backgroundColor: scoreColor(result.overallScore) }} />
            </div>
            <p className={`mt-2 text-[11px] font-semibold ${vsAvg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {vsAvg >= 0 ? '↑ Above' : '↓ Below'} Industry Avg ({vsAvg >= 0 ? '+' : ''}{vsAvg}%)
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Critical Issues</p>
            <div className="mt-3 flex items-end gap-2">
              <span className={`text-5xl font-black leading-none ${critCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{critCount}</span>
            </div>
            <p className="mt-4 text-[11px] text-zinc-400">{critCount > 0 ? 'Requires immediate attention' : 'No critical issues'}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Quick Wins</p>
            <div className="mt-3">
              <span className="text-5xl font-black leading-none text-violet-600">{result.quickWins.length}</span>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <Zap className="h-3 w-3 text-violet-500" />
              <p className="text-[11px] text-zinc-400">High impact / Low effort</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Industry Benchmark</p>
            <div className="mt-4 space-y-2.5">
              {[{ label: 'SaaS Avg', value: 74, color: '#94a3b8' },
                { label: 'Your Site', value: result.overallScore, color: scoreColor(result.overallScore) }].map(b => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-zinc-500">{b.label}</span>
                    <span className="font-semibold" style={{ color: b.color }}>{b.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.value}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Browser Performance Metrics ── */}
        {result.browser && (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-6 py-3.5">
              <Gauge className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">Browser Performance — Captured by Playwright</p>
              <span className="ml-auto rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-600">Real Browser Data</span>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-zinc-100 sm:grid-cols-3 lg:grid-cols-6">
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
                <div key={m.label} className="flex flex-col items-center justify-center p-4 text-center hover:bg-zinc-50 transition-colors" title={m.tip}>
                  <m.icon className="h-4 w-4 text-zinc-300 mb-1.5" />
                  <span className="text-2xl font-black" style={{ color: m.color }}>{m.value}{m.unit}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Visual UI Audit + Detailed Insights ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
          {/* Screenshot with heatmap — full-page scrollable */}
          <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">Visual UI Audit</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Full page · scroll to explore · click markers for details</p>
              </div>
              <div className="flex items-center gap-2">
                {critCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600">{critCount} critical</span>}
                {highCount > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600">{highCount} high</span>}
              </div>
            </div>
            <VisualAuditPanel result={result} activePin={activePin} setActivePin={setActivePin} />
          </div>

          {/* Detailed Insights */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">Detailed Insights</p>
              <Filter className="h-3.5 w-3.5 text-zinc-300" />
            </div>
            <div className="divide-y divide-zinc-50">
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
                    className={`px-5 py-4 transition-colors cursor-pointer hover:bg-zinc-50 ${isActive ? 'bg-violet-50 hover:bg-violet-50' : ''}`}
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
                    <p className="mt-2 text-[11px] font-semibold text-zinc-800 leading-snug">{issue.title}</p>

                    {/* Expanded evidence — full text, no clamp */}
                    {isActive && (
                      <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Evidence</p>
                        <p className="text-[11px] leading-relaxed text-zinc-600 font-mono bg-zinc-50 rounded-lg p-3 border border-zinc-100 whitespace-pre-wrap break-words">
                          {issue.evidence}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mt-2">Fix</p>
                        <p className="text-[11px] leading-relaxed text-zinc-600 break-words">{issue.specificFix}</p>
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
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">Category Performance</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 sm:grid-cols-3">
            {result.categories.map(cat => {
              const Icon = CAT_ICONS[cat.id] ?? ShieldCheck;
              const color = scoreColor(cat.score);
              const vsInd = cat.score - cat.industryBenchmark;
              const critInCat = cat.issues.filter(i => i.severity === 'critical').length;
              const highInCat = cat.issues.filter(i => i.severity === 'high').length;
              return (
                <div key={cat.id}
                  className="flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors cursor-pointer"
                  onClick={() => { setCatFilter(cat.id); document.getElementById('issues-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <Icon className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">{cat.label}</p>
                      <p className="text-[10px] text-zinc-400">{cat.score}% Optimized</p>
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
        <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="border-b border-zinc-100 bg-white px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">Improvement Concept (Before vs After)</p>
          </div>
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            <div className="bg-zinc-900 p-8">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 px-3 py-1">
                <Zap className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">AI Redesign Suggestion</span>
              </div>
              <h3 className="text-xl font-bold text-white leading-snug">{improvement.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{improvement.description}</p>
              <div className="mt-6 flex items-center gap-6">
                <div>
                  <p className="text-2xl font-black text-white">{improvement.estScore}%</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Est. Score</p>
                </div>
                <div className="h-10 w-px bg-zinc-700" />
                <div>
                  <p className="text-2xl font-black text-violet-400">+{improvement.lift}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Points Lift</p>
                </div>
              </div>
            </div>
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden bg-zinc-800">
              {result.metadata.ogImage ? (
                <img src={result.metadata.ogImage} alt="Proposed mockup" className="h-full w-full object-cover opacity-35" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-zinc-900 opacity-60" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">Proposed Mockup</p>
                </div>
                <p className="text-xs text-white/40">Based on {result.quickWins.length} quick win improvements</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Full issue list ── */}
        <div id="issues-section" className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700">
              All Issues ({result.allIssues.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['all', ...result.categories.map(c => c.id)] as (CategoryId | 'all')[]).map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${catFilter === cat ? 'border-violet-300 bg-violet-600 text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                  {cat === 'all' ? 'All' : result.categories.find(c => c.id === cat)?.label?.split(' ')[0] ?? cat}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-zinc-100 px-4 pt-3">
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
                  className={`shrink-0 flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all border-b-2 ${issueTab === t.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
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

        <div className="flex items-center justify-between py-4 text-[11px] text-zinc-400">
          <p>UX Auditor AI · {new Date(result.analyzedAt).toLocaleString()}</p>
          <p>{result.allIssues.length} issues · {result.quickWins.length} quick wins</p>
        </div>
      </div>
    </div>
  );
}
