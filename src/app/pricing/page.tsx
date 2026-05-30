'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import {
  Check, Minus, Zap, Shield, BarChart3, FileText,
  Users, Code2, Headphones, ChevronDown, ArrowRight,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    badge: null,
    description: 'For individuals exploring their first UX audit.',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Start for free',
    ctaHref: '/',
    highlight: false,
    features: [
      '5 audits per month',
      'Viewport screenshot',
      '20 UX checks',
      'Basic accessibility scan',
      'Audit history (7 days)',
      null,
      null,
      null,
      null,
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most popular',
    description: 'For product teams that ship UX improvements weekly.',
    monthlyPrice: 29,
    annualPrice: 23,
    cta: 'Start free trial',
    ctaHref: '/',
    highlight: true,
    features: [
      'Unlimited audits',
      'Full-page Playwright screenshot',
      '35+ UX checks',
      'WCAG contrast & a11y tree',
      'Unlimited history',
      'PDF export',
      'Quick Wins engine',
      'Core Web Vitals (LCP)',
      null,
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: null,
    description: 'For agencies and teams auditing at scale.',
    monthlyPrice: 99,
    annualPrice: 79,
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@uxauditor.ai',
    highlight: false,
    features: [
      'Unlimited audits',
      'Full-page Playwright screenshot',
      '35+ UX checks',
      'WCAG contrast & a11y tree',
      'Unlimited history',
      'PDF export',
      'Quick Wins engine',
      'Core Web Vitals (LCP)',
      'API access + team seats',
    ],
  },
];

const COMPARISON_ROWS: { label: string; starter: string | boolean; pro: string | boolean; enterprise: string | boolean }[] = [
  { label: 'Audits per month',        starter: '5',          pro: 'Unlimited',  enterprise: 'Unlimited' },
  { label: 'UX checks',               starter: '20',         pro: '35+',        enterprise: '35+' },
  { label: 'Screenshot type',         starter: 'Viewport',   pro: 'Full page',  enterprise: 'Full page' },
  { label: 'Playwright analysis',      starter: false,        pro: true,         enterprise: true },
  { label: 'Color contrast (real)',    starter: false,        pro: true,         enterprise: true },
  { label: 'Touch target check',       starter: false,        pro: true,         enterprise: true },
  { label: 'LCP / Core Web Vitals',   starter: false,        pro: true,         enterprise: true },
  { label: 'Console & network errors',starter: false,        pro: true,         enterprise: true },
  { label: 'PDF export',              starter: false,        pro: true,         enterprise: true },
  { label: 'Audit history',           starter: '7 days',     pro: 'Unlimited',  enterprise: 'Unlimited' },
  { label: 'Quick Wins engine',        starter: false,        pro: true,         enterprise: true },
  { label: 'API access',              starter: false,        pro: false,        enterprise: true },
  { label: 'Team seats',              starter: false,        pro: false,        enterprise: true },
  { label: 'White-label reports',     starter: false,        pro: false,        enterprise: true },
  { label: 'Priority support',        starter: false,        pro: false,        enterprise: true },
];

const FAQS = [
  {
    q: 'What counts as one audit?',
    a: 'Each URL you analyze counts as one audit. Re-running an analysis on the same URL is another audit. Screenshots and detailed data are generated fresh every time so results are always up to date.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No browser extension or code snippet required. You just paste a URL. Our server runs a headless Chromium session (Playwright) to capture a real screenshot, compute styles, and run all checks — entirely server-side.',
  },
  {
    q: 'How is the color contrast check different from other tools?',
    a: 'Most tools parse raw HTML and guess contrast. We use Playwright\'s computed style API to get the actual rendered color values — including CSS variables, gradients used as backgrounds, and dynamically injected styles — then apply the WCAG 2.1 luminance formula.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. There are no long-term commitments. Cancel from your account settings and you keep access until the end of your billing period. No questions asked.',
  },
  {
    q: 'What is included in the Enterprise plan?',
    a: 'API access so you can embed audits in your CI/CD pipeline, team seats so multiple people share one subscription, white-label PDF reports with your own logo, and dedicated support with a 4-hour response SLA.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes — 14 days free, no credit card required. You get full Pro access including unlimited audits, Playwright analysis, and PDF export.',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CellValue({ val }: { val: string | boolean }) {
  if (val === true)  return <Check className="mx-auto h-4 w-4 text-violet-600 dark:text-violet-400" />;
  if (val === false) return <Minus className="mx-auto h-4 w-4 text-zinc-300 dark:text-zinc-600" />;
  return <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{q}</span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{a}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      {/* ── Hero ── */}
      <section className="px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Pricing</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Start free. Upgrade when your team needs deeper analysis. No hidden fees, no seat minimums.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 shadow-sm">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${!annual ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${annual ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
          >
            Annual
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${annual ? 'bg-violet-500 text-white' : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400'}`}>
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* ── Pricing cards ── */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {PLANS.map(plan => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-7 shadow-sm ${
                  plan.highlight
                    ? 'border-violet-300 bg-violet-600 text-white shadow-violet-100 shadow-lg'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-900 shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p className={`text-xs font-bold uppercase tracking-widest ${plan.highlight ? 'text-violet-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mt-4 flex items-end gap-1">
                  {price === 0 ? (
                    <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>Free</span>
                  ) : (
                    <>
                      <span className={`text-4xl font-black leading-none ${plan.highlight ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                        ${price}
                      </span>
                      <span className={`mb-1 text-sm ${plan.highlight ? 'text-violet-200' : 'text-zinc-400 dark:text-zinc-500'}`}>/mo</span>
                    </>
                  )}
                </div>
                {annual && price > 0 && (
                  <p className={`mt-0.5 text-[11px] ${plan.highlight ? 'text-violet-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    Billed annually · ${price * 12}/yr
                  </p>
                )}

                <p className={`mt-3 text-xs leading-relaxed ${plan.highlight ? 'text-violet-200' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {plan.description}
                </p>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`mt-6 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold transition-all ${
                    plan.highlight
                      ? 'bg-white text-violet-700 hover:bg-violet-50'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                {/* Features */}
                <ul className="mt-7 space-y-3">
                  {plan.features.filter(Boolean).map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.highlight ? 'text-violet-200' : 'text-violet-600 dark:text-violet-400'}`} />
                      <span className={`text-xs leading-snug ${plan.highlight ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="bg-white dark:bg-zinc-900 px-6 py-16 border-t border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Full feature comparison
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="py-4 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 w-1/2">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className={`py-4 px-4 text-center text-xs font-bold uppercase tracking-wide ${p.highlight ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.label} className={`border-b border-zinc-50 dark:border-zinc-800/50 ${i % 2 === 0 ? '' : 'bg-zinc-50/50 dark:bg-zinc-800/20'}`}>
                    <td className="py-3.5 pl-6 pr-4 text-xs text-zinc-600 dark:text-zinc-400">{row.label}</td>
                    <td className="py-3.5 px-4 text-center"><CellValue val={row.starter} /></td>
                    <td className="py-3.5 px-4 text-center bg-violet-50/40 dark:bg-violet-950/20"><CellValue val={row.pro} /></td>
                    <td className="py-3.5 px-4 text-center"><CellValue val={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Why teams choose Pro ── */}
      <section className="bg-zinc-900 dark:bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Why teams upgrade to Pro</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'Real contrast ratios', desc: 'Playwright computes actual CSS values — not guesses from raw HTML.' },
              { icon: BarChart3, title: 'Core Web Vitals', desc: 'Largest Contentful Paint measured from a live browser session.' },
              { icon: FileText, title: 'PDF audit reports', desc: 'Downloadable, print-ready reports you can share with clients or stakeholders.' },
              { icon: Zap, title: 'Quick Wins engine', desc: 'Prioritised list of high-impact, low-effort fixes ranked by score recovery.' },
            ].map(item => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <item.icon className="mb-3 h-5 w-5 text-violet-400" />
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white dark:bg-zinc-900 px-6 py-16 border-t border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Frequently asked questions
          </h2>
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-zinc-50 dark:bg-zinc-950 px-6 py-16 border-t border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Still not sure which plan?</h2>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Start with the free plan — no credit card required. Upgrade any time as your audit volume grows.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Zap className="h-4 w-4" /> Start free audit
            </Link>
            <a
              href="mailto:hello@uxauditor.ai"
              className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Headphones className="h-4 w-4" /> Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-[10px] font-bold text-white">U</div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">UX Auditor AI</span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">© 2025 UX Auditor AI. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-zinc-400 dark:text-zinc-500">
            <Link href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300">Privacy</Link>
            <Link href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300">Terms</Link>
            <Link href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
