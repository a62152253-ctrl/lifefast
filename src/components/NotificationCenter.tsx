import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, TrendingDown,
  Zap, Flame, Target, ShoppingCart, Utensils, Heart, CalendarDays
} from 'lucide-react';
import { IconButton, Badge } from './CommonUI';
import { useSmartNotifications, SmartNotification, NotifType } from '../hooks/useSmartNotifications';
import { cn } from '../lib/utils';

// ─── type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, { icon: typeof Zap; color: string; bg: string }> = {
  task:     { icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-50'   },
  budget:   { icon: TrendingDown,  color: 'text-rose-500',    bg: 'bg-rose-50'    },
  habit:    { icon: Flame,         color: 'text-emerald-500', bg: 'bg-emerald-50' },
  goal:     { icon: Target,        color: 'text-indigo-500',  bg: 'bg-indigo-50'  },
  shopping: { icon: ShoppingCart,  color: 'text-violet-500',  bg: 'bg-violet-50'  },
  meal:     { icon: Utensils,      color: 'text-orange-500',  bg: 'bg-orange-50'  },
  mood:     { icon: Heart,         color: 'text-pink-500',    bg: 'bg-pink-50'    },
  calendar: { icon: CalendarDays,  color: 'text-blue-500',    bg: 'bg-blue-50'    },
};

const SEVERITY_STRIPE: Record<SmartNotification['severity'], string> = {
  error:   'border-l-[3px] border-l-rose-400',
  warning: 'border-l-[3px] border-l-amber-400',
  info:    'border-l-[3px] border-l-indigo-200',
};

// ─── component ───────────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { notifications } = useSmartNotifications();

  const visible = notifications.filter((n: SmartNotification) => !dismissed.has(n.id));
  const errorCount = visible.filter((n: SmartNotification) => n.severity === 'error').length;

  const dismiss = (id: string) =>
    setDismissed((prev: Set<string>) => new Set([...prev, id]));

  const dismissAll = () =>
    setDismissed(new Set(notifications.map((n: SmartNotification) => n.id)));

  // dot colour: red if any errors, amber if warnings, indigo otherwise
  const dotColor = errorCount > 0
    ? 'bg-red-500'
    : visible.some((n: SmartNotification) => n.severity === 'warning')
      ? 'bg-amber-400'
      : 'bg-indigo-400';

  return (
    <div className="relative">
      {/* Bell button */}
      <div className="relative">
        <IconButton
          icon={Bell}
          onClick={() => setIsOpen((o: boolean) => !o)}
          className={cn('bg-gray-50', isOpen && 'bg-indigo-600 text-white')}
        />
        {visible.length > 0 && (
          <span className={cn(
            'absolute top-1.5 right-1.5 w-2.5 h-2.5 border-2 border-white rounded-full',
            dotColor
          )} />
        )}
      </div>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* backdrop */}
            <div
              className="fixed inset-0 z-[140]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                // positioning — on mobile anchor to right edge of screen
                'fixed md:absolute right-0 md:right-0',
                'top-[4.5rem] md:top-auto md:mt-4',
                // sizing
                'w-[calc(100vw-2rem)] max-w-[22rem] md:w-96',
                // style
                'bg-white rounded-[2rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border border-gray-100 z-[150] overflow-hidden',
                // mobile: center horizontally
                'left-4 md:left-auto'
              )}
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-800 tracking-tight">Powiadomienia</h3>
                  {visible.length > 0 && (
                    <Badge variant={errorCount > 0 ? 'danger' : 'primary'}>
                      {visible.length}
                    </Badge>
                  )}
                </div>
                {visible.length > 0 && (
                  <button
                    onClick={dismissAll}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                  >
                    Wyczyść
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[60vh] md:max-h-[420px] overflow-y-auto p-4 space-y-2.5">
                {visible.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-gray-300">
                    <Bell size={36} className="mb-3 opacity-20" />
                    <p className="font-bold text-sm">Wszystko gra!</p>
                    <p className="text-xs mt-1 text-gray-400">Brak nowych powiadomień</p>
                  </div>
                ) : (
                  visible.map((item: SmartNotification) => {
                    const cfg = TYPE_CONFIG[item.type];
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        className={cn(
                          'relative group p-4 rounded-2xl bg-gray-50/60 hover:bg-white',
                          'hover:shadow-lg hover:shadow-gray-100 transition-all',
                          'border border-transparent hover:border-gray-100',
                          SEVERITY_STRIPE[item.severity as keyof typeof SEVERITY_STRIPE]
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            cfg.bg, cfg.color
                          )}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-black text-gray-800 leading-tight">
                                {item.title}
                              </p>
                              <span className="text-[9px] font-bold text-gray-400 shrink-0 mt-0.5">
                                {item.time}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        </div>

                        {/* dismiss button */}
                        <button
                          onClick={() => dismiss(item.id)}
                          className={cn(
                            'absolute top-2 right-2 p-1.5 rounded-lg transition-all',
                            'opacity-0 group-hover:opacity-100',
                            'bg-white shadow-sm border border-gray-100',
                            'text-gray-400 hover:text-red-500'
                          )}
                        >
                          <CheckCheck size={11} />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
