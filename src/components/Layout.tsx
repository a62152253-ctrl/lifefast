import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Bell, User as UserIcon, Search, Sparkles, Zap, Smartphone } from 'lucide-react';
import { NAV_ITEMS, DIRECT_NAV_ITEMS, IconButton, Badge, Card } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationManager } from './NotificationManager';
import NotificationCenter from './NotificationCenter';
import QuickActions from './QuickActions';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { hapticFeedback } from '../lib/utils';

import { useDevice } from '../context/DeviceContext';

export default function Layout() {
  const { deviceType } = useDevice();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useAuthState(auth);
  
  // Use direct navigation items when on /direct routes
  const isDirectRoute = location.pathname.startsWith('/direct');
  const navItems = isDirectRoute ? DIRECT_NAV_ITEMS : NAV_ITEMS;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const content = (
    <div className={`min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900 ${deviceType === 'mobile' ? 'overflow-hidden max-h-screen' : ''}`}>
      <NotificationManager />
      <QuickActions />
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-80 bg-white border-r border-gray-100 z-20 ${deviceType === 'mobile' ? '!hidden' : ''}`}>
        <div className="p-10 pb-12">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#1d1d1f] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-gray-200">
               <Sparkles size={24} fill="currentColor" />
             </div>
             <div>
              <h1 className="text-2xl font-display font-black text-[#1d1d1f] tracking-tighter">LifeFlow</h1>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] leading-none mt-1">Version 4.0</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto scrollbar-hide">
           <div className="px-4 mb-4">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 px-1">Navigation</p>
           </div>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `
                group flex items-center px-5 py-4 rounded-3xl transition-all duration-500
                ${isActive 
                  ? 'bg-[#1d1d1f] text-white shadow-2xl shadow-gray-200 font-bold' 
                  : 'text-gray-400 hover:text-[#1d1d1f] hover:bg-gray-50'}
              `}
            >
              <item.icon size={22} className={`mr-4 transition-all duration-500 group-hover:scale-110 ${window.location.pathname === item.path ? 'scale-110' : ''}`} />
              <span className="text-sm font-black uppercase tracking-widest leading-none">{item.label}</span>
              {window.location.pathname === item.path && (
                <motion.div layoutId="nav-indicator" className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-8 mt-auto">
          <div className="bg-gray-50 rounded-[2rem] p-5 flex items-center justify-between group hover:bg-indigo-50 transition-all duration-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-extrabold overflow-hidden border border-white">
                <UserIcon size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black text-[#1d1d1f] tracking-tight truncate">{user?.displayName || user?.email || 'User'}</p>
                <p className="text-[10px] text-gray-400 font-bold">Premium Plan</p>
              </div>
            </div>
            <IconButton 
              icon={LogOut} 
              onClick={handleLogout}
              className="bg-white/50 hover:bg-red-50 hover:text-red-600 text-gray-400"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={`${deviceType === 'mobile' ? 'flex' : 'md:hidden'} bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 items-center justify-between sticky top-0 z-30 shadow-sm`}>
        <div className="flex items-center gap-3">
          <IconButton icon={Menu} onClick={() => setIsMenuOpen(true)} className="bg-gray-50" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
               <Sparkles size={14} fill="currentColor" />
            </div>
            <h1 className="text-lg font-black text-[#1d1d1f] tracking-tighter">LifeFlow</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <NotificationCenter />
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden shadow-sm">
             <UserIcon size={18} />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[85%] bg-white z-[70] p-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                     <Sparkles size={18} fill="currentColor" />
                   </div>
                   <h1 className="text-xl font-black text-[#1d1d1f] tracking-tighter">LifeFlow</h1>
                </div>
                <IconButton icon={X} onClick={() => setIsMenuOpen(false)} className="bg-gray-50" />
              </div>
              
              <nav className="space-y-2 flex-1 overflow-y-auto">
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2rem] mb-4 px-2">Nawigacja</p>
                {navItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center px-5 py-4 rounded-[1.25rem] transition-all
                      ${isActive 
                        ? 'bg-indigo-600 text-white font-extrabold shadow-xl shadow-indigo-100' 
                        : 'text-gray-500 active:bg-gray-50'}
                    `}
                  >
                    <item.icon size={22} className="mr-5" />
                    <span className="text-lg tracking-tight">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* User info and logout for mobile */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="px-5 py-3 bg-gray-50 rounded-[1.25rem] mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-extrabold">
                      <UserIcon size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-black text-[#1d1d1f] tracking-tight truncate">{user?.displayName || user?.email || 'User'}</p>
                      <p className="text-[9px] text-gray-400 font-bold">Premium Plan</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-5 py-4 rounded-[1.25rem] text-red-600 bg-red-50 font-extrabold transition-all active:bg-red-100"
                >
                  <LogOut size={22} className="mr-5" />
                  <span className="text-lg tracking-tight">Wyloguj się</span>
                </button>
              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-10 lg:p-16 mb-20 md:mb-0 overflow-auto bg-gray-50/50 ${deviceType === 'mobile' ? 'md:!p-6 !mb-20' : ''}`}>
        <motion.div 
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1200px] mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className={`${deviceType === 'mobile' ? 'fixed' : 'md:hidden fixed'} bottom-6 left-6 right-6 z-40`}>
        <nav className="bg-white/90 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] flex justify-around p-2.5">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/direct' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all relative
                  ${isActive ? 'text-indigo-600' : 'text-gray-400'}
                `}
              >
                <div className="relative z-10">
                  <item.icon size={22} className={`${isActive ? 'scale-110' : ''} transition-transform duration-500`} />
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-indigo-50/80 rounded-2xl -z-0"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                {/* Visual Dot for active */}
                {isActive && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -bottom-0.5 w-1 h-1 bg-indigo-600 rounded-full"
                  />
                )}
              </NavLink>
            );
          })}
          <button 
            onClick={() => { hapticFeedback('light'); setIsMenuOpen(true); }}
            className="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-gray-400 active:bg-gray-50 transition-colors"
          >
            <Menu size={22} />
          </button>
        </nav>
      </div>
    </div>
  );

  if (deviceType === 'mobile') {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center p-4">
        {/* Hardware Frame Simulation - iPhone 15 Pro style */}
        <div className="relative w-[385px] h-[820px] bg-white rounded-[4rem] shadow-[0_0_0_2px_#333,0_0_0_12px_#1a1a1c,0_0_0_15px_#2a2a2c,0_40px_120px_rgba(0,0,0,0.6)] overflow-hidden ring-1 ring-white/10">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-full z-[110] flex items-center justify-center gap-2 group hover:w-48 transition-all duration-300 pointer-events-auto">
            <div className="w-2.5 h-2.5 bg-[#1d1d1f] rounded-full" />
            <div className="hidden group-hover:flex items-center gap-2 px-2">
              <Zap size={12} className="text-amber-400 fill-amber-400" />
              <div className="w-1 h-3 bg-white/20 rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-white/40 rounded-full animate-pulse delay-75" />
            </div>
          </div>

          {/* Status Bar Mock */}
          <div className="absolute top-0 left-0 right-0 h-11 bg-transparent flex items-center justify-between px-10 z-[100] text-[#1d1d1f] pointer-events-none">
            <span className="text-[15px] font-bold">9:41</span>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <div className="w-0.5 h-2 bg-black rounded-full" />
                <div className="w-0.5 h-2.5 bg-black rounded-full" />
                <div className="w-0.5 h-3 bg-black rounded-full" />
                <div className="w-0.5 h-3.5 bg-black rounded-full" />
              </div>
              <div className="w-6 h-3.5 border-2 border-black/20 rounded-[4px] relative flex items-center px-0.5">
                <div className="h-full w-4/5 bg-black rounded-[1px]" />
                <div className="absolute -right-1 w-0.5 h-1 bg-black/20 rounded-r-full" />
              </div>
            </div>
          </div>
          
          {/* Dynamic Content */}
          <div className="w-full h-full relative overflow-y-auto scrollbar-hide pt-4">
            {content}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1.5 bg-black/10 rounded-full z-[100] hover:bg-black/20 transition-colors" />
        </div>
        
        {/* Switch back info */}
        <div className="fixed top-8 left-8 flex flex-col gap-1 hidden md:flex">
          <div className="flex items-center gap-2 text-white/40 mb-2">
            <Smartphone size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">LifeFlow Mobile Engine</span>
          </div>
          <div className="text-white/20 text-[10px] leading-relaxed">
            • Obsługa Gestów PWA{"\n"}
            • Symulacja Haptyki{"\n"}
            • Widok 1:1 Natywny
          </div>
        </div>
      </div>
    );
  }

  return content;
}
