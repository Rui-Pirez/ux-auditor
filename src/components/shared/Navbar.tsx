'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface NavbarProps {
  showBack?: boolean;
}

export function Navbar({ showBack }: NavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">
            U
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">UX Auditor AI</span>
        </Link>

        <div className="flex items-center gap-8">
          {showBack ? (
            <button
              onClick={() => router.push('/')}
              className="text-xs font-medium tracking-widest text-zinc-500 dark:text-zinc-400 uppercase hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              ← New Audit
            </button>
          ) : (
            <>
              <Link
                href="#features"
                className="text-xs font-medium tracking-widest text-zinc-500 dark:text-zinc-400 uppercase hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-xs font-medium tracking-widest text-zinc-500 dark:text-zinc-400 uppercase hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Pricing
              </Link>
            </>
          )}

          {/* Theme toggle pill */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="relative flex h-7 w-14 items-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
            >
              <span
                className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 ${
                  theme === 'dark' ? 'left-[30px]' : 'left-[3px]'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="h-3 w-3 text-violet-400" />
                ) : (
                  <Sun className="h-3 w-3 text-amber-500" />
                )}
              </span>
              <Sun className="absolute left-[5px] h-3 w-3 text-zinc-300 dark:text-zinc-600" />
              <Moon className="absolute right-[5px] h-3 w-3 text-zinc-300 dark:text-violet-500" />
            </button>
          )}

          <button className="flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:hover:bg-violet-500">
            <LogIn className="h-3 w-3" />
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}
