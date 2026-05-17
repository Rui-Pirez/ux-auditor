'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Upload, Activity, Zap, Shield, BarChart3, Eye, Target } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';

const BRANDS = ['APPLE', 'STRIPE', 'AIRBNB', 'NETFLIX', 'SPOTIFY', 'INTERCOM'];

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Expert Dashboard',
    description: 'Score every UX dimension across 6 categories with industry benchmarks and peer comparisons.',
  },
  {
    icon: Shield,
    title: 'Accessibility Guard',
    description: 'Identify WCAG violations before they become legal liabilities. Full ARIA and alt-text analysis.',
  },
  {
    icon: Target,
    title: 'Conversion Optimizer',
    description: 'Pinpoint CTA weaknesses, friction points, and social proof gaps that are costing you revenue.',
  },
  {
    icon: Eye,
    title: 'Visual Hierarchy Audit',
    description: 'Analyze heading structure, layout flow, and reading patterns against proven UX principles.',
  },
  {
    icon: Zap,
    title: 'Quick Wins Engine',
    description: 'Prioritized fixes ranked by effort vs. impact so your team always works on what matters most.',
  },
  {
    icon: Activity,
    title: 'Audit History',
    description: 'Track UX score changes over time. See which fixes moved the needle and which didn\'t.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('ux-audit-history') || '[]');
    setAuditCount(history.length);
  }, []);

  function handleAnalyze() {
    if (!url.trim()) return;
    router.push(`/audit?url=${encodeURIComponent(url.trim())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAnalyze();
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Navbar />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
          <span className="text-amber-500">✦</span>
          AI-POWERED SAAS PLATFORM
        </div>

        <h1 className="mt-8 max-w-2xl text-5xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] sm:text-6xl">
          Stop guessing.<br />
          Start <span className="text-violet-600">perfecting</span> your UX.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-500">
          The all-in-one UX engine for product teams. Audit any URL, track accessibility history,
          and unlock data-backed conversion wins in minutes.
        </p>

        {/* URL input */}
        <div className="mt-10 w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 shadow-md shadow-zinc-100 focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-300 transition-all">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter website URL (e.g., app.yourproduct.com)"
              className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none"
              autoFocus
            />
            <button
              onClick={handleAnalyze}
              disabled={!url.trim()}
              className="shrink-0 rounded-full bg-violet-600 px-5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analyze
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-xs font-medium uppercase tracking-widest text-zinc-400">
            <label className="flex cursor-pointer items-center gap-1.5 hover:text-zinc-600 transition-colors">
              <Upload className="h-3 w-3" />
              Upload Screenshot
              <input type="file" accept="image/*" className="hidden" />
            </label>
            <span className="text-zinc-200">|</span>
            <button
              onClick={() => router.push('/history')}
              className="flex items-center gap-1.5 hover:text-zinc-600 transition-colors"
            >
              <Activity className="h-3 w-3" />
              Audit History ({auditCount})
            </button>
          </div>
        </div>
      </section>

      {/* Brand logos */}
      <section className="border-y border-zinc-200 bg-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-[10px] font-medium tracking-widest text-zinc-400 uppercase">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {BRANDS.map(brand => (
              <span key={brand} className="text-xs font-bold tracking-[0.25em] text-zinc-300 uppercase">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-3">
              Enterprise Grade Tools
            </p>
            <h2 className="text-4xl font-bold text-zinc-900 tracking-tight">
              Everything you need to audit,<br className="hidden sm:block" /> fix, and scale.
            </h2>
            <p className="mt-4 text-base text-zinc-500 max-w-xl mx-auto">
              One platform to replace your disparate UX tools. We analyze the technical layer,
              the visual layer, and the cognitive layer simultaneously.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-zinc-100 bg-zinc-50 p-6 transition-all hover:border-violet-200 hover:bg-violet-50/30 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
            How It Works
          </p>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
            A full UX audit in under 60 seconds
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-16">
            Our engine fetches your live URL, parses the HTML, and runs 30+ expert checks
            across 6 UX dimensions — all without any browser extension or code installation.
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '01', title: 'Enter your URL', desc: 'Paste any public URL. We fetch it live — no login, no setup, no browser extension needed.' },
              { step: '02', title: 'AI analysis runs', desc: 'Our engine runs 30+ expert checks covering accessibility, usability, conversion, and trust.' },
              { step: '03', title: 'Get your action plan', desc: 'Every issue comes with a specific fix, not generic advice. Export your full report as PDF.' },
            ].map(item => (
              <div key={item.step} className="text-left">
                <div className="text-4xl font-black text-violet-500/30 mb-3">{item.step}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-14 rounded-full bg-violet-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Audit Your Site Now — It&apos;s Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-[10px] font-bold text-white">U</div>
            <span className="text-xs font-semibold text-zinc-700">UX Auditor AI</span>
          </div>
          <p className="text-xs text-zinc-400">© 2025 UX Auditor AI. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-zinc-400">
            <a href="#" className="hover:text-zinc-600">Privacy</a>
            <a href="#" className="hover:text-zinc-600">Terms</a>
            <a href="#" className="hover:text-zinc-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
