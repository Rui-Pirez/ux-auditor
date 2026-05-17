'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

interface NavbarProps {
  showBack?: boolean;
}

export function Navbar({ showBack }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">
            U
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">UX Auditor AI</span>
        </Link>

        <div className="flex items-center gap-8">
          {showBack ? (
            <button
              onClick={() => router.push('/')}
              className="text-xs font-medium tracking-widest text-zinc-500 uppercase hover:text-zinc-900 transition-colors"
            >
              ← New Audit
            </button>
          ) : (
            <>
              <Link
                href="#features"
                className="text-xs font-medium tracking-widest text-zinc-500 uppercase hover:text-zinc-900 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-xs font-medium tracking-widest text-zinc-500 uppercase hover:text-zinc-900 transition-colors"
              >
                Pricing
              </Link>
            </>
          )}
          <button className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700">
            <LogIn className="h-3 w-3" />
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}
