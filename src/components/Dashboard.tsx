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

import { CheckCircle2, Circle, Plus, Clock, Calendar, Flame, Wallet, NotebookPen, Heart, Send, MessageCircle } from 'lucide-react';
import { ProgressCircle } from './ProgressCircle';

const categoryColors = {
  praca: 'bg-blue-100 text-blue-700',
  osobiste: 'bg-green-100 text-green-700',
  zakupy: 'bg-purple-100 text-purple-700',
  zdrowie: 'bg-red-100 text-red-700',
  nauka: 'bg-yellow-100 text-yellow-700',
  dom: 'bg-orange-100 text-orange-700',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { budgetTotal } = useBudget();
  const { notesCount } = useNotes();
  const { goalsCount } = useGoals();
  const { calendarEvents } = useCalendarEvents();
  const { stats } = useStats();
  const { messages, sendMessage } = useMessages();
  const { weekStats } = useWeekStats();

  const [newMessage, setNewMessage] = useState('');
  const [partnerName, setPartnerName] = useState('Partner');
  const [partnerUid, setPartnerUid] = useState('');

  // Memoize expensive calculations
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const monday = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const formattedDate = useMemo(() => format(new Date(), 'EEEE, d MMMM', { locale: pl }), []);

  // Optimize task filtering
  const openTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const todayTasks = useMemo(() => openTasks.filter(t => t.dueDate === today), [openTasks, today]);
  const xpProgress = useMemo(() => ((stats?.xp ?? 0) / (stats?.xpToNextLevel ?? 3000)) * 100, [stats]);

  // Memoize user data
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Witaj';
    return 'Dobry wieczór';
  }, []);

  const firstName = useMemo(() => user?.displayName?.split(' ')[0] || 'Użytkowniku', [user]);
  const userInitial = useMemo(() => user?.displayName?.[0]?.toUpperCase() || 'T', [user]);
  const partnerInitial = useMemo(() => partnerName?.[0]?.toUpperCase() || 'P', [partnerName]);

  // Optimize week days calculation
  const weekDays = useMemo(() =>
    ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label, date: d, key: format(d, 'yyyy-MM-dd') };
    }),
  [monday]);

  // Optimize events filtering
  const todayEvents = useMemo(() => calendarEvents.filter((e) => e.date === today), [calendarEvents, today]);

  // Memoize stats cards to prevent recreation
  const statsCards = useMemo(() => [
    { label: 'Zadania',  value: openTasks.length,                    sub: 'do zrobienia',    icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500', to: '/tasks' },
    { label: 'Nawyki',   value: habits.length,                       sub: 'na dziś',         icon: Flame,        color: 'text-orange-500', bg: 'bg-orange-50', bar: 'bg-orange-400', to: '/habits' },
    { label: 'Finanse',  value: `${budgetTotal.toFixed(0)} zł`,      sub: 'wydatki w maju',  icon: Wallet,       color: 'text-teal-600',  bg: 'bg-teal-50',  bar: 'bg-teal-500',  to: '/budget' },
    { label: 'Notatki',  value: notesCount,                          sub: 'notatek',         icon: NotebookPen,  color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', to: '/notes' },
    { label: 'Cele',     value: goalsCount,                          sub: 'aktywne cele',    icon: Heart,        color: 'text-rose-500',  bg: 'bg-rose-50',  bar: 'bg-rose-500',  to: '/goals' },
  ], [openTasks.length, habits.length, budgetTotal, notesCount, goalsCount]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [newMessage, sendMessage]);

  return (
    <div className="space-y-6 pb-20 bg-gray-50 min-h-screen">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-indigo-500 mb-1 capitalize">{formattedDate}</p>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-gray-500 mt-1 text-base">Masz świetny plan na dzisiaj. Dasz radę!</p>
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

      {/* ── STATS ROW (5 cards) ── */}
      <div className="grid grid-cols-5 gap-4">
        {statsCards.map(({ label, value, sub, icon: Icon, color, bg, bar, to }) => (
          <Link to={to} key={label}>
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
              <div className={cn('h-0.5 w-full rounded-full mt-3', bar)} />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
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
                  const done   = !!habit.completions?.[today];
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
                        )}>
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
                {weekDays.map(({ label, key }, i) => {
                  const isToday = key === today;
                  const height  = [40, 55, 70, 60, 45, 30, 20][i];
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn('w-full rounded-sm transition-all', isToday ? 'bg-indigo-500' : 'bg-gray-100')}
                        style={{ height: `${height}%` }}
                      />
                      <p className="text-[9px] text-gray-400">{label[0]}</p>
                    </div>
                  );
                })}
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

              {/* Avatars */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {userInitial}
                </div>
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                  {partnerInitial}
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 mb-4">Ty i {partnerName}</p>

              {/* Partner stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-black text-gray-900">12</p>
                  <p className="text-xs text-gray-400">zadań dziś</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-black text-gray-900">85%</p>
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
                { label: 'Nawyk',   icon: Flame,        color: 'text-orange-500', bg: 'bg-orange-50', to: '/habits' },
                { label: 'Notatka', icon: NotebookPen,  color: 'text-violet-600', bg: 'bg-violet-50', to: '/notes' },
                { label: 'Wydatki', icon: Wallet,       color: 'text-emerald-600',bg: 'bg-emerald-50',to: '/budget' },
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
    </div>
  );
}
