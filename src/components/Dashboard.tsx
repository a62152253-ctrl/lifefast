import React, { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Flame,
  Wallet,
  MessageCircle,
  Zap,
  NotebookPen,
  Circle,
  Heart,
  Sparkles,
  ListTodo,
  ChevronRight,
  Clock,
  Target,
  Users,
  Brain,
  TrendingUp,
  Send,
  Plus,
  CalendarDays,
} from 'lucide-react';

import { auth, db } from '../lib/firebase';
import { calculateStats } from '../lib/gamification';
import { cn } from '../lib/utils';
import { ProgressCircle } from './CommonUI';
import { getDashboardInsight } from '../services/geminiService';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Dobranoc';
  if (h < 12) return 'Dzień dobry';
  if (h < 18) return 'Cześć';
  return 'Dobry wieczór';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getHabitStreak(habit: any): number {
  if (!habit.completions) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = format(d, 'yyyy-MM-dd');
    if (habit.completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const categoryColors: Record<string, string> = {
  Zdrowie: 'bg-green-100 text-green-700',
  Praca:   'bg-blue-100 text-blue-700',
  Dom:     'bg-orange-100 text-orange-700',
  Rozwój:  'bg-purple-100 text-purple-700',
  Finanse: 'bg-emerald-100 text-emerald-700',
  Hobby:   'bg-pink-100 text-pink-700',
  Sport:   'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const now = useClock();

  const [partnerUid, setPartnerUid]         = useState<string | null>(null);
  const [partnerName, setPartnerName]       = useState<string>('');
  const [tasks, setTasks]                   = useState<any[]>([]);
  const [habits, setHabits]                 = useState<any[]>([]);
  const [budgetTotal, setBudgetTotal]       = useState(0);
  const [notesCount, setNotesCount]         = useState(0);
  const [goalsCount, setGoalsCount]         = useState(0);
  const [stats, setStats]                   = useState<any>(null);
  const [aiLoading, setAiLoading]           = useState<string | null>(null);
  const [aiResponse, setAiResponse]         = useState<string>('');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [sharedTasks, setSharedTasks]       = useState<any[]>([]);
  const [sharedGoals, setSharedGoals]       = useState<any[]>([]);
  const [partnerActivity, setPartnerActivity] = useState<any>(null);
  const [chatMessages, setChatMessages]     = useState<any[]>([]);
  const [weekStats, setWeekStats]           = useState<any>(null);
  const [newMessage, setNewMessage]         = useState('');

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !partnerUid) return;
    try {
      await addDoc(collection(db, 'messages'), {
        content: newMessage.trim(),
        senderId: user.uid,
        participants: [user.uid, partnerUid],
        timestamp: new Date(),
        read: false,
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPartnerUid(data.partnerUid || null);
        setPartnerName(data.partnerName || '');
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uids = partnerUid ? [user.uid, partnerUid] : [user.uid];
    const unsubTasks  = onSnapshot(query(collection(db, 'tasks'),  where('userId', 'in', uids)), (s) => setTasks(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubHabits = onSnapshot(query(collection(db, 'habits'), where('userId', 'in', uids)), (s) => setHabits(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubTasks(); unsubHabits(); };
  }, [user, partnerUid]);

  useEffect(() => {
    if (!user) return;
    const monthStart = format(new Date(), 'yyyy-MM-01');
    return onSnapshot(
      query(collection(db, 'expenses'), where('userId', '==', user.uid), where('date', '>=', monthStart)),
      (s) => setBudgetTotal(s.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0))
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'notes'), where('userId', '==', user.uid), limit(50)), (s) => setNotesCount(s.size));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'goals'), where('userId', '==', user.uid), where('completed', '==', false)), (s) => setGoalsCount(s.size));
  }, [user]);

  useEffect(() => { setStats(calculateStats(tasks, habits)); }, [tasks, habits]);

  useEffect(() => {
    if (!user) return;
    const uids = partnerUid ? [user.uid, partnerUid] : [user.uid];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    return onSnapshot(
      query(collection(db, 'calendarEvents'), where('userId', 'in', uids), where('date', '>=', format(startOfWeek, 'yyyy-MM-dd')), where('date', '<=', format(endOfWeek, 'yyyy-MM-dd')), orderBy('date')),
      (s) => setCalendarEvents(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [user, partnerUid]);

  useEffect(() => {
    if (!user || !partnerUid) return;
    const unsubGoals = onSnapshot(
      query(collection(db, 'sharedGoals'), where('participants', 'array-contains-any', [user.uid, partnerUid])),
      (s) => setSharedGoals(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubSharedTasks = onSnapshot(
      query(collection(db, 'tasks'), where('shared', '==', true), where('userId', 'in', [user.uid, partnerUid])),
      (s) => setSharedTasks(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubActivity = onSnapshot(
      query(collection(db, 'activity'), where('userId', '==', partnerUid), orderBy('timestamp', 'desc'), limit(1)),
      (s) => { if (s.docs.length > 0) setPartnerActivity({ id: s.docs[0].id, ...s.docs[0].data() }); }
    );
    return () => { unsubGoals(); unsubSharedTasks(); unsubActivity(); };
  }, [user, partnerUid]);

  useEffect(() => {
    if (!user || !partnerUid) return;
    return onSnapshot(
      query(collection(db, 'messages'), where('participants', 'array-contains-any', [user.uid, partnerUid]), orderBy('timestamp', 'desc'), limit(5)),
      (s) => setChatMessages(s.docs.map((d) => ({ id: d.id, ...d.data() })).reverse())
    );
  }, [user, partnerUid]);

  useEffect(() => {
    if (!user) return;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return onSnapshot(
      query(collection(db, 'tasks'), where('userId', '==', user.uid), where('createdAt', '>=', weekStart)),
      (s) => {
        const weekTasks = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        const completedThisWeek = weekTasks.filter((t) => t.completed).length;
        const totalThisWeek = weekTasks.length;
        setWeekStats({ completedThisWeek, totalThisWeek, progressPercentage: totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0 });
      }
    );
  }, [user]);

  const openTasks     = tasks.filter((t) => !t.completed);
  const doneToday     = tasks.filter((t) => t.completed).length;
  const todayTasks    = openTasks.slice(0, 5);
  const habitsToday   = habits.filter((h) => h.completions?.[today]);
  const habitProgress = habits.length ? Math.round((habitsToday.length / habits.length) * 100) : 0;
  const xpProgress    = stats ? Math.round((stats.xp / stats.xpToNextLevel) * 100) : 0;
  const firstName     = user?.displayName?.split(' ')[0] || 'Użytkowniku';
  const formattedDate = format(now, "EEEE, d MMMM", { locale: pl });

  const handleAiAction = async (action: string) => {
    setAiLoading(action);
    setAiResponse('');
    try {
      let response = '';
      if (action === 'plan') {
        response = await getDashboardInsight(tasks, habits, firstName);
      } else if (action === 'week') {
        const done = tasks.filter((t) => t.completed && new Date(t.completedAt || Date.now()) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
        response = `W tym tygodniu ukończyłeś ${done} z ${tasks.length} zadań. ${done > tasks.length * 0.7 ? 'Świetny postęp!' : 'Skup się na priorytetach.'}`;
      } else if (action === 'motivate') {
        const msgs = ["Każdy mały krok przybliża Cię do wielkiego celu! 💪", "Masz w sobie siłę, by osiągnąć wszystko! 🚀", "Dzisiaj jest kolejną szansą na bycie lepszą wersją siebie! ⭐", "Twoja determinacja przyniesie niesamowite rezultaty! 🔥", "Nawet największe podróże zaczynają od jednego kroku! 🌟"];
        response = msgs[Math.floor(Math.random() * msgs.length)];
      } else if (action === 'habits') {
        if (habitsToday.length === habits.length && habits.length > 0) response = "Perfekcyjnie! Dziś wykonałeś wszystkie nawyki! 🎯";
        else if (habitsToday.length / habits.length > 0.5) response = "Dobrze idzie! Masz już ponad połowę nawyków zrobionych. 💪";
        else response = "Skup się na małych, stałych krokach. Jeden nawyk naraz! 🌱";
      }
      setAiResponse(response);
    } catch {
      setAiResponse("Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setAiLoading(null);
    }
  };

  // Week calendar helpers
  const monday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekDays = useMemo(() =>
    ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label, date: d, key: format(d, 'yyyy-MM-dd') };
    }),
  [monday]);

  const todayEvents = calendarEvents.filter((e) => e.date === today);

  const userInitial    = user?.displayName?.[0]?.toUpperCase() || 'T';
  const partnerInitial = partnerName?.[0]?.toUpperCase() || 'P';

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
        {[
          { label: 'Zadania',  value: openTasks.length,                    sub: 'do zrobienia',    icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500', to: '/tasks' },
          { label: 'Nawyki',   value: habits.length,                       sub: 'na dziś',         icon: Flame,        color: 'text-orange-500', bg: 'bg-orange-50', bar: 'bg-orange-400', to: '/habits' },
          { label: 'Finanse',  value: `${budgetTotal.toFixed(0)} zł`,      sub: 'wydatki w maju',  icon: Wallet,       color: 'text-teal-600',  bg: 'bg-teal-50',  bar: 'bg-teal-500',  to: '/budget' },
          { label: 'Notatki',  value: notesCount,                          sub: 'notatek',         icon: NotebookPen,  color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', to: '/notes' },
          { label: 'Cele',     value: goalsCount,                          sub: 'aktywne cele',    icon: Heart,        color: 'text-rose-500',  bg: 'bg-rose-50',  bar: 'bg-rose-500',  to: '/goals' },
        ].map(({ label, value, sub, icon: Icon, color, bg, bar, to }) => (
          <Link to={to} key={label}>
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden"
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
                      <button className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                        {task.completed && <CheckCircle2 size={14} className="text-indigo-500" />}
                      </button>
                      {task.emoji && (
                        <span className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-base shrink-0">{task.emoji}</span>
                      )}
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
                  const streak = getHabitStreak(habit);
                  return (
                    <div key={habit.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0">
                        {habit.emoji || '⚡'}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-gray-900 truncate">{habit.name}</p>
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-bold shrink-0">
                          <Flame size={12} className="text-orange-400" />
                          {streak} {streak === 1 ? 'dzień' : 'dni'}
                        </span>
                      )}
                      {done
                        ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                        : <Circle size={20} className="text-gray-200 shrink-0" />
                      }
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

            {/* CALENDAR MINI */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-black text-gray-900">Kalendarz</p>
                <Link to="/calendar" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">
                  Zobacz cały kalendarz
                </Link>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-3">
                {weekDays.map(({ label, date, key }) => {
                  const isToday  = key === today;
                  const hasEvent = calendarEvents.some((e) => e.date === key);
                  return (
                    <Link to="/calendar" key={key} className="text-center block">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-colors hover:bg-indigo-100',
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
                    <p className="text-xs text-gray-700 font-medium flex-1 truncate">{ev.title}</p>
                    {ev.time && <span className="text-xs text-gray-400">{ev.time}</span>}
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
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-base border-2 border-white shadow">
                  {userInitial}
                </div>
                <Heart size={16} className="text-rose-400 fill-rose-300" />
                <div className="w-11 h-11 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-black text-base border-2 border-white shadow">
                  {partnerInitial}
                </div>
              </div>
              <p className="text-center text-sm font-bold text-gray-700 mb-4">
                Ty i {partnerName || 'Partner'}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">Wspólne zadania</span>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-gray-900">{sharedTasks.length}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Wspólne cele</span>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-gray-900">{sharedGoals.length}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </div>

              {partnerActivity && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Ostatnia aktywność</p>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">{partnerActivity.description || `${partnerName} był(a) aktywny/a`}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {format(new Date(partnerActivity.timestamp?.seconds ? partnerActivity.timestamp.seconds * 1000 : partnerActivity.timestamp), 'H:mm', { locale: pl })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <Users size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Połącz się z partnerem</p>
              <Link to="/settings" className="inline-block mt-2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">Sparuj</Link>
            </div>
          )}

          {/* CHAT */}
          {partnerUid && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-black text-gray-900">Czat</p>
                <Link to="/chat" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">Zobacz więcej</Link>
              </div>

              <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Brak wiadomości</p>
                ) : chatMessages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div key={msg.id} className="flex items-start gap-2">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                        isMe ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                      )}>
                        {isMe ? userInitial : partnerInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {isMe ? (user?.displayName || 'Ty') : (partnerName || 'Partner')}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {format(new Date(msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Napisz wiadomość..."
                  className="flex-1 text-xs px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                >
                  <Send size={15} />
                </motion.button>
              </div>
            </div>
          )}

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

      {/* ── AI ASSISTANT (bottom) ── */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs text-indigo-200 font-medium mb-1">Twój osobisty asystent AI</p>
          <h3 className="text-xl font-black text-white mb-4">Jak mogę Ci pomóc dzisiaj?</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'plan',     label: 'Zaplanuj mój dzień' },
              { key: 'week',     label: 'Podsumuj tydzień'   },
              { key: 'motivate', label: 'Motywuj mnie'       },
              { key: 'habits',   label: 'Analizuj nawyki'    },
            ].map(({ key, label }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAiAction(key)}
                disabled={aiLoading !== null}
                className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {aiLoading === key && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {label}
              </motion.button>
            ))}
          </div>

          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-white/15 rounded-xl p-3"
            >
              <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
            </motion.div>
          )}
        </div>

        {/* Robot illustration placeholder */}
        <div className="shrink-0 hidden md:flex flex-col items-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
            <Brain size={40} className="text-white" />
          </div>
          {openTasks.filter(t => t.priority === 'high').length > 0 && (
            <div className="mt-3 bg-white/10 rounded-xl p-2 max-w-[160px]">
              <p className="text-xs text-indigo-100 text-center leading-snug">
                Masz {openTasks.filter(t => t.priority === 'high').length} zadania priorytetowe dziś. Skup się na jednym kroku naraz! 🎯
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
