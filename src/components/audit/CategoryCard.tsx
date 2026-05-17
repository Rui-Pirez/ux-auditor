'use client';

import type { CategoryResult } from '@/lib/analyzer';
import { ShieldCheck, MousePointerClick, LayoutDashboard, Brain, TrendingUp, BadgeCheck } from 'lucide-react';

const CATEGORY_ICONS = {
  accessibility: ShieldCheck,
  usability: MousePointerClick,
  visual: LayoutDashboard,
  cognitive: Brain,
  conversion: TrendingUp,
  trust: BadgeCheck,
};

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', ring: '#22c55e' };
  if (score >= 65) return { text: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-100', ring: '#84cc16' };
  if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', ring: '#f59e0b' };
  if (score >= 35) return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', ring: '#f97316' };
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', ring: '#ef4444' };
}

function ScoreMini({ score }: { score: number }) {
  const size = 52;
  const sw = 5;
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={colors.ring} strokeWidth={sw}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold ${colors.text}`}>{score}</span>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: CategoryResult;
  onClick?: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const colors = getScoreColor(category.score);
  const Icon = CATEGORY_ICONS[category.id] ?? ShieldCheck;
  const criticalCount = category.issues.filter(i => i.severity === 'critical').length;
  const highCount = category.issues.filter(i => i.severity === 'high').length;
  const vsIndustry = category.score - category.industryBenchmark;

  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-2xl border p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${colors.border} bg-white`}
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${colors.bg}`}>
          <Icon className={`h-4.5 w-4.5 ${colors.text}`} />
        </div>
        <ScoreMini score={category.score} />
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-semibold text-zinc-900">{category.label}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {category.issues.length === 0
            ? 'No issues detected'
            : `${category.issues.length} issue${category.issues.length > 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${category.score}%`, backgroundColor: colors.ring }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]">
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-600">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-medium text-orange-600">
              {highCount} high
            </span>
          )}
          {criticalCount === 0 && highCount === 0 && category.issues.length === 0 && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-600">passing</span>
          )}
        </div>
        <span className={vsIndustry >= 0 ? 'text-green-600' : 'text-red-500'}>
          {vsIndustry >= 0 ? '+' : ''}{vsIndustry} vs avg
        </span>
      </div>
    </button>
  );
}
