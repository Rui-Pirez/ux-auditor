'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

type Tab = 'signin' | 'signup';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [tab, setTab] = useState<Tab>((searchParams.get('mode') as Tab) ?? 'signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // Derive a display name from the email prefix
    const displayName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    login(displayName, email);
    setLoading(false);
    router.push('/');
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name || !signupEmail || !signupPassword) { setError('Please fill in all fields.'); return; }
    if (signupPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (signupPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    login(name, signupEmail);
    setLoading(false);
    router.push('/');
  }

  function handleGoogleAuth() {
    setLoading(true);
    setTimeout(() => {
      login('Google User', 'user@gmail.com');
      setLoading(false);
      router.push('/');
    }, 1000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">U</div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">UX Auditor AI</span>
          </Link>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="relative flex h-7 w-14 items-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <span className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 ${theme === 'dark' ? 'left-[30px]' : 'left-[3px]'}`}>
                  {theme === 'dark' ? <Moon className="h-3 w-3 text-violet-400" /> : <Sun className="h-3 w-3 text-amber-500" />}
                </span>
                <Sun className="absolute left-[5px] h-3 w-3 text-zinc-300 dark:text-zinc-600" />
                <Moon className="absolute right-[5px] h-3 w-3 text-zinc-300 dark:text-violet-500" />
              </button>
            )}
            <Link
              href="/"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Page body */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-500/25">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {tab === 'signin'
                ? 'Sign in to access your audits and history.'
                : 'Start auditing for free — no credit card required.'}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">

            {/* Tab switcher */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800">
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  className={`flex-1 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    tab === t
                      ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">or</span>
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* SIGN IN FORM */}
              {tab === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                      <button type="button" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>Sign In <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* SIGN UP FORM */}
              {tab === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Confirm password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>Create Account <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                    By signing up you agree to our{' '}
                    <a href="#" className="text-violet-600 dark:text-violet-400 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Trusted by <strong className="text-zinc-600 dark:text-zinc-300">2,400+</strong> product teams worldwide
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
