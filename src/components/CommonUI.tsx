import { 
  ListTodo, 
  ShoppingBag, 
  Zap, 
  NotebookPen, 
  Wallet, 
  CalendarRange, 
  Settings as SettingsIcon,
  LayoutDashboard,
  Sparkles,
  Users,
  Utensils,
  Heart,
  Plus,
  Trash2,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Search,
  Bell,
  Menu,
  X,
  ArrowRight
} from 'lucide-react';
import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { hapticFeedback } from '../lib/utils';
import { cn } from '../lib/utils';

// Common UI Types
export interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, path: '/' },
  { id: 'calendar', label: 'Kalendarz', icon: CalendarRange, path: '/calendar' },
  { id: 'daily-plan', label: 'Plan', icon: Zap, path: '/plan' },
  { id: 'meals', label: 'Posiłki', icon: Utensils, path: '/meals' },
  { id: 'mood', label: 'Nastrój', icon: Heart, path: '/mood' },
  { id: 'tasks', label: 'Zadania', icon: ListTodo, path: '/tasks' },
  { id: 'habits', label: 'Nawyki', icon: Sparkles, path: '/habits' },
  { id: 'budget', label: 'Finanse', icon: Wallet, path: '/budget' },
  { id: 'shopping', label: 'Zakupy', icon: ShoppingBag, path: '/shopping' },
  { id: 'notes', label: 'Notatki', icon: NotebookPen, path: '/notes' },
  { id: 'settings', label: 'Opcje', icon: SettingsIcon, path: '/settings' },
];

export const DIRECT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, path: '/direct' },
  { id: 'calendar', label: 'Kalendarz', icon: CalendarRange, path: '/direct/calendar' },
  { id: 'daily-plan', label: 'Plan', icon: Zap, path: '/direct/plan' },
  { id: 'meals', label: 'Posiłki', icon: Utensils, path: '/direct/meals' },
  { id: 'mood', label: 'Nastrój', icon: Heart, path: '/direct/mood' },
  { id: 'tasks', label: 'Zadania', icon: ListTodo, path: '/direct/tasks' },
  { id: 'habits', label: 'Nawyki', icon: Sparkles, path: '/direct/habits' },
  { id: 'budget', label: 'Finanse', icon: Wallet, path: '/direct/budget' },
  { id: 'shopping', label: 'Zakupy', icon: ShoppingBag, path: '/direct/shopping' },
  { id: 'notes', label: 'Notatki', icon: NotebookPen, path: '/direct/notes' },
  { id: 'settings', label: 'Opcje', icon: SettingsIcon, path: '/direct/settings' },
];

export const Card = ({ children, className = "", onClick, ...props }: { children: ReactNode, className?: string, onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    {...props} 
    onClick={(e) => {
      if (onClick) {
        hapticFeedback('light');
        onClick();
      }
    }}
    className={cn(
      "bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500", 
      onClick && "cursor-pointer hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] hover:-translate-y-1 active:scale-[0.98]",
      className
    )}
  >
    {children}
  </div>
);

export const BentoGrid = ({ children, className = "" }: { children: ReactNode, className?: string }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
    {children}
  </div>
);

export const BentoCard = ({ 
  children, 
  className = "", 
  span = 'col-span-1',
  bgColor = 'bg-white'
}: { 
  children: ReactNode, 
  className?: string,
  span?: string,
  bgColor?: string
}) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className={cn(
      "rounded-[2.5rem] p-8 border border-gray-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden transition-all duration-500", 
      span, 
      bgColor,
      className
    )}
  >
    {children}
  </motion.div>
);

export const GlassCard = ({ children, className = "", ...props }: { children: ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn("glass rounded-[2.5rem] p-7 shadow-3xl shadow-gray-200/20 transition-all duration-500 border border-white/40", className)}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'primary', className = "" }: { children: ReactNode, variant?: 'primary' | 'secondary' | 'danger' | 'success', className?: string }) => {
  const styles = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-100/50',
    secondary: 'bg-gray-50 text-gray-600 border-gray-100',
    danger: 'bg-red-50 text-red-600 border-red-100/50',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border", styles[variant], className)}>
      {children}
    </span>
  );
};

export const PageHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: ReactNode }) => (
  <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-entrance">
    <div className="space-y-4">
      <h1 className="text-6xl md:text-8xl font-display font-black text-[#1d1d1f] tracking-tighter leading-none">{title}</h1>
      {subtitle && <p className="text-gray-400 font-medium text-xl md:text-2xl max-w-2xl tracking-tight leading-relaxed">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "",
  disabled = false,
  type = 'button'
}: { 
  children: ReactNode, 
  onClick?: (e?: any) => void, 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'glass',
  className?: string,
  disabled?: boolean,
  type?: 'button' | 'submit'
}) => {
  const handleClick = (e: any) => {
    hapticFeedback('light');
    if (onClick) onClick(e);
  };

  const variants = {
    primary: 'bg-[#1D1D1F] text-white hover:bg-black shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] active:scale-95',
    secondary: 'bg-white text-[#1D1D1F] border border-gray-100 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-400 hover:bg-gray-50 hover:text-indigo-600',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white active:scale-95 shadow-xl shadow-rose-100',
    white: 'bg-white text-[#1D1D1F] border border-gray-50 shadow-xl hover:shadow-2xl hover:-translate-y-0.5',
    glass: 'glass text-[#1D1D1F] hover:bg-white transition-all shadow-xl'
  };

  return (
    <button 
      type={type}
      onClick={handleClick} 
      disabled={disabled}
      className={cn(
        "px-7 py-4 rounded-3xl font-black transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest leading-none",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

export const IconButton = ({ 
  icon: Icon, 
  onClick, 
  className = "" 
}: { 
  icon: any, 
  onClick?: (e: React.MouseEvent) => void, 
  className?: string 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    hapticFeedback('light');
    if (onClick) onClick(e);
  };
  
  return (
    <button 
      onClick={handleClick}
      className={cn("p-3.5 rounded-2xl hover:bg-gray-100 transition-all active:scale-90", className)}
    >
      <Icon size={20} className="text-gray-600" />
    </button>
  );
};

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  children: ReactNode 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0f0f12]/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, y: '100%', scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: '100%', scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white w-full md:max-w-xl rounded-t-[3rem] md:rounded-[3rem] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] md:shadow-[0_32px_96px_-32px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            {/* Grabber for Mobile Drawer */}
            <div className="flex md:hidden justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-100 rounded-full" />
            </div>
            
            <div className="p-8 md:p-10 pb-4 flex justify-between items-center">
              <h3 className="text-2xl md:text-3xl font-black text-[#1d1d1f] tracking-tighter">{title}</h3>
              <IconButton icon={X} onClick={onClose} className="bg-gray-50 p-3" />
            </div>
            <div className="p-8 md:p-10 pt-4 max-h-[85vh] md:max-h-[75vh] overflow-y-auto scrollbar-hide pb-20 md:pb-10">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const ProgressCircle = ({ 
  progress, 
  size = 60, 
  strokeWidth = 6, 
  color = '#4f46e5',
  children
}: { 
  progress: number, 
  size?: number, 
  strokeWidth?: number, 
  color?: string,
  children?: ReactNode
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-100/50"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export const FloatingActionButton = ({ icon: Icon, onClick }: { icon: any, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="fixed bottom-32 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40"
  >
    <Icon size={28} />
  </button>
);

export const Toast = ({ 
  message, 
  isVisible, 
  onClose,
  type = 'info'
}: { 
  message: string, 
  isVisible: boolean, 
  onClose: () => void,
  type?: 'info' | 'success' | 'warning'
}) => {
  const colors = {
    info: 'bg-indigo-600 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: -50, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -50, opacity: 0, x: '-50%' }}
          className="fixed top-8 left-1/2 z-[300] max-w-sm w-[90%] px-4"
        >
          <div className={cn(colors[type], "p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-4 border border-white/20 backdrop-blur-2xl")}>
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white/20 rounded-2xl">
                <Bell size={18} />
              </div>
              <p className="font-bold text-sm tracking-tight">{message}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
