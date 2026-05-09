import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User as UserIcon, Sparkles, Zap, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { NAV_ITEMS, DIRECT_NAV_ITEMS, IconButton } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import NotificationManager from './NotificationManager';
import NotificationCenter from './NotificationCenter';
import AIChat from './AIChat';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, logout } from '../lib/firebase';
import { hapticFeedback, cn } from '../lib/utils';
import { useDevice } from '../context/DeviceContext';
import { useOffline } from '../context/OfflineContext';
import { useToast } from '../context/ToastContext';

export default function Layout() {
  const { deviceType } = useDevice();
  const { isOffline } = useOffline();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, loading, error] = useAuthState(auth);

  // Memoize navigation items to prevent recreation
  const isDirectRoute = useMemo(() => location.pathname.startsWith('/direct'), [location.pathname]);
  const baseNavItems = useMemo(() => isDirectRoute ? DIRECT_NAV_ITEMS : NAV_ITEMS, [isDirectRoute]);
  const navItems = baseNavItems;

  // Enhanced logout with better error handling
  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    hapticFeedback('medium');
    
    try {
      await logout();
      showToast({
        type: 'success',
        message: 'Wylogowano pomyślnie'
      });
      navigate('/login');
    } catch (error: any) {
      showToast({
        type: 'error',
        message: 'Nie udało się wylogować. Spróbuj ponownie.'
      });
    } finally {
      setLoggingOut(false);
      setIsMenuOpen(false);
    }
  }, [loggingOut, navigate, showToast]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Handle auth errors
  useEffect(() => {
    if (error) {
      showToast({
        type: 'error',
        message: 'Problem z autentykacją. Spróbuj odświeżyć stronę.'
      });
    }
  }, [error, showToast]);

  const content = (
    <div className={cn(
      'min-h-screen bg-gradient-page flex flex-col md:flex-row font-sans',
      deviceType === 'mobile' && 'overflow-hidden max-h-screen'
    )}>
      <NotificationManager />
      <AIChat />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col w-72 shrink-0 z-20',
        'border-r border-black/[0.055] bg-white/70 backdrop-blur-xl',
        deviceType === 'mobile' && '!hidden'
      )}>
        {/* Logo with status */}
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-[0_4px_16px_rgba(79,70,229,0.4)] relative">
              <Sparkles size={20} fill="currentColor" />
              {isOffline && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-display font-black text-[#1d1d1f] tracking-tighter leading-none">LifeFlow</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[9px] font-bold text-[#aeaeb2] uppercase tracking-[0.3em] leading-none">v4.0</p>
                {isOffline && (
                  <div className="flex items-center gap-1 text-rose-500">
                    <WifiOff size={10} />
                    <span className="text-[8px] font-medium">Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mb-2">
          <p className="text-overline px-2">Nawigacja</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-[0.875rem] transition-all duration-200 relative',
                isActive
                  ? 'bg-[#1d1d1f] text-white nav-active-glow'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                    isActive ? 'bg-white/15' : 'group-hover:bg-white'
                  )}>
                    <item.icon
                      size={16}
                      className={cn(
                        'transition-colors',
                        isActive ? 'text-white' : 'text-[#6e6e73] group-hover:text-[#1d1d1f]'
                      )}
                    />
                  </div>
                  <span className={cn(
                    'text-[13px] font-semibold leading-none',
                    isActive ? 'text-white' : 'text-[#1d1d1f]/70 group-hover:text-[#1d1d1f]'
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div layoutId="sidebar-pip" className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />
                  )}
                </>
              )}
            </NavLink>
          ))}

        </nav>

        {/* User footer with enhanced status */}
        <div className="p-4 mt-auto border-t border-black/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#f5f5f7] transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] shrink-0 border border-black/[0.06] relative">
              <UserIcon size={16} />
              {loading && (
                <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1d1d1f] truncate leading-none">
                {user?.displayName || user?.email || 'User'}
              </p>
              <p className="text-[10px] text-[#aeaeb2] mt-0.5 leading-none flex items-center gap-1">
                Pro Plan
                {isOffline && (
                  <span className="text-rose-500">• Offline</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                'opacity-0 group-hover:opacity-100',
                loggingOut 
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-[#aeaeb2] hover:text-rose-500 hover:bg-rose-50'
              )}
            >
              {loggingOut ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ─────────────────────────────────────────────────── */}
      <header className={cn(
        'bg-white/80 backdrop-blur-xl border-b border-black/[0.055] px-5 py-3.5',
        'flex items-center justify-between sticky top-0 z-30',
        deviceType === 'mobile' ? 'flex' : 'md:hidden flex'
      )}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="w-9 h-9 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Sparkles size={12} fill="white" className="text-white" />
            </div>
            <span className="text-[15px] font-display font-black text-[#1d1d1f] tracking-tight">LifeFlow</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <div className="w-8 h-8 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#6e6e73] relative">
            <UserIcon size={15} />
            {loading && (
              <div className="absolute inset-0 bg-white/50 rounded-2xl flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {isOffline && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-[#1d1d1f]/40 backdrop-blur-sm z-[60]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
              className="fixed inset-y-0 left-0 w-[82%] max-w-[320px] bg-white z-[70] flex flex-col shadow-[2px_0_40px_rgba(0,0,0,0.16)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.055]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
                    <Sparkles size={16} fill="white" className="text-white" />
                  </div>
                  <span className="text-lg font-display font-black text-[#1d1d1f] tracking-tight">LifeFlow</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-4 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
                <p className="text-overline px-2 mb-3">Nawigacja</p>
                {navItems.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all',
                      isActive
                        ? 'bg-[#1d1d1f] text-white'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f] active:bg-[#f5f5f7]'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                          isActive ? 'bg-white/15' : 'bg-[#f5f5f7]'
                        )}>
                          <item.icon size={17} className={isActive ? 'text-white' : 'text-[#6e6e73]'} />
                        </div>
                        <span className={cn(
                          'text-[15px] font-semibold',
                          isActive ? 'text-white' : 'text-[#1d1d1f]'
                        )}>
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Footer with enhanced logout */}
              <div className="p-4 border-t border-black/[0.055] space-y-2">
                <div className="px-3 py-2.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center border border-black/[0.06] relative">
                    <UserIcon size={17} className="text-[#6e6e73]" />
                    {loading && (
                      <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1d1d1f] truncate leading-none">
                      {user?.displayName || user?.email || 'User'}
                    </p>
                    <p className="text-[10px] text-[#aeaeb2] mt-0.5 flex items-center gap-1">
                      Pro Plan
                      {isOffline && (
                        <span className="text-rose-500">• Offline</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-3 py-3 rounded-2xl transition-colors',
                    loggingOut
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                  )}
                >
                  {loggingOut ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut size={17} />
                  )}
                  <span className="text-[15px] font-semibold">
                    {loggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
                  </span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Offline Banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-center text-sm font-semibold py-2 flex items-center justify-center gap-2 shadow-lg"
          >
            <WifiOff size={15} />
            Brak połączenia z internetem — tryb offline
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className={cn(
        'flex-1 overflow-auto',
        'p-5 md:p-8 lg:p-12',
        'pb-28 md:pb-12',
        deviceType === 'mobile' && '!pb-28',
        isOffline && 'pt-14 md:pt-16'
      )}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1160px] mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────────── */}
      <div className={cn(
        'fixed bottom-3 left-3 right-3 z-40',
        deviceType === 'mobile' ? 'block' : 'md:hidden block'
      )}>
        <nav className={cn(
          'glass-card rounded-[1.5rem] flex justify-around py-2 px-1',
        )}>
          {navItems.slice(0, 5).map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className="flex-1"
            >
              {({ isActive }) => (
                <div className={cn(
                  'relative flex flex-col items-center justify-center py-2 px-1 rounded-[1rem] transition-all duration-200',
                  isActive ? 'text-[#1d1d1f]' : 'text-[#aeaeb2]'
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 bg-[#1d1d1f]/[0.06] rounded-[1rem]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon
                    size={20}
                    className={cn('relative z-10 transition-transform duration-200', isActive && 'scale-110')}
                  />
                  <span className={cn(
                    'relative z-10 text-[9px] font-bold mt-1 leading-none tracking-wide',
                    isActive ? 'text-[#1d1d1f]' : 'text-[#aeaeb2]'
                  )}>
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => { hapticFeedback('light'); setIsMenuOpen(true); }}
            className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-[1rem] text-[#aeaeb2] transition-colors active:bg-[#f5f5f7]"
          >
            <Menu size={20} />
            <span className="text-[9px] font-bold mt-1 leading-none tracking-wide">Więcej</span>
          </button>
        </nav>
      </div>
    </div>
  );

  /* ── Mobile sim wrapper ──────────────────────────────────────────────────── */
  if (deviceType === 'mobile') {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <div className={cn(
          'relative w-[385px] h-[820px] overflow-hidden',
          'bg-white rounded-[3.5rem]',
          'shadow-[0_0_0_2px_#2a2a2c,0_0_0_10px_#141416,0_0_0_13px_#252527,0_50px_120px_rgba(0,0,0,0.7)]',
          'ring-1 ring-white/5'
        )}>
          {/* Dynamic Island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-[110]" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-9 z-[100] text-[#1d1d1f] pointer-events-none">
            <span className="text-[14px] font-semibold">9:41</span>
            <div className="flex gap-1.5 items-center">
              <div className="flex gap-px items-end">
                {[2, 3, 4, 4].map((h, i) => (
                  <div key={i} className="w-0.5 bg-black rounded-full" style={{ height: h * 2 }} />
                ))}
              </div>
              <div className="w-6 h-3 border border-black/20 rounded-[3px] relative flex items-center px-0.5">
                <div className="h-1.5 w-4 bg-black/80 rounded-[1px]" />
                <div className="absolute -right-0.5 w-0.5 h-1 bg-black/20 rounded-r-full" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="w-full h-full relative overflow-y-auto scrollbar-hide pt-4">
            {content}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/10 rounded-full z-[100]" />
        </div>

        {/* Label */}
        <div className="fixed top-6 left-6 hidden md:flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-white/30">
            <Smartphone size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">LifeFlow Mobile</span>
          </div>
        </div>
      </div>
    );
  }

  return content;
}
