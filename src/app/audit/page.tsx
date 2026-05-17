'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuditResult } from '@/lib/analyzer';
import { AuditDashboard } from '@/components/audit/AuditDashboard';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

const ANALYSIS_STEPS = [
  'Fetching page content',
  'Parsing HTML structure',
  'Running accessibility audit',
  'Analyzing visual hierarchy',
  'Checking usability heuristics',
  'Evaluating cognitive load',
  'Scoring conversion patterns',
  'Analyzing trust signals',
  'Computing final score',
];

function DashHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-[11px] font-bold text-white">U</div>
          <span className="text-sm font-semibold text-zinc-900">UX Auditor AI</span>
        </Link>
        <Link href="/" className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors">
          + New Audit
        </Link>
      </div>
    </header>
  );
}

function LoadingView({ url, step }: { url: string; step: number }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <DashHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
              <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900">Analyzing your site</h1>
            <p className="mt-1.5 text-sm text-zinc-400 truncate max-w-xs mx-auto">{url}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3.5">
            {ANALYSIS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-zinc-200" />
                )}
                <span className={`text-sm ${i < step ? 'text-zinc-300 line-through' : i === step ? 'font-semibold text-zinc-900' : 'text-zinc-300'}`}>
                  {s}
                </span>
                {i < step && <span className="ml-auto text-[10px] font-medium text-green-500">Done</span>}
              </div>
            ))}
          </div>

          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-500"
              style={{ width: `${Math.round((step / ANALYSIS_STEPS.length) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">
            {Math.round((step / ANALYSIS_STEPS.length) * 100)}% complete · Running 30+ expert checks
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorView({ message, url, onRetry }: { message: string; url: string; onRetry: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <DashHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Could not analyze this URL</h1>
          <p className="mt-2 text-sm text-zinc-500">{message}</p>
          <p className="mt-1 text-xs text-zinc-400 break-all">{url}</p>
          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Common reasons</p>
            <ul className="text-left rounded-xl border border-zinc-100 bg-white p-5 text-xs text-zinc-500 space-y-2.5 shadow-sm">
              <li>• The site blocks automated requests (Cloudflare, bot protection)</li>
              <li>• The URL requires authentication to access</li>
              <li>• The server is temporarily unavailable</li>
              <li>• The URL format is incorrect or the domain doesn&apos;t exist</li>
            </ul>
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={onRetry}
              className="rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="rounded-full border border-zinc-200 bg-white px-6 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Different URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = use(searchParams);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const analyze = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setResult(null);
    setError(null);
    setStep(0);

    const stepInterval = setInterval(() => {
      setStep(s => {
        if (s >= ANALYSIS_STEPS.length - 2) { clearInterval(stepInterval); return s; }
        return s + 1;
      });
    }, 400);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const data: AuditResult = await res.json();
      if (data.error && !data.allIssues?.length) throw new Error(data.error);

      setStep(ANALYSIS_STEPS.length);
      await new Promise(r => setTimeout(r, 400));

      const history = JSON.parse(localStorage.getItem('ux-audit-history') || '[]');
      const entry = { url: data.url, domain: data.domain, score: data.overallScore, grade: data.grade, analyzedAt: data.analyzedAt };
      localStorage.setItem('ux-audit-history', JSON.stringify([entry, ...history.filter((h: typeof entry) => h.url !== data.url)].slice(0, 20)));

      setResult(data);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!url) { router.replace('/'); return; }
    analyze(url);
  }, [url, analyze, router]);

  if (!url) return null;
  if (error) return <ErrorView message={error} url={url} onRetry={() => analyze(url)} />;
  if (loading || !result) return <LoadingView url={url} step={step} />;
  return <AuditDashboard result={result} onReanalyze={() => analyze(url)} />;
}
