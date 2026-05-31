'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Moon, Sun, User, LayoutDashboard, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from './AuthProvider';
import { useEffect, useRef, useState } from 'react';

interface NavbarProps {
  showBack?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
    'bg-rose-600',   'bg-amber-600', 'bg-cyan-600',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleLogout() {
    logout();
    setOpen(false);
    router.push('/');
  }

  const initials = getInitials(name);
  const color    = avatarColor(name);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full pr-1 pl-1 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ${color}`}>
          {initials}
        </div>
        <span className="hidden text-xs font-medium text-zinc-700 dark:text-zinc-300 sm:block max-w-[100px] truncate">
          {name}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-950/50 z-50 overflow-hidden">
          {/* User info */}
          <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{name}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              Dashboard
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              Account &amp; Billing
            </Link>
            <Link
              href="#"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              Settings
            </Link>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 py-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar({ showBack }: NavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
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

        <div className="flex items-center gap-6">
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

          {/* Auth area */}
          {mounted && (
            user ? (
              <UserMenu name={user.name} email={user.email} />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:hover:bg-violet-500"
              >
                <LogIn className="h-3 w-3" />
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
