import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Menu, Smartphone, Sparkles, User, WifiOff, X } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { DIRECT_NAV_ITEMS, NAV_ITEMS } from './CommonUI';
import NotificationManager from './NotificationManager';
import NotificationCenter from './NotificationCenter';
import AIChat from './AIChat';
import { auth, logout } from '../lib/firebase';
import { useDevice } from '../context/DeviceContext';
import { useOffline } from '../context/OfflineContext';
import { useToast } from '../context/ToastContext';
import { cn, hapticFeedback } from '../lib/utils';

type NavItem = (typeof NAV_ITEMS)[number];

function isItemActive(pathname: string, path: string) {
  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function DesktopSidebar({
  items,
  pathname,
  userLabel,
  isOffline,
  onLogout,
  loggingOut,
}: {
  items: NavItem[];
  pathname: string;
  userLabel: string;
  isOffline: boolean;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <aside className="hidden w-[19rem] shrink-0 xl:flex">
      <div className="glass-card noise sticky top-6 flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-white/65 p-4">
        <div className="rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(239,99,81,0.14),rgba(242,169,59,0.16))] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gradient-brand text-white shadow-[0_18px_32px_rgba(239,99,81,0.24)]">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-overline">LifeFlow</p>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                Dashboard, który oddycha.
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
                Skupienie na najważniejszych rzeczach, bez wizualnego szumu.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 px-2">
          <span className="text-overline">Nawigacja</span>
          {isOffline ? (
            <span className="badge bg-[rgba(211,91,87,0.1)] text-[var(--color-danger)]">Offline</span>
          ) : null}
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item.path);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 rounded-[1.35rem] px-3 py-3 transition-all duration-200',
                  active
                    ? 'bg-[rgba(32,26,23,0.92)] text-white nav-active-glow'
                    : 'text-[var(--color-ink-soft)] hover:bg-white/82 hover:text-[var(--color-ink)]',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] transition-all',
                    active ? 'bg-white/12 text-white' : 'bg-white text-[var(--color-muted)] group-hover:text-[var(--color-accent)]',
                  )}
                >
                  <item.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-bold', active ? 'text-white' : 'text-[var(--color-ink)]')}>
                    {item.label}
                  </p>
                  <p className={cn('text-xs', active ? 'text-white/60' : 'text-[var(--color-muted)]')}>
                    {active ? 'Aktualny widok' : 'Otwórz moduł'}
                  </p>
                </div>
                {active ? (
                  <motion.div
                    layoutId="active-sidebar-item"
                    className="ml-auto h-2 w-2 rounded-full bg-white/75"
                  />
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 rounded-[1.5rem] border border-[var(--color-line)] bg-white/78 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[rgba(40,148,156,0.1)] text-[var(--color-calm)]">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--color-ink)]">{userLabel}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {isOffline ? 'Tryb offline aktywny' : 'Gotowy do pracy'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[rgba(32,26,23,0.04)] text-[var(--color-muted)] transition-colors hover:bg-[rgba(211,91,87,0.08)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogOut size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileMenu({
  items,
  pathname,
  isOpen,
  onClose,
  onLogout,
  loggingOut,
  userLabel,
  isOffline,
}: {
  items: NavItem[];
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
  userLabel: string;
  isOffline: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-[rgba(32,26,23,0.42)] backdrop-blur-sm xl:hidden"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280, mass: 0.85 }}
            className="fixed inset-y-0 left-0 z-[80] flex w-[86%] max-w-[22rem] flex-col overflow-hidden rounded-r-[2rem] border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,246,239,0.92))] p-4 shadow-[0_28px_70px_rgba(32,26,23,0.22)] xl:hidden"
          >
            <div className="flex items-center justify-between rounded-[1.5rem] bg-[rgba(239,99,81,0.08)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-brand text-white">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-overline">LifeFlow</p>
                  <p className="font-display text-xl font-bold tracking-[-0.05em] text-[var(--color-ink)]">
                    Wszystko pod ręką
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/75 text-[var(--color-ink-soft)]"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {items.map((item) => {
                const active = isItemActive(pathname, item.path);

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-[1.35rem] px-3 py-3 transition-all',
                      active
                        ? 'bg-[rgba(32,26,23,0.92)] text-white'
                        : 'bg-white/70 text-[var(--color-ink-soft)]',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-[1rem]',
                        active ? 'bg-white/12 text-white' : 'bg-[rgba(239,99,81,0.1)] text-[var(--color-accent)]',
                      )}
                    >
                      <item.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold', active ? 'text-white' : 'text-[var(--color-ink)]')}>
                        {item.label}
                      </p>
                      <p className={cn('text-xs', active ? 'text-white/60' : 'text-[var(--color-muted)]')}>
                        {active ? 'Aktywny moduł' : 'Przejdź'}
                      </p>
                    </div>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-4 rounded-[1.5rem] border border-[var(--color-line)] bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[rgba(40,148,156,0.1)] text-[var(--color-calm)]">
                  <User size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--color-ink)]">{userLabel}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {isOffline ? 'Offline' : 'Online'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[rgba(211,91,87,0.08)] text-[var(--color-danger)] disabled:opacity-60"
                >
                  {loggingOut ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <LogOut size={16} />
                  )}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function Layout() {
  const { deviceType } = useDevice();
  const { isOffline } = useOffline();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user] = useAuthState(auth);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(
    () => (location.pathname.startsWith('/direct') ? DIRECT_NAV_ITEMS : NAV_ITEMS),
    [location.pathname],
  );

  const currentItem = useMemo(
    () => navItems.find((item) => isItemActive(location.pathname, item.path)) ?? navItems[0],
    [location.pathname, navItems],
  );

  const userLabel = user?.displayName || user?.email || 'Użytkownik';

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    hapticFeedback('medium');

    try {
      await logout();
      showToast({
        type: 'success',
        message: 'Wylogowano pomyślnie.',
      });
      navigate('/login');
    } catch {
      showToast({
        type: 'error',
        message: 'Nie udało się wylogować. Spróbuj ponownie.',
      });
    } finally {
      setLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const shell = (
    <div className="bg-gradient-page flex min-h-screen">
      <NotificationManager />
      <AIChat />

      <DesktopSidebar
        items={navItems}
        pathname={location.pathname}
        userLabel={userLabel}
        isOffline={isOffline}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col px-3 pb-24 pt-3 sm:px-4 xl:px-6 xl:pb-8">
        <header className="glass-card sticky top-3 z-40 mb-4 flex items-center justify-between gap-3 rounded-[1.6rem] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                hapticFeedback('light');
                setIsMenuOpen(true);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/78 text-[var(--color-ink)] xl:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="hidden h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-brand text-white shadow-[0_14px_28px_rgba(239,99,81,0.22)] sm:flex">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-overline">{currentItem?.label ?? 'LifeFlow'}</p>
              <h2 className="truncate font-display text-2xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
                {currentItem?.label ?? 'Panel'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOffline ? (
              <div className="hidden items-center gap-2 rounded-full border border-[rgba(211,91,87,0.18)] bg-[rgba(211,91,87,0.08)] px-3 py-2 text-xs font-bold text-[var(--color-danger)] sm:flex">
                <WifiOff size={14} />
                Tryb offline
              </div>
            ) : null}
            <NotificationCenter />
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/82 text-[var(--color-ink)] shadow-sm">
              <User size={18} />
            </div>
          </div>
        </header>

        <AnimatePresence>
          {isOffline ? (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="mb-4 flex items-center gap-2 rounded-[1.35rem] border border-[rgba(211,91,87,0.16)] bg-[rgba(211,91,87,0.08)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]"
            >
              <WifiOff size={16} />
              Brak połączenia z internetem. Możesz przeglądać część danych lokalnie.
            </motion.div>
          ) : null}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-[1280px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <MobileMenu
        items={navItems}
        pathname={location.pathname}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        userLabel={userLabel}
        isOffline={isOffline}
      />

      <div className="fixed inset-x-3 bottom-3 z-50 xl:hidden">
        <nav className="glass-card flex items-center justify-between rounded-[1.6rem] px-2 py-2">
          {navItems.slice(0, 4).map((item) => {
            const active = isItemActive(location.pathname, item.path);

            return (
              <NavLink key={item.id} to={item.path} className="flex-1">
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-[1.1rem] px-2 py-2.5 transition-all',
                    active ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]',
                  )}
                >
                  {active ? (
                    <motion.div
                      layoutId="mobile-tab"
                      className="absolute inset-0 rounded-[1.1rem] bg-[rgba(32,26,23,0.08)]"
                    />
                  ) : null}
                  <item.icon size={18} className="relative z-10" />
                  <span className="relative z-10 mt-1 text-[10px] font-black tracking-[0.12em]">
                    {item.label}
                  </span>
                </div>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => {
              hapticFeedback('light');
              setIsMenuOpen(true);
            }}
            className="flex flex-1 flex-col items-center justify-center rounded-[1.1rem] px-2 py-2.5 text-[var(--color-muted)]"
          >
            <Menu size={18} />
            <span className="mt-1 text-[10px] font-black tracking-[0.12em]">Więcej</span>
          </button>
        </nav>
      </div>
    </div>
  );

  if (deviceType === 'mobile') {
    return (
      <div className="bg-[linear-gradient(180deg,#1b1715,#120f0d)] px-4 py-8">
        <div className="mb-4 hidden items-center gap-2 text-white/40 md:flex">
          <Smartphone size={14} />
          <span className="text-[11px] font-black uppercase tracking-[0.24em]">Podgląd mobilny</span>
        </div>
        <div className="mx-auto max-w-[26rem] rounded-[3rem] border border-white/8 bg-black p-3 shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
          <div className="relative overflow-hidden rounded-[2.4rem] bg-[#fcf8f2]">
            <div className="absolute left-1/2 top-2 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
            <div className="absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between px-7 text-xs font-bold text-[var(--color-ink)]">
              <span>9:41</span>
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-[2px]">
                  {[1, 2, 3, 4].map((bar) => (
                    <div key={bar} className="w-[3px] rounded-full bg-black" style={{ height: `${bar * 3}px` }} />
                  ))}
                </div>
                <div className="h-3.5 w-6 rounded-[4px] border border-black/25 p-[1px]">
                  <div className="h-full w-4 rounded-[2px] bg-black" />
                </div>
              </div>
            </div>
            <div className="max-h-[85vh] min-h-[85vh] overflow-y-auto pt-4">{shell}</div>
            <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-black/12" />
          </div>
        </div>
      </div>
    );
  }

  return shell;
}
