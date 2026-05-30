'use client';

import { useState } from 'react';
import type { Issue, Severity } from '@/lib/analyzer';
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, Zap, Lightbulb, Wrench, BookOpen } from 'lucide-react';

const SEVERITY_CONFIG: Record<Severity, { label: string; colors: string; dotColor: string; icon: React.ElementType }> = {
  critical: {
    label: 'Critical',
    colors: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50',
    dotColor: 'bg-red-500',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    colors: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50',
    dotColor: 'bg-orange-500',
    icon: AlertTriangle,
  },
  moderate: {
    label: 'Moderate',
    colors: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low',
    colors: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
    dotColor: 'bg-blue-400',
    icon: Info,
  },
};

const IMPACT_COLORS: Record<string, string> = {
  High: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
  Medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  Low: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
};

const CATEGORY_LABELS: Record<string, string> = {
  accessibility: 'Accessibility',
  usability: 'Usability',
  visual: 'Visual Hierarchy',
  cognitive: 'Cognitive Load',
  conversion: 'Conversion',
  trust: 'Trust',
};

interface IssueCardProps {
  issue: Issue;
  isQuickWin?: boolean;
  expertMode?: boolean;
  defaultOpen?: boolean;
}

export function IssueCard({ issue, isQuickWin, expertMode = false, defaultOpen = false }: IssueCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const severity = SEVERITY_CONFIG[issue.severity];
  const SeverityIcon = severity.icon;

  return (
    <div className={`rounded-xl border transition-all ${open ? 'shadow-sm' : 'hover:shadow-sm'} bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800`}>
      <button
        className="flex w-full items-start gap-4 p-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="mt-0.5 shrink-0">
          <SeverityIcon className={`h-4 w-4 ${issue.severity === 'critical' ? 'text-red-500' : issue.severity === 'high' ? 'text-orange-500' : issue.severity === 'moderate' ? 'text-amber-500' : 'text-blue-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severity.colors}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${severity.dotColor}`} />
              {severity.label}
            </span>
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            {isQuickWin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                <Zap className="h-2.5 w-2.5" />
                Quick Win
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${IMPACT_COLORS[issue.impact]}`}>
              {issue.impact} Impact
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{issue.title}</p>
          {!open && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{issue.evidence}</p>
          )}
        </div>

        <div className="shrink-0 mt-0.5 text-zinc-400 dark:text-zinc-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-50 dark:border-zinc-800 px-4 pb-5 pt-4 space-y-4">
          {/* Why it matters */}
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
              <BookOpen className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                {expertMode ? `UX Principle: ${issue.principle}` : 'Why this matters'}
              </p>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{issue.whyItMatters}</p>
            </div>
          </div>

          {/* Evidence */}
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40">
              <Lightbulb className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Detected on your page</p>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-100 dark:border-zinc-700">
                {issue.evidence}
              </p>
            </div>
          </div>

          {/* Fix */}
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/40">
              <Wrench className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 mb-1">Specific fix</p>
              <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{issue.specificFix}</p>
            </div>
          </div>

          {expertMode && (
            <div className="mt-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Score impact</p>
              <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5">Fixing this issue recovers <strong>−{issue.scoreDeduction} points</strong> in the {CATEGORY_LABELS[issue.category]} category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
