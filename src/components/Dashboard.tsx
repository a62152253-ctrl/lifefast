/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format, startOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useHabits } from '../hooks/useHabits';
import { useBudget } from '../hooks/useBudget';
import { useNotes } from '../hooks/useNotes';
import { useGoals } from '../hooks/useGoals';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useStats } from '../hooks/useStats';
import { useMessages } from '../hooks/useMessages';
import { useWeekStats } from '../hooks/useWeekStats';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Flame,
  Wallet,
  NotebookPen,
  Heart,
  Send,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';

import { ProgressCircle } from './ProgressCircle';

const categoryColors: Record<string, string> = {
  praca: 'bg-blue-100 text-blue-700 border-blue-200',
  osobiste: 'bg-green-100 text-green-700 border-green-200',
  zakupy: 'bg-purple-100 text-purple-700 border-purple-200',
  zdrowie: 'bg-red-100 text-red-700 border-red-200',
  nauka: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  dom: 'bg-orange-100 text-orange-700 border-orange-200',
  finanse: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rozrywka: 'bg-pink-100 text-pink-700 border-pink-200',
  sport: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  podróże: 'bg-teal-100 text-teal-700 border-teal-200',
  technologia: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  kreatywność: 'bg-rose-100 text-rose-700 border-rose-200',
  społeczność: 'bg-violet-100 text-violet-700 border-violet-200',
  rozwój: 'bg-amber-100 text-amber-700 border-amber-200',
  inne: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { habits, loading: habitsLoading } = useHabits();
  const { transactions, analytics: budgetAnalytics, loading: budgetLoading, error: budgetError } = useBudget();
  const { notesCount, loading: notesLoading } = useNotes();
  const { goalsCount, goalsInProgress, goalsCompleted, loading: goalsLoading } = useGoals();
  const { calendarEvents, loading: calendarLoading } = useCalendarEvents();
  const { stats, loading: statsLoading } = useStats();
  const { messages, sendMessage, loading: messagesLoading } = useMessages();
  const { weekStats, loading: weekStatsLoading } = useWeekStats();
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const [newMessage, setNewMessage] = useState('');
  const [partnerName] = useState('Partner');
  const [partnerUid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleError = useCallback((err: any, operation: string) => {
    const errorMessage = err?.message || `Wystąpił błąd podczas ${operation}`;
    setError(errorMessage);
    if (!isOffline) {
      showToast({ type: 'error', message: errorMessage });
    }
  }, [showToast, isOffline]);

  useEffect(() => {
    const isLoading = tasksLoading || habitsLoading || budgetLoading || notesLoading ||
      goalsLoading || calendarLoading || statsLoading || messagesLoading || weekStatsLoading;
    setLoading(isLoading);
  }, [tasksLoading, habitsLoading, budgetLoading, notesLoading, goalsLoading, calendarLoading, statsLoading, messagesLoading, weekStatsLoading]);

  useEffect(() => {
    const hasError = tasksError || budgetError;
    if (hasError) {
      handleError(hasError, 'loading dashboard data');
    }
  }, [tasksError, budgetError, handleError]);

  // Derived stats
  const dashboardStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;

    const completedHabits = habits.filter(h => h.completions?.[today]).length;
    const habitStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    const income = budgetAnalytics.totalIncome || 0;
    const expenses = budgetAnalytics.totalExpenses || 0;
    const balance = budgetAnalytics.balance || 0;

    const todayEvents = calendarEvents.filter(e => e.date === today).length;
    const upcomingEvents = calendarEvents.filter(e => new Date(e.date) >= now && e.date !== today).length;

    const unreadMessages = messages.filter(m => !m.read).length;

    return {
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
      },
      habits: {
        total: habits.length,
        completed: completedHabits,
        streak: habitStreak,
      },
      budget: {
        total: income + expenses,
        income,
        expenses,
        balance,
      },
      notes: {
        total: notesCount || 0,
      },
      goals: {
        total: goalsCount || 0,
        inProgress: goalsInProgress || 0,
        completed: goalsCompleted || 0,
      },
      calendar: {
        today: todayEvents,
        upcoming: upcomingEvents,
      },
      messages: {
        total: messages.length,
        unread: unreadMessages,
      },
    };
  }, [tasks, habits, budgetAnalytics, notesCount, goalsCount, goalsInProgress, goalsCompleted, calendarEvents, messages]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Witaj';
    return 'Dobry wieczór';
  }, []);

  const firstName = useMemo(() => user?.displayName?.split(' ')[0] || 'Użytkowniku', [user]);
  const userInitial = useMemo(() => user?.displayName?.[0]?.toUpperCase() || 'T', [user]);
  const partnerInitial = useMemo(() => partnerName?.[0]?.toUpperCase() || 'P', [partnerName]);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const monday = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const formattedDate = useMemo(() => format(new Date(), 'EEEE, d MMMM', { locale: pl }), []);

  const weekDays = useMemo(() =>
    ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label, date: d, key: format(d, 'yyyy-MM-dd') };
    }),
  [monday]);

  const todayEvents = useMemo(() => calendarEvents.filter(e => e.date === today), [calendarEvents, today]);

  const weeklyCompletions = useMemo(() => {
    return weekDays.map(({ key }) => {
      const count = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const d = t.completedAt instanceof Object && 'toDate' in t.completedAt
          ? (t.completedAt as any).toDate()
          : new Date(t.completedAt as any);
        return format(d, 'yyyy-MM-dd') === key;
      }).length;
      return count;
    });
  }, [tasks, weekDays]);

  const openTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const todayTasks = useMemo(() => openTasks.filter(t => t.dueDate === today), [openTasks, today]);
  const xpProgress = useMemo(() => ((stats?.xp ?? 0) / (stats?.xpToNextLevel ?? 3000)) * 100, [stats]);

  const statsCards = useMemo(() => [
    {
      label: 'Zadania',
      value: dashboardStats.tasks.pending,
      sub: 'do zrobienia',
      icon: CheckCircle2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      bar: 'bg-indigo-500',
      to: '/tasks',
      trend: dashboardStats.tasks.overdue > 0 ? 'down' : 'up',
      percentage: dashboardStats.tasks.completionRate,
    },
    {
      label: 'Nawyki',
      value: dashboardStats.habits.total,
      sub: 'na dziś',
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      bar: 'bg-orange-400',
      to: '/habits',
      trend: dashboardStats.habits.completed > 0 ? 'up' : 'neutral',
      percentage: dashboardStats.habits.total > 0 ? Math.round((dashboardStats.habits.completed / dashboardStats.habits.total) * 100) : 0,
    },
    {
      label: 'Finanse',
      value: `${dashboardStats.budget.balance.toFixed(0)} zł`,
      sub: 'bilans',
      icon: Wallet,
      color: dashboardStats.budget.balance >= 0 ? 'text-teal-600' : 'text-rose-600',
      bg: dashboardStats.budget.balance >= 0 ? 'bg-teal-50' : 'bg-rose-50',
      bar: dashboardStats.budget.balance >= 0 ? 'bg-teal-500' : 'bg-rose-500',
      to: '/budget',
      trend: dashboardStats.budget.balance >= 0 ? 'up' : 'down',
      percentage: dashboardStats.budget.total > 0 ? Math.round((dashboardStats.budget.balance / dashboardStats.budget.total) * 100) : 0,
    },
    {
      label: 'Notatki',
      value: dashboardStats.notes.total,
      sub: 'notatek',
      icon: NotebookPen,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      bar: 'bg-amber-400',
      to: '/notes',
      trend: 'neutral',
      percentage: 100,
    },
    {
      label: 'Cele',
      value: dashboardStats.goals.inProgress,
      sub: 'w toku',
      icon: Heart,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      bar: 'bg-rose-500',
      to: '/goals',
      trend: dashboardStats.goals.completed > 0 ? 'up' : 'neutral',
      percentage: dashboardStats.goals.total > 0 ? Math.round((dashboardStats.goals.inProgress / dashboardStats.goals.total) * 100) : 0,
    },
  ], [dashboardStats]);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !user) {
      if (!trimmedMessage) showToast({ type: 'warning', message: 'Wpisz wiadomość' });
      return;
    }
    if (trimmedMessage.length > 500) {
      showToast({ type: 'warning', message: 'Wiadomość nie może przekraczać 500 znaków' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można wysłać wiadomości w trybie offline' });
      return;
    }
    try {
      await sendMessage(trimmedMessage);
      setNewMessage('');
      showToast({ type: 'success', message: 'Wiadomość wysłana' });
    } catch (err) {
      handleError(err, 'sending message');
    }
  }, [newMessage, sendMessage, user, isOffline, showToast, handleError]);

  return (
    <div className="space-y-6 pb-20 bg-gray-50 min-h-screen">
      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-600" />
            <div>
              <h4 className="font-bold text-rose-900">Błąd</h4>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-rose-600 hover:text-rose-800 text-sm font-medium"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Ładowanie dashboard...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* HEADER */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-indigo-500 mb-1 capitalize">{formattedDate}</p>
              <h1 className="text-4xl font-black text-gray-900 leading-tight">
                {getGreeting()}, {firstName}! 👋
              </h1>
              <p className="text-gray-500 mt-1 text-base">
                Masz {dashboardStats.tasks.pending} zadań do zrobienia.
              </p>
            </div>

            {/* XP Widget */}
            <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm flex items-center gap-5 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">XP</p>
                <p className="text-3xl font-black text-gray-900 leading-none">{(stats?.xp ?? 0).toLocaleString('pl')}</p>
                <p className="text-xs text-gray-400 mt-0.5">/ {(stats?.xpToNextLevel ?? 3000).toLocaleString('pl')} do kolejnego poziomu</p>
              </div>
              <ProgressCircle progress={xpProgress} size={72} strokeWidth={6} color="#6366f1">
                <div className="text-center">
                  <p className="text-lg font-black text-indigo-600 leading-none">{stats?.level ?? 1}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide">poz.</p>
                </div>
              </ProgressCircle>
            </div>
          </div>

          {/* STATS ROW (5 cards) */}
          <div className="grid grid-cols-5 gap-4">
            {statsCards.map(({ label, value, sub, icon: Icon, color, bg, bar, to, trend, percentage }) => (
              <Link to={to} key={label}>
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer relative overflow-hidden"
                >
                  {trend && (
                    <div className="absolute top-2 right-2">
                      {trend === 'up' && <TrendingUp size={14} className="text-green-500" />}
                      {trend === 'down' && <TrendingUp size={14} className="text-rose-500 transform rotate-180" />}
                      {trend === 'neutral' && <Activity size={14} className="text-gray-400" />}
                    </div>
                  )}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{sub}</p>
                  <div className="mt-3">
                    <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500 [width:var(--bar-pct)]', bar)}
                        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                        {...{ style: { '--bar-pct': `${percentage}%` } as React.CSSProperties }}
                      />
                    </div>
                  </div>
                  {percentage > 0 && (
                    <div className="mt-1 text-xs text-gray-400">{percentage}%</div>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-3 gap-6">
            {/* LEFT COLUMN (2/3) */}
            <div className="col-span-2 space-y-6">
              {/* TASKS CARD */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900">Dzisiejsze zadania</p>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-0.5 rounded-full">{openTasks.length}</span>
                  </div>
                  <Link to="/tasks" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-sm font-medium">
                    <Plus size={14} /> Dodaj zadanie
                  </Link>
                </div>

                <div className="px-6 pb-2">
                  {todayTasks.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Wszystko zrobione!</p>
                    </div>
                  ) : (
                    todayTasks.map((task) => {
                      const catClass = categoryColors[task.category] ?? 'bg-gray-100 text-gray-600';
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0">
                            {task.completed ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-gray-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Dziś, {format(new Date(task.dueDate), 'HH:mm')}
                              </p>
                            )}
                          </div>
                          {task.category && (
                            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0', catClass)}>
                              {task.category}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {openTasks.length > 0 && (
                  <div className="px-6 pb-5 pt-1">
                    <Link to="/tasks" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                      Zobacz wszystkie zadania →
                    </Link>
                  </div>
                )}
              </div>

              {/* HABITS CARD */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900">Nawyki na dziś</p>
                    <span className="bg-orange-100 text-orange-700 text-xs font-black px-2 py-0.5 rounded-full">{habits.length}</span>
                  </div>
                  <Link to="/habits" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-sm font-medium">
                    <Plus size={14} /> Dodaj nawyk
                  </Link>
                </div>

                <div className="px-6 pb-2">
                  {habits.length === 0 ? (
                    <div className="py-8 text-center">
                      <Flame size={32} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Brak nawyków</p>
                    </div>
                  ) : (
                    habits.slice(0, 6).map((habit) => {
                      const done = !!habit.completions?.[today];
                      const streak = habit.streak || 0;
                      return (
                        <div key={habit.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0">
                            {habit.emoji || '⚡'}
                          </div>
                          <p className="flex-1 text-sm font-semibold text-gray-900 truncate">{habit.name}</p>
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-bold shrink-0">
                              🔥 {streak}
                            </span>
                          )}
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {done
                              ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                              : <Circle size={20} className="text-gray-200 shrink-0" />
                            }
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {habits.length > 0 && (
                  <div className="px-6 pb-5 pt-1">
                    <Link to="/habits" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                      Zobacz wszystkie nawyki →
                    </Link>
                  </div>
                )}
              </div>

              {/* CALENDAR + DAY SUMMARY */}
              <div className="grid grid-cols-2 gap-6">
                {/* MINI CALENDAR */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-gray-900">Kalendarz</p>
                    <Link to="/calendar" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                      Zobacz cały kalendarz
                    </Link>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {weekDays.map(({ label, date, key }) => {
                      const isToday = key === today;
                      const hasEvent = calendarEvents.some(e => e.date === key);
                      return (
                        <Link to={`/calendar?date=${key}`} key={key}>
                          <div
                            className={cn(
                              'aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-colors',
                              isToday ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-gray-700'
                            )}
                          >
                            {date.getDate()}
                          </div>
                          {hasEvent && <div className="w-1 h-1 bg-indigo-400 rounded-full mx-auto mt-1" />}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-50 pt-3 space-y-2">
                    {todayEvents.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={13} />
                        <p className="text-xs">Brak wydarzeń dziś</p>
                      </div>
                    ) : todayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <p className="text-xs text-gray-600 truncate">{ev.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DAY SUMMARY */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-gray-900">Podsumowanie dnia</p>
                    <Link to="/tasks" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                      Zobacz statystyki
                    </Link>
                  </div>

                  <div className="flex items-center gap-4">
                    <ProgressCircle progress={weekStats?.progressPercentage || 0} size={72} strokeWidth={7} color="#6366f1">
                      <div className="text-center">
                        <p className="text-lg font-black text-indigo-600 leading-none">{weekStats?.progressPercentage || 0}%</p>
                      </div>
                    </ProgressCircle>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">
                        {(weekStats?.progressPercentage || 0) >= 70 ? 'Świetna robota!' : (weekStats?.progressPercentage || 0) >= 40 ? 'Dobrze idzie!' : 'Do przodu!'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Wykonałeś {weekStats?.completedThisWeek || 0} z {weekStats?.totalThisWeek || 0} zadań w tym tygodniu.
                      </p>
                    </div>
                  </div>

                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1.5 mt-4 h-10">
                    {(() => {
                      const maxCount = Math.max(...weeklyCompletions, 1);
                      return weekDays.map(({ label, key }, i) => {
                        const isToday = key === today;
                        const height = Math.round((weeklyCompletions[i] / maxCount) * 100) || 4;
                        return (
                          <div key={key} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className={cn('w-full rounded-sm transition-all [height:var(--bar-h)]', isToday ? 'bg-indigo-500' : 'bg-gray-100')}
                              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                              {...{ style: { '--bar-h': `${height}%` } as React.CSSProperties }}
                            />
                            <p className="text-[9px] text-gray-400">{label[0]}</p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR (1/3) */}
            <div className="space-y-5">
              {/* SHARED DASHBOARD */}
              {partnerUid ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-gray-900">Wspólny dashboard</p>
                    <Link to="/settings" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">Zobacz więcej</Link>
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {userInitial}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                      {partnerInitial}
                    </div>
                  </div>

                  <p className="text-center text-sm text-gray-600 mb-4">Ty i {partnerName}</p>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg font-black text-gray-900">{dashboardStats.tasks.pending}</p>
                      <p className="text-xs text-gray-400">zadań dziś</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg font-black text-gray-900">{dashboardStats.tasks.completionRate}%</p>
                      <p className="text-xs text-gray-400">wykonanych</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Heart size={20} className="text-gray-400" />
                    </div>
                    <p className="font-black text-gray-900 mb-2">Dodaj partnera</p>
                    <p className="text-sm text-gray-400 mb-4">Śledźcie wspólne cele i zadania</p>
                    <Link to="/settings" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                      Ustawienia →
                    </Link>
                  </div>
                </div>
              )}

              {/* CHAT */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 px-5 pt-5 pb-4">
                  <MessageCircle size={18} className="text-indigo-600" />
                  <p className="font-black text-gray-900">Wiadomości</p>
                </div>

                <div className="px-5 pb-3">
                  {messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageCircle size={32} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Brak wiadomości</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {messages.slice(-3).map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                            {msg.sender?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-0.5">{msg.sender}</p>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Napisz wiadomość..."
                      className="flex-1 text-xs px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                    >
                      <Send size={15} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* QUICK ADD */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-black text-gray-900 mb-4">Szybkie dodawanie</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Zadanie', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', to: '/tasks' },
                    { label: 'Nawyk', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', to: '/habits' },
                    { label: 'Notatka', icon: NotebookPen, color: 'text-violet-600', bg: 'bg-violet-50', to: '/notes' },
                    { label: 'Wydatki', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', to: '/budget' },
                  ].map(({ label, icon: Icon, color, bg, to }) => (
                    <Link to={to} key={label}>
                      <motion.div
                        whileHover={{ y: -2, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', bg)}>
                          <Icon size={18} className={color} />
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium text-center leading-tight">{label}</p>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
