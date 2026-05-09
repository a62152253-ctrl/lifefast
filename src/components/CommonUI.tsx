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
  ArrowRight,
  MessageCircle,
  Target,
  Shield,
} from 'lucide-react';
import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { hapticFeedback } from '../lib/utils';
import { cn } from '../lib/utils';

// ─── Nav items ────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Panel',    icon: LayoutDashboard, path: '/'         },
  { id: 'calendar',   label: 'Kalendarz',icon: CalendarRange,   path: '/calendar' },
  { id: 'daily-plan', label: 'Plan',     icon: Zap,             path: '/plan'     },
  { id: 'meals',      label: 'Posiłki',  icon: Sparkles,        path: '/meals'    },
  { id: 'mood',       label: 'Nastrój',  icon: Heart,           path: '/mood'     },
  { id: 'tasks',      label: 'Zadania',  icon: ListTodo,        path: '/tasks'    },
  { id: 'habits',     label: 'Nawyki',   icon: Zap,             path: '/habits'   },
  { id: 'budget',     label: 'Finanse',  icon: Wallet,          path: '/budget'   },
  { id: 'shopping',   label: 'Zakupy',   icon: ShoppingBag,     path: '/shopping' },
  { id: 'notes',      label: 'Notatki',  icon: NotebookPen,     path: '/notes'    },
  { id: 'goals',      label: 'Cele',     icon: Target,          path: '/goals'    },
  { id: 'chat',       label: 'Chat',     icon: MessageCircle,   path: '/chat'     },
  { id: 'settings',   label: 'Opcje',    icon: SettingsIcon,    path: '/settings' },
];

export const DIRECT_NAV_ITEMS: NavItem[] = NAV_ITEMS.map(item => ({
  ...item,
  path: item.path === '/' ? '/direct' : `/direct${item.path}`,
}));

// ─── Card ─────────────────────────────────────────────────────────────────────

export const Card = ({
  children,
  className = '',
  onClick,
  ...props
}: { children: ReactNode; className?: string; onClick?: () => void } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...props}
    onClick={() => { if (onClick) { hapticFeedback('light'); onClick(); } }}
    className={cn(
      'bg-white rounded-[1.75rem] border border-black/[0.055] transition-all duration-200',
      'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)]',
      onClick && [
        'cursor-pointer',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]',
        'hover:-translate-y-0.5 active:scale-[0.98] active:shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
      ],
      className,
    )}
  >
    {children}
  </div>
);

// ─── BentoGrid + BentoCard ────────────────────────────────────────────────────

export const BentoGrid = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5', className)}>
    {children}
  </div>
);

export const BentoCard = ({
  children,
  className = '',
  span = 'col-span-1',
}: { children: ReactNode; className?: string; span?: string }) => (
  <motion.div
    whileHover={{ y: -3, transition: { duration: 0.2 } }}
    className={cn(
      'rounded-[1.75rem] border border-black/[0.055] relative overflow-hidden transition-all duration-200',
      'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)]',
      'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]',
      span,
      className,
    )}
  >
    {children}
  </motion.div>
);

// ─── GlassCard ────────────────────────────────────────────────────────────────

export const GlassCard = ({
  children,
  className = '',
  ...props
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...props}
    className={cn(
      'glass-card rounded-[1.75rem] p-7 transition-all duration-200',
      className,
    )}
  >
    {children}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────

export const Badge = ({
  children,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  className?: string;
}) => {
  const styles: Record<string, string> = {
    primary:   'bg-indigo-50 text-indigo-700 border border-indigo-100/80',
    secondary: 'bg-[#f5f5f7] text-[#6e6e73] border border-black/[0.05]',
    danger:    'bg-rose-50 text-rose-600 border border-rose-100/80',
    success:   'bg-emerald-50 text-emerald-700 border border-emerald-100/80',
    warning:   'bg-amber-50 text-amber-700 border border-amber-100/80',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

// ─── PageHeader ───────────────────────────────────────────────────────────────

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-entrance">
    <div className="space-y-2">
      <h1 className="text-5xl md:text-6xl font-display font-black text-[#1d1d1f] tracking-tighter leading-none">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[#6e6e73] font-medium text-base md:text-lg max-w-xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

// ─── Button ───────────────────────────────────────────────────────────────────

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: (e?: any) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'glass';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants: Record<string, string> = {
    primary:   'bg-[#1d1d1f] text-white hover:bg-black active:scale-[0.97] shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]',
    secondary: 'bg-white text-[#1d1d1f] border border-black/[0.08] hover:bg-[#f5f5f7] hover:border-black/[0.12] active:scale-[0.97]',
    ghost:     'bg-transparent text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] active:scale-[0.97]',
    danger:    'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 active:scale-[0.97] shadow-sm hover:shadow-lg hover:shadow-rose-200',
    white:     'bg-white text-[#1d1d1f] border border-black/[0.08] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
    glass:     'glass text-[#1d1d1f] hover:bg-white/90 active:scale-[0.97] shadow-sm',
  };

  const handleClick = (e: any) => {
    // Instant visual feedback
    if (onClick) onClick(e);
    // Debounced haptic to avoid blocking
    setTimeout(() => hapticFeedback('light'), 0);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest',
        'transition-all duration-100 ease-out', // Faster transition
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'flex items-center justify-center gap-2 leading-none whitespace-nowrap',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
};

// ─── IconButton ───────────────────────────────────────────────────────────────

export const IconButton = ({
  icon: Icon,
  onClick,
  className = '',
  title,
  size = 'md',
  disabled = false,
  children,
}: {
  icon?: any;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children?: React.ReactNode;
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const handleClick = (e: React.MouseEvent) => {
    // Instant visual feedback - execute onClick immediately
    if (onClick) onClick(e);
    // Debounced haptic to avoid blocking UI thread
    setTimeout(() => hapticFeedback('light'), 0);
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        'rounded-2xl flex items-center justify-center shrink-0',
        'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]',
        'transition-all duration-100 active:scale-95', // Faster transition
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-[#1d1d1f]/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
          className={cn(
            'relative w-full bg-white overflow-hidden z-10',
            'md:max-w-lg md:rounded-[2rem] md:shadow-[0_40px_80px_rgba(0,0,0,0.2)]',
            'rounded-t-[2rem] shadow-[0_-8px_48px_rgba(0,0,0,0.12)]',
          )}
        >
          {/* Grab handle (mobile) */}
          <div className="flex md:hidden justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#d1d1d6] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-5 pb-4 border-b border-black/[0.05]">
            <h3 className="text-xl font-black text-[#1d1d1f] tracking-tight">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#e5e5ea] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="px-7 py-6 max-h-[78vh] md:max-h-[72vh] overflow-y-auto scrollbar-hide pb-8">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ─── ProgressCircle ───────────────────────────────────────────────────────────

export const ProgressCircle = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = '#4f46e5',
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
}) => {
  const r   = (size - strokeWidth) / 2;
  const c   = r * 2 * Math.PI;
  const off = c - (progress / 100) * c;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={strokeWidth}
          stroke="currentColor" fill="transparent"
          className="text-[#f5f5f7]"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={strokeWidth}
          stroke={color} fill="transparent"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// ─── FloatingActionButton ─────────────────────────────────────────────────────

export const FloatingActionButton = ({
  icon: Icon,
  onClick,
}: {
  icon: any;
  onClick?: () => void;
}) => {
  const handleClick = () => {
    // Instant visual feedback
    if (onClick) onClick();
    // Debounced haptic to avoid blocking
    setTimeout(() => hapticFeedback('medium'), 0);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }} // Reduced scale for better performance
      whileTap={{ scale: 0.95 }}  // Faster tap response
      transition={{ duration: 0.1 }}    // Faster animation
      onClick={handleClick}
      className={cn(
        'fixed bottom-28 right-5 md:bottom-8 md:right-8 z-40',
        'w-14 h-14 rounded-[1.25rem] flex items-center justify-center',
        'bg-[#1d1d1f] text-white',
        'shadow-[0_8px_24px_rgba(0,0,0,0.28),0_4px_8px_rgba(0,0,0,0.16)]',
        'transition-all duration-100', // Faster transition
      )}
    >
      <Icon size={24} />
    </motion.button>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

export const Toast = ({
  message,
  isVisible,
  onClose,
  type = 'info',
}: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'info' | 'success' | 'warning';
}) => {
  const styles: Record<string, string> = {
    info:    'bg-[#1d1d1f] text-white',
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -60, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -60, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed top-6 left-1/2 z-[300] w-[90vw] max-w-sm"
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 px-5 py-4 rounded-2xl',
              'shadow-[0_16px_40px_rgba(0,0,0,0.2)]',
              styles[type],
            )}
          >
            <p className="text-sm font-bold leading-tight">{message}</p>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
