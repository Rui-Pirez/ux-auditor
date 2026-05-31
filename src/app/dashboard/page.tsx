'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, BarChart3, TrendingUp, TrendingDown, Minus as Flat,
  Globe, RefreshCw, ExternalLink, Zap, Award,
  ChevronRight, Search, Trash2, Activity,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { useAuth } from '@/components/shared/AuthProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  url: string;
  domain: string;
  score: number;
  grade: string;
  analyzedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return '#22c55e';
  if (s >= 65) return '#84cc16';
  if (s >= 50) return '#f59e0b';
  if (s >= 35) return '#f97316';
  return '#ef4444';
}

function gradeLabel(s: number) {
  if (s >= 90) return 'A';
  if (s >= 75) return 'B';
  if (s >= 60) return 'C';
  if (s >= 45) return 'D';
  return 'F';
}

function gradeBg(grade: string) {
  const map: Record<string, string> = {
    A: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
    B: 'bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-400',
    C: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
    D: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
    F: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  };
  return map[grade] ?? map.F;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function MiniRing({ score, size = 44 }: { score: number; size?: number }) {
  const sw = 4, r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-zinc-100 dark:text-zinc-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-xs font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{count}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [search,  setSearch]    = useState('');
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.replace('/login'); return; }
    try {
      const stored = JSON.parse(localStorage.getItem('ux-audit-history') || '[]') as HistoryEntry[];
      setHistory(stored);
    } catch {
      setHistory([]);
    }
  }, [mounted, user, router]);

  function removeEntry(url: string) {
    const next = history.filter(h => h.url !== url);
    setHistory(next);
    localStorage.setItem('ux-audit-history', JSON.stringify(next));
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total       = history.length;
  const avgScore    = total > 0 ? Math.round(history.reduce((s, h) => s + h.score, 0) / total) : 0;
  const bestScore   = total > 0 ? Math.max(...history.map(h => h.score)) : 0;
  const uniqueSites = new Set(history.map(h => h.domain)).size;

  const recentTrend = (() => {
    if (history.length < 2) return null;
    const diff = history[0].score - history[1].score;
    return diff;
  })();

  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  history.forEach(h => {
    const g = gradeLabel(h.score) as keyof typeof gradeCounts;
    gradeCounts[g]++;
  });

  const filtered = history.filter(h =>
    h.domain.toLowerCase().includes(search.toLowerCase()) ||
    h.url.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted || !user) return null;

  const firstName = user.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">

        {/* ── Welcome banner ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              My Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {total === 0
                ? 'Run your first audit to get started.'
                : `${total} audit${total !== 1 ? 's' : ''} tracked · avg score ${avgScore}/100`}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Audit
          </Link>
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label:   'Total Audits',
              value:   total,
              sub:     total === 0 ? 'No audits yet' : `${Math.min(total, 20)} stored`,
              icon:    BarChart3,
              color:   'text-violet-600 dark:text-violet-400',
              iconBg:  'bg-violet-50 dark:bg-violet-950/50',
            },
            {
              label:   'Average Score',
              value:   total > 0 ? avgScore : '—',
              sub:     total > 0 ? (avgScore >= 74 ? '↑ Above industry avg' : '↓ Below industry avg') : 'Run an audit',
              icon:    Activity,
              color:   total > 0 ? (avgScore >= 74 ? 'text-green-600 dark:text-green-400' : 'text-orange-500') : 'text-zinc-400',
              iconBg:  'bg-green-50 dark:bg-green-950/50',
            },
            {
              label:   'Best Score',
              value:   total > 0 ? bestScore : '—',
              sub:     total > 0 ? `Grade ${gradeLabel(bestScore)}` : 'No data yet',
              icon:    Award,
              color:   total > 0 ? 'text-amber-500' : 'text-zinc-400',
              iconBg:  'bg-amber-50 dark:bg-amber-950/50',
            },
            {
              label:   'Sites Tracked',
              value:   uniqueSites || '—',
              sub:     uniqueSites === 0 ? 'No sites yet'
                     : uniqueSites === 1 ? '1 unique domain'
                     : `${uniqueSites} unique domains`,
              icon:    Globe,
              color:   'text-blue-500 dark:text-blue-400',
              iconBg:  'bg-blue-50 dark:bg-blue-950/50',
            },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {card.label}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className={`mt-3 text-3xl font-black leading-none ${card.color}`}>{card.value}</p>
              <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Body: history table + score distribution ────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* History list — takes 2/3 width */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 gap-3 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 shrink-0">
                Audit History
              </p>
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5">
                <Search className="h-3 w-3 text-zinc-400 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter by domain…"
                  className="w-36 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Empty state */}
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                  <Globe className="h-8 w-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No audits yet</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Paste a URL on the home page to run your first audit.
                  </p>
                </div>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Start Auditing
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No audits match &ldquo;{search}&rdquo;
              </div>
            ) : (
              <div className="divide-y divide-zinc-50 dark:divide-zinc-800/80">
                {filtered.map((entry, i) => {
                  const grade = gradeLabel(entry.score);
                  const trend = i < filtered.length - 1
                    ? entry.score - filtered[i + 1].score
                    : null;
                  return (
                    <div
                      key={entry.url}
                      className="group flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Score ring */}
                      <MiniRing score={entry.score} />

                      {/* Domain + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {entry.domain}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${gradeBg(grade)}`}>
                            Grade {grade}
                          </span>
                          {trend !== null && Math.abs(trend) > 0 && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend > 0 ? 'text-green-500' : 'text-red-400'}`}>
                              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {trend > 0 ? '+' : ''}{trend}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                          {entry.url} · {timeAgo(entry.analyzedAt)}
                        </p>
                      </div>

                      {/* Actions — visible on hover */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Visit site"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Link
                          href={`/audit?url=${encodeURIComponent(entry.url)}`}
                          title="Re-audit"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => removeEntry(entry.url)}
                          title="Remove"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: score distribution + quick stats */}
          <div className="flex flex-col gap-4">

            {/* Score distribution */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                Score Distribution
              </p>
              {total === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">No data yet</p>
              ) : (
                <div className="space-y-3">
                  <ScoreBar label="A" count={gradeCounts.A} total={total} color="#22c55e" />
                  <ScoreBar label="B" count={gradeCounts.B} total={total} color="#84cc16" />
                  <ScoreBar label="C" count={gradeCounts.C} total={total} color="#f59e0b" />
                  <ScoreBar label="D" count={gradeCounts.D} total={total} color="#f97316" />
                  <ScoreBar label="F" count={gradeCounts.F} total={total} color="#ef4444" />
                </div>
              )}
            </div>

            {/* Score trend sparkline */}
            {history.length >= 2 && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                  Score Trend
                </p>
                <div className="flex items-end gap-1.5 h-20">
                  {[...history].reverse().slice(-10).map((h, i, arr) => {
                    const maxH = Math.max(...arr.map(x => x.score));
                    const barH = Math.max(8, Math.round((h.score / maxH) * 100));
                    return (
                      <div
                        key={h.url + i}
                        className="flex-1 rounded-t-sm transition-all duration-500"
                        style={{ height: `${barH}%`, backgroundColor: scoreColor(h.score) }}
                        title={`${h.domain}: ${h.score}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span>Oldest</span>
                  <span className={`flex items-center gap-1 font-semibold ${recentTrend !== null && recentTrend >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {recentTrend !== null ? (
                      recentTrend > 0 ? <><TrendingUp className="h-3 w-3" /> +{recentTrend} pts</> :
                      recentTrend < 0 ? <><TrendingDown className="h-3 w-3" /> {recentTrend} pts</> :
                      <><Flat className="h-3 w-3 text-zinc-400" /> No change</>
                    ) : null}
                  </span>
                  <span>Latest</span>
                </div>
              </div>
            )}

            {/* Plan badge */}
            <div className="rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">Starter Plan</p>
              </div>
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                {total}/5 audits used this month. Upgrade to Pro for unlimited audits and Playwright analysis.
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-violet-200 dark:bg-violet-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, (total / 5) * 100)}%` }}
                />
              </div>
              <Link
                href="/pricing"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                Upgrade to Pro <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
