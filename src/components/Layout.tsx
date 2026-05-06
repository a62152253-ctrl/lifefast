import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User as UserIcon, Sparkles, Zap, Smartphone } from 'lucide-react';
import { NAV_ITEMS, DIRECT_NAV_ITEMS, IconButton } from './CommonUI';
// import { useCustomNav, CUSTOM_ICONS } from '../context/CustomNavContext'; // Temporarily disabled
import CustomNavManager from './CustomNavManager';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationManager } from './NotificationManager';
import NotificationCenter from './NotificationCenter';
import QuickActions from './QuickActions';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { hapticFeedback, cn } from '../lib/utils';
import { useDevice } from '../context/DeviceContext';

export default function Layout() {
  const { deviceType } = useDevice();
  // const { customItems } = useCustomNav(); // Temporarily disabled
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useAuthState(auth);

  const isDirectRoute = location.pathname.startsWith('/direct');
  const baseNavItems = isDirectRoute ? DIRECT_NAV_ITEMS : NAV_ITEMS;
  const navItems = baseNavItems; // Temporarily disable custom items

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } catch (e) { console.error(e); }
  };

  const content = (
    <div className={cn(
      'min-h-screen bg-gradient-page flex flex-col md:flex-row font-sans',
      deviceType === 'mobile' && 'overflow-hidden max-h-screen'
    )}>
      <NotificationManager />
      <QuickActions />

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col w-72 shrink-0 z-20',
        'border-r border-black/[0.055] bg-white/70 backdrop-blur-xl',
        deviceType === 'mobile' && '!hidden'
      )}>
        {/* Logo */}
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-[0_4px_16px_rgba(79,70,229,0.4)]">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black text-[#1d1d1f] tracking-tighter leading-none">LifeFlow</h1>
              <p className="text-[9px] font-bold text-[#aeaeb2] uppercase tracking-[0.3em] leading-none mt-0.5">v4.0</p>
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

          {/* Custom Item Button Temporarily Disabled */}
          {/* <div className="px-2 py-2">
            <CustomNavManager />
          </div> */}
        </nav>

        {/* User footer */}
        <div className="p-4 mt-auto border-t border-black/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#f5f5f7] transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] shrink-0 border border-black/[0.06]">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1d1d1f] truncate leading-none">
                {user?.displayName || user?.email || 'User'}
              </p>
              <p className="text-[10px] text-[#aeaeb2] mt-0.5 leading-none">Pro Plan</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#aeaeb2] hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <LogOut size={14} />
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
          <div className="w-8 h-8 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#6e6e73]">
            <UserIcon size={15} />
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

              {/* Footer */}
              <div className="p-4 border-t border-black/[0.055] space-y-2">
                <div className="px-3 py-2.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center border border-black/[0.06]">
                    <UserIcon size={17} className="text-[#6e6e73]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1d1d1f] truncate leading-none">
                      {user?.displayName || user?.email || 'User'}
                    </p>
                    <p className="text-[10px] text-[#aeaeb2] mt-0.5">Pro Plan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <LogOut size={17} />
                  <span className="text-[15px] font-semibold">Wyloguj się</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className={cn(
        'flex-1 overflow-auto',
        'p-5 md:p-8 lg:p-12',
        'pb-28 md:pb-12',
        deviceType === 'mobile' && '!pb-28'
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
