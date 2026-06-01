'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Palette, Bell, SlidersHorizontal, ShieldAlert,
  Check, Trash2, LogOut, ChevronRight, Moon, Sun, Monitor,
  Save, AlertTriangle,
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { useAuth } from '@/components/shared/AuthProvider';
import { useTheme } from 'next-themes';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'profile' | 'appearance' | 'notifications' | 'preferences' | 'account';

interface Prefs {
  defaultExpertMode: boolean;
  historyLimit: number;
  autoSaveHistory: boolean;
}

interface Notifs {
  auditComplete: boolean;
  weeklyReport: boolean;
  productUpdates: boolean;
  tips: boolean;
}

// ── Small primitives ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        checked ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">{title}</p>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 px-6">{children}</div>
    </div>
  );
}

function SavedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
      <Check className="h-3 w-3" /> Saved
    </span>
  );
}

function avatarColor(name: string): string {
  const colors = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600'];
  return colors[name.charCodeAt(0) % colors.length];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Sections ──────────────────────────────────────────────────────────────────

function ProfileSection({ user, login }: { user: { name: string; email: string }; login: (n: string, e: string) => void }) {
  const [name,  setName]  = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    login(name.trim(), email.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Profile">
        <div className="py-6">
          {/* Avatar preview */}
          <div className="mb-6 flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white ${avatarColor(name || user.name)}`}>
              {getInitials(name || user.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name || user.name}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Avatar is generated from your name initials</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                <Save className="h-3.5 w-3.5" /> Save changes
              </button>
              {saved && <SavedBadge />}
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Password">
        <div className="py-6 space-y-4">
          {['Current password', 'New password', 'Confirm new password'].map(label => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          ))}
          <button className="flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors mt-2">
            Update password
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { id: 'light',  label: 'Light',  icon: Sun,     desc: 'Classic white background' },
    { id: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes at night' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Follows your OS setting' },
  ] as const;

  return (
    <SectionCard title="Appearance">
      <div className="py-6">
        <p className="mb-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {options.map(opt => {
            const Icon = opt.icon;
            const active = mounted && theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all ${
                  active
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Icon className={`h-6 w-6 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className={`text-xs font-semibold ${active ? 'text-violet-700 dark:text-violet-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">{opt.desc}</span>
                {active && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function NotificationsSection() {
  const [notifs, setNotifs] = useState<Notifs>(() => {
    try {
      return JSON.parse(localStorage.getItem('ux-notifs') || 'null') ?? {
        auditComplete: true, weeklyReport: false, productUpdates: true, tips: false,
      };
    } catch {
      return { auditComplete: true, weeklyReport: false, productUpdates: true, tips: false };
    }
  });
  const [saved, setSaved] = useState(false);

  function update(key: keyof Notifs, val: boolean) {
    const next = { ...notifs, [key]: val };
    setNotifs(next);
    localStorage.setItem('ux-notifs', JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard title="Notifications">
      <Row label="Audit complete" description="Get notified when an audit finishes running.">
        <Toggle checked={notifs.auditComplete} onChange={v => update('auditComplete', v)} />
      </Row>
      <Row label="Weekly report" description="A summary of your audit activity every Monday.">
        <Toggle checked={notifs.weeklyReport} onChange={v => update('weeklyReport', v)} />
      </Row>
      <Row label="Product updates" description="New features, improvements, and changelog entries.">
        <Toggle checked={notifs.productUpdates} onChange={v => update('productUpdates', v)} />
      </Row>
      <Row label="UX tips & best practices" description="Occasional tips to help you improve faster.">
        <Toggle checked={notifs.tips} onChange={v => update('tips', v)} />
      </Row>
      <div className="py-3">
        {saved && <SavedBadge />}
      </div>
    </SectionCard>
  );
}

function PreferencesSection() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return JSON.parse(localStorage.getItem('ux-prefs') || 'null') ?? {
        defaultExpertMode: false, historyLimit: 20, autoSaveHistory: true,
      };
    } catch {
      return { defaultExpertMode: false, historyLimit: 20, autoSaveHistory: true };
    }
  });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Prefs>(key: K, val: Prefs[K]) {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem('ux-prefs', JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard title="Audit Preferences">
      <Row label="Expert mode by default" description="Open audit results in Expert Mode — shows UX principles and score deductions.">
        <Toggle checked={prefs.defaultExpertMode} onChange={v => update('defaultExpertMode', v)} />
      </Row>
      <Row label="Auto-save to history" description="Automatically store each audit result in your history.">
        <Toggle checked={prefs.autoSaveHistory} onChange={v => update('autoSaveHistory', v)} />
      </Row>
      <Row label="History limit" description="Maximum number of audits stored locally.">
        <select
          value={prefs.historyLimit}
          onChange={e => update('historyLimit', Number(e.target.value))}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-all"
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n} audits</option>
          ))}
        </select>
      </Row>
      <div className="py-3">
        {saved && <SavedBadge />}
      </div>
    </SectionCard>
  );
}

function AccountSection({ logout }: { logout: () => void }) {
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);

  function clearHistory() {
    localStorage.removeItem('ux-audit-history');
    setHistoryCleared(true);
    setConfirmClear(false);
    setTimeout(() => setHistoryCleared(false), 3000);
  }

  function deleteAccount() {
    localStorage.clear();
    logout();
    router.push('/');
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Session">
        <Row label="Sign out" description="Sign out of your account on this device.">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </Row>
      </SectionCard>

      <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-6 py-4">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">Danger Zone</p>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 px-6">
          <Row
            label="Clear audit history"
            description="Permanently delete all stored audit results. This cannot be undone."
          >
            {historyCleared ? (
              <SavedBadge />
            ) : confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Yes, clear all
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear History
              </button>
            )}
          </Row>
          <Row
            label="Delete account"
            description="Permanently delete your account and all associated data."
          >
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteAccount}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            )}
          </Row>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'appearance',    label: 'Appearance',     icon: Palette },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'preferences',  label: 'Preferences',    icon: SlidersHorizontal },
  { id: 'account',      label: 'Account',        icon: ShieldAlert },
];

export default function SettingsPage() {
  const { user, login, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('profile');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.replace('/login');
  }, [mounted, user, router]);

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Account</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">

          {/* Sidebar nav */}
          <aside className="w-full shrink-0 lg:w-52">
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map(item => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                      active
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-3.5 w-3.5 hidden lg:block" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {section === 'profile'       && <ProfileSection user={user} login={login} />}
            {section === 'appearance'    && <AppearanceSection />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'preferences'  && <PreferencesSection />}
            {section === 'account'      && <AccountSection logout={logout} />}
          </div>
        </div>
      </div>
    </div>
  );
}
