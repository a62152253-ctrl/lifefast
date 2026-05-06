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
  CalendarRange,
  CheckCircle2,
  Flame,
  Utensils,
  Wallet,
  ShoppingBag,
  MessageCircle,
  Zap,
  NotebookPen,
  Circle,
  ArrowRight,
  Heart,
  Sparkles,
  LayoutDashboard,
  ListTodo,
  Star,
  Trophy,
  ChevronRight,
  Clock,
  Target,
  Users,
  Brain,
  TrendingUp,
  Activity,
  Calendar,
} from 'lucide-react';

import { auth, db } from '../lib/firebase';
import { calculateStats } from '../lib/gamification';
import { cn } from '../lib/utils';
import { ProgressCircle } from './CommonUI';
import { getDashboardInsight } from '../services/geminiService';
import { MessageSquare, Send, X, Leaf } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase mb-5 px-1">
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  to,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="bg-white rounded-[1.75rem] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-3 cursor-pointer hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all"
      >
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', color)}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-black text-[#1d1d1f] tracking-tight">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 font-bold mt-0.5">{sub}</p>}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</p>
      </motion.div>
    </Link>
  );
}

function TaskRow({ task, onToggle }: { task: any; onToggle: () => void; key?: React.Key }) {
  const priorityColor: Record<string, string> = {
    high: 'bg-rose-500',
    medium: 'bg-amber-400',
    low: 'bg-emerald-400',
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 group"
    >
      <button
        onClick={onToggle}
        className="shrink-0 w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-indigo-400 flex items-center justify-center transition-colors"
      >
        {task.completed && <CheckCircle2 size={16} className="text-indigo-500" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold text-[#1d1d1f] truncate', task.completed && 'line-through text-gray-400')}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {format(new Date(task.dueDate), 'd MMM', { locale: pl })}
          </p>
        )}
      </div>
      {task.priority && (
        <div className={cn('w-2 h-2 rounded-full shrink-0', priorityColor[task.priority] ?? 'bg-gray-300')} />
      )}
    </motion.div>
  );
}

function HabitRow({ habit, done }: { habit: any; done: boolean; key?: React.Key }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div
        className={cn(
          'w-8 h-8 rounded-2xl flex items-center justify-center text-base shrink-0 transition-all',
          done ? 'bg-indigo-100' : 'bg-gray-50'
        )}
      >
        {habit.emoji || '⚡'}
      </div>
      <p className={cn('flex-1 text-sm font-bold truncate', done ? 'text-indigo-600' : 'text-[#1d1d1f]')}>
        {habit.name}
      </p>
      {done ? (
        <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
      ) : (
        <Circle size={16} className="text-gray-200 shrink-0" />
      )}
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  to,
  color,
}: {
  icon: any;
  label: string;
  to: string;
  color: string;
}) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center gap-2 cursor-pointer"
      >
        <div className={cn('w-14 h-14 rounded-[1.25rem] flex items-center justify-center shadow-sm', color)}>
          <Icon size={22} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
          {label}
        </span>
      </motion.div>
    </Link>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const now = useClock();

  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [tasks, setTasks]   = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [notesCount, setNotesCount]   = useState(0);
  const [goalsCount, setGoalsCount]   = useState(0);
  const [stats, setStats]   = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [sharedGoals, setSharedGoals] = useState<any[]>([]);
  const [partnerActivity, setPartnerActivity] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [weekStats, setWeekStats] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // send message function
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !partnerUid) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        content: newMessage.trim(),
        senderId: user.uid,
        participants: [user.uid, partnerUid],
        timestamp: new Date(),
        read: false
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // partner uid & name
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

  // tasks + habits
  useEffect(() => {
    if (!user) return;
    const uids = partnerUid ? [user.uid, partnerUid] : [user.uid];

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('userId', 'in', uids)),
      (s) => setTasks(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubHabits = onSnapshot(
      query(collection(db, 'habits'), where('userId', 'in', uids)),
      (s) => setHabits(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubTasks(); unsubHabits(); };
  }, [user, partnerUid]);

  // budget (sum expenses current month)
  useEffect(() => {
    if (!user) return;
    const monthStart = format(new Date(), 'yyyy-MM-01');
    const unsubBudget = onSnapshot(
      query(collection(db, 'expenses'), where('userId', '==', user.uid), where('date', '>=', monthStart)),
      (s) => {
        const total = s.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
        setBudgetTotal(total);
      }
    );
    return unsubBudget;
  }, [user]);

  // notes count
  useEffect(() => {
    if (!user) return;
    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('userId', '==', user.uid), limit(50)),
      (s) => setNotesCount(s.size)
    );
    return unsubNotes;
  }, [user]);

  // goals count (active)
  useEffect(() => {
    if (!user) return;
    const unsubGoals = onSnapshot(
      query(collection(db, 'goals'), where('userId', '==', user.uid), where('completed', '==', false)),
      (s) => setGoalsCount(s.size)
    );
    return unsubGoals;
  }, [user]);

  // stats
  useEffect(() => {
    setStats(calculateStats(tasks, habits));
  }, [tasks, habits]);

  // calendar events
  useEffect(() => {
    if (!user) return;
    const uids = partnerUid ? [user.uid, partnerUid] : [user.uid];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start from Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const unsubCalendar = onSnapshot(
      query(
        collection(db, 'calendarEvents'), 
        where('userId', 'in', uids),
        where('date', '>=', format(startOfWeek, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfWeek, 'yyyy-MM-dd')),
        orderBy('date')
      ),
      (s) => setCalendarEvents(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsubCalendar;
  }, [user, partnerUid]);

  // shared goals and partner activity
  useEffect(() => {
    if (!user || !partnerUid) return;
    
    const unsubGoals = onSnapshot(
      query(collection(db, 'sharedGoals'), where('participants', 'array-contains-any', [user.uid, partnerUid])),
      (s) => setSharedGoals(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    
    // Get partner's recent activity
    const unsubActivity = onSnapshot(
      query(
        collection(db, 'activity'), 
        where('userId', '==', partnerUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      ),
      (s) => {
        if (s.docs.length > 0) {
          setPartnerActivity({ id: s.docs[0].id, ...s.docs[0].data() });
        }
      }
    );
    
    return () => { unsubGoals(); unsubActivity(); };
  }, [user, partnerUid]);

  // chat messages
  useEffect(() => {
    if (!user || !partnerUid) return;
    const unsubChat = onSnapshot(
      query(
        collection(db, 'messages'), 
        where('participants', 'array-contains-any', [user.uid, partnerUid]),
        orderBy('timestamp', 'desc'),
        limit(5)
      ),
      (s) => setChatMessages(s.docs.map((d) => ({ id: d.id, ...d.data() })).reverse())
    );
    return unsubChat;
  }, [user, partnerUid]);

  // week statistics for day summary
  useEffect(() => {
    if (!user) return;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const unsubWeek = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('createdAt', '>=', weekStart)
      ),
      (s) => {
        const weekTasks = s.docs.map(d => ({ id: d.id, ...d.data() }));
        const completedThisWeek = weekTasks.filter(t => t.completed).length;
        const totalThisWeek = weekTasks.length;
        const progressPercentage = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;
        
        setWeekStats({
          completedThisWeek,
          totalThisWeek,
          progressPercentage
        });
      }
    );
    return unsubWeek;
  }, [user]);
  const openTasks   = tasks.filter((t) => !t.completed);
  const doneToday   = tasks.filter((t) => t.completed).length;
  const todayTasks  = openTasks.slice(0, 5);
  
  // focus task of the day (high priority or first task)
  const focusTask = openTasks.find(t => t.priority === 'high') || openTasks[0];

  const habitsToday     = habits.filter((h) => h.completions?.[today]);
  const habitProgress   = habits.length
    ? Math.round((habitsToday.length / habits.length) * 100)
    : 0;

  const xpProgress = stats ? Math.round((stats.xp / stats.xpToNextLevel) * 100) : 0;
  const firstName  = user?.displayName?.split(' ')[0] || 'Użytkowniku';

  const formattedDate = format(now, "EEEE, d MMMM", { locale: pl });

  // AI Functions
  const handleAiAction = async (action: string) => {
    setAiLoading(action);
    setAiResponse('');
    
    try {
      let response = '';
      
      switch (action) {
        case 'plan':
          response = await getDashboardInsight(tasks, habits, firstName);
          break;
        case 'week':
          const completedThisWeek = tasks.filter(t => t.completed && 
            new Date(t.completedAt || Date.now()) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length;
          response = `W tym tygodniu ukończyłeś ${completedThisWeek} z ${tasks.length} zadań. ${completedThisWeek > tasks.length * 0.7 ? 'Świetny postęp! Kontynuuj tak dalej.' : 'Skup się na priorytetach na pozostałe dni.'}`;
          break;
        case 'motivate':
          const motivations = [
            "Każdy mały krok przybliża Cię do wielkiego celu! 💪",
            "Masz w sobie siłę, by osiągnąć wszystko, co zaplanowałeś! 🚀",
            "Dzisiaj jest kolejną szansą na bycie lepszą wersją siebie! ⭐",
            "Twoje determinacja i wysiłek przyniosą niesamowite rezultaty! 🔥",
            "Pamiętaj, że nawet największe podróże zaczynają od jednego kroku! 🌟"
          ];
          response = motivations[Math.floor(Math.random() * motivations.length)];
          break;
        case 'habits':
          const habitInsights = [];
          if (habitsToday.length === habits.length && habits.length > 0) {
            habitInsights.push("Perfekcyjnie! Dziś wykonałeś wszystkie swoje nawyki! 🎯");
          } else if (habitsToday.length / habits.length > 0.5) {
            habitInsights.push("Dobrze idzie! Masz już ponad połowę nawyków zrobionych. 💪");
          } else {
            habitInsights.push("Skup się na małych, stałych krokach. Jeden nawyk naraz! 🌱");
          }
          response = habitInsights.join(' ');
          break;
        default:
          response = "Wybierz jedną z dostępnych opcji, aby pomóc Ci今天就!";
      }
      
      setAiResponse(response);
    } catch (error) {
      setAiResponse("Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-28"
    >
      {/* Background gradients */}
      <div className="fixed inset-0 -z-20 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,#eef2ff_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,#fdf2f8_0%,transparent_50%)]" />

      {/* ── 2 Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ── Header ── */}
          <header className="space-y-4">
            <p className="text-[10px] font-black tracking-[0.4em] text-indigo-500 uppercase mb-2">
              {formattedDate}
            </p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1] text-[#1d1d1f]">
              {getGreeting()},
              <br />
              <span className="text-gray-300">{firstName}</span>
            </h1>
            <p className="text-gray-400 font-medium text-base">
              {openTasks.length === 0
                ? 'Wszystko zrobione — nieźle!'
                : `Masz ${openTasks.length} rzecz${openTasks.length === 1 ? '' : openTasks.length < 5 ? 'i' : 'i'} do ogarnięcia dziś.`}
            </p>
            <p className="text-gray-300 text-lg mt-2">Masz świetny plan na dzisiaj. Dasz radę!</p>
          </header>

          {/* ── Stats grid ── */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Zadania"
                value={openTasks.length}
                sub={`${doneToday} do zrobienia`}
                icon={CheckCircle2}
                color="bg-indigo-50 text-indigo-600"
                to="/tasks"
              />
              <StatCard
                label="Nawyki"
                value={habits.length}
                sub={`${habitsToday.length} na dziś`}
                icon={Flame}
                color="bg-orange-50 text-orange-500"
                to="/habits"
              />
              <StatCard
                label="Finanse"
                value={`${budgetTotal.toFixed(0)} zł`}
                sub="wydatki mies."
                icon={Wallet}
                color="bg-emerald-50 text-emerald-600"
                to="/budget"
              />
              <StatCard
                label="Notatki"
                value={notesCount}
                sub="notatek"
                icon={NotebookPen}
                color="bg-violet-50 text-violet-600"
                to="/notes"
              />
              <StatCard
                label="Cele"
                value={goalsCount}
                sub="aktywne cele"
                icon={Target}
                color="bg-rose-50 text-rose-500"
                to="/goals"
              />
            </div>
          </section>

          {/* ── XP Section ── */}
          <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase mb-2">XP</p>
                <h3 className="text-2xl font-black text-[#1d1d1f]">{stats?.level ?? 1} Poziom</h3>
                <p className="text-sm text-gray-400">{stats?.xp ?? 0} / {stats?.xpToNextLevel ?? 3000} do kolejnego poziomu</p>
              </div>
              <ProgressCircle progress={xpProgress} size={80} strokeWidth={6} color="#6366f1">
                <div className="text-center">
                  <p className="text-lg font-black text-indigo-600">{stats?.level ?? 1}</p>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">LVL</p>
                </div>
              </ProgressCircle>
            </div>
          </section>

          {/* ── Today's tasks ── */}
          <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Dzisiejsze zadania</p>
              <Link to="/tasks" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Wszystkie</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={22} className="text-indigo-400" />
                </div>
                <p className="text-sm text-gray-400 font-bold">Wszystko zrobione!</p>
                <Link to="/tasks">
                  <p className="text-xs text-indigo-500 mt-1 font-bold hover:underline">Dodaj nowe zadanie →</p>
                </Link>
              </div>
            ) : (
              <div>
                {todayTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={() => {}} />
                ))}
                {openTasks.length > 5 && (
                  <Link to="/tasks">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-4 hover:underline">
                      +{openTasks.length - 5} więcej →
                    </p>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* ── Habits ── */}
          <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Nawyki na dziś</p>
              <Link to="/habits" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Wszystkie</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            {habits.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Flame size={22} className="text-orange-400" />
                </div>
                <p className="text-sm text-gray-400 font-bold">Brak nawyków</p>
                <Link to="/habits">
                  <p className="text-xs text-indigo-500 mt-1 font-bold hover:underline">Dodaj pierwszy nawyk →</p>
                </Link>
              </div>
            ) : (
              <div>
                {habits.slice(0, 5).map((habit) => (
                  <HabitRow key={habit.id} habit={habit} done={!!habit.completions?.[today]} />
                ))}

                {/* Progress bar */}
                <div className="mt-5 pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Postęp</span>
                    <span className="text-[10px] font-black text-indigo-600">{habitProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${habitProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── AI Assistant ── */}
          <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-[2rem] p-7 border border-purple-100 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.35em] text-purple-600 uppercase">AI Assistant</p>
                <h3 className="text-xl font-black text-gray-800">Jak mogę Ci pomóc dzisiaj?</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAiAction('plan')}
                disabled={aiLoading !== null}
                className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                  {aiLoading === 'plan' ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CalendarRange size={18} className="text-indigo-600" />
                  )}
                </div>
                <p className="font-bold text-sm text-gray-800">Zaplanuj mój dzień</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAiAction('week')}
                disabled={aiLoading !== null}
                className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  {aiLoading === 'week' ? (
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrendingUp size={18} className="text-purple-600" />
                  )}
                </div>
                <p className="font-bold text-sm text-gray-800">Podsumuj tydzień</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAiAction('motivate')}
                disabled={aiLoading !== null}
                className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                  {aiLoading === 'motivate' ? (
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={18} className="text-amber-600" />
                  )}
                </div>
                <p className="font-bold text-sm text-gray-800">Motywuj mnie</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAiAction('habits')}
                disabled={aiLoading !== null}
                className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-pink-200 transition-colors">
                  {aiLoading === 'habits' ? (
                    <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Target size={18} className="text-pink-600" />
                  )}
                </div>
                <p className="font-bold text-sm text-gray-800">Analizuj nawyki</p>
              </motion.button>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {aiResponse}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          {/* ── Day Summary ── */}
          <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Podsumowanie dnia</p>
              <Activity size={20} className="text-indigo-600" />
            </div>
            
            <div className="flex items-center gap-6">
              <ProgressCircle progress={weekStats?.progressPercentage || 0} size={80} strokeWidth={8} color="#6366f1">
                <div className="text-center">
                  <p className="text-2xl font-black text-indigo-600">{weekStats?.progressPercentage || 0}%</p>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">Postęp</p>
                </div>
              </ProgressCircle>
              
              <div className="flex-1">
                <p className="text-lg font-bold text-[#1d1d1f] mb-2">
                  {weekStats?.progressPercentage > 70 ? 'Świetna robota!' : 
                   weekStats?.progressPercentage > 40 ? 'Dobrze idzie!' : 
                   'Do przodu!'}
                </p>
                <p className="text-sm text-gray-400">
                  Wykonałeś {weekStats?.completedThisWeek || 0} z {weekStats?.totalThisWeek || 0} zadań w tym tygodniu.
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                    {doneToday} zadań dziś
                  </span>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                    {habitsToday.length} nawyków
                  </span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN (1/3 width) */}
        <div className="space-y-8">
          
          {/* ── XP Ring (Compact) ── */}
          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="text-center">
              <ProgressCircle progress={xpProgress} size={100} strokeWidth={8} color="#6366f1">
                <div className="text-center">
                  <p className="text-2xl font-black text-indigo-600">{stats?.level ?? 1}</p>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">LVL</p>
                </div>
              </ProgressCircle>
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">XP</p>
                <p className="text-2xl font-black text-[#1d1d1f] tracking-tight">{stats?.xp ?? 0}</p>
                <p className="text-[10px] text-gray-400">/ {stats?.xpToNextLevel ?? 3000} do kolejnego poziomu</p>
              </div>
              {stats?.habitStreak > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2">
                    <Flame size={20} className="text-orange-500" />
                    <p className="text-xl font-black text-orange-500 tracking-tight">{stats.habitStreak}</p>
                  </div>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">Streak</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Shared Dashboard ── */}
          {partnerUid && (
            <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-4">
                <Users size={20} className="text-indigo-600" />
                <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Wspólny dashboard</p>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Ty i {partnerName || 'Partner'}</h3>
              <p className="text-xs text-gray-500 mb-4">
                {partnerActivity ? 
                  `Ostatnia aktywność: ${format(new Date(partnerActivity.timestamp), 'd MMM HH:mm', { locale: pl })}` : 
                  'Brak ostatniej aktywności'
                }
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <CheckCircle2 size={16} className="text-indigo-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Wspólne zadania</p>
                    <p className="text-xs text-indigo-600">{tasks.filter(t => t.shared).length} aktywne</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <Trophy size={16} className="text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Wspólne cele</p>
                    <p className="text-xs text-amber-600">{sharedGoals.length} w toku</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Chat ── */}
          {partnerUid && (
            <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare size={20} className="text-indigo-600" />
                  <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Czat</p>
                </div>
                <Link to="/chat" className="text-indigo-500 hover:text-indigo-700">
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className="space-y-4 mb-4">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.senderId === user.uid ? 'bg-indigo-100' : 'bg-pink-100'
                      }`}>
                        <span className={`text-xs font-bold ${
                          msg.senderId === user.uid ? 'text-indigo-600' : 'text-pink-600'
                        }`}>
                          {msg.senderId === user.uid ? 
                            (user.displayName?.[0] || 'T') : 
                            (partnerName?.[0] || 'P')
                          }
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-800">
                            {msg.senderId === user.uid ? 
                              (user.displayName || 'Ty') : 
                              (partnerName || 'Partner')
                            }
                          </p>
                          <span className="text-xs text-gray-400">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{msg.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">Brak wiadomości</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Napisz wiadomość..."
                  className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </section>
          )}

          {/* ── Calendar Week View ── */}
          <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-indigo-600" />
                <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Kalendarz</p>
              </div>
              <Link to="/calendar" className="text-indigo-500 hover:text-indigo-700">
                <ChevronRight size={16} />
              </Link>
            </div>
            
            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day, idx) => {
                const currentDate = new Date();
                const monday = new Date();
                monday.setDate(monday.getDate() - monday.getDay() + 1);
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + idx);
                const isToday = format(dayDate, 'yyyy-MM-dd') === today;
                const hasEvents = calendarEvents.some(event => event.date === format(dayDate, 'yyyy-MM-dd'));
                
                return (
                  <div key={idx} className="text-center">
                    <p className="text-xs font-bold text-gray-400 mb-1">{day}</p>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 text-xs font-bold",
                      isToday ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600"
                    )}>
                      {dayDate.getDate()}
                    </div>
                    {hasEvents && (
                      <div className="w-1 h-1 bg-indigo-400 rounded-full mx-auto" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Today's event */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-400 mb-2">Dziś</p>
              {calendarEvents.filter(event => event.date === today).length > 0 ? (
                calendarEvents.filter(event => event.date === today).slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg mb-2">
                    <Clock size={12} className="text-indigo-600" />
                    <p className="text-xs font-medium text-indigo-600 flex-1 truncate">{event.title}</p>
                    {event.time && <span className="text-xs text-indigo-600">{event.time}</span>}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Clock size={12} className="text-gray-400" />
                  <p className="text-xs text-gray-400">Brak wydarzeń dziś</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Quick Add ── */}
          <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={20} className="text-indigo-600" />
              <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Szybkie dodawanie</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-50 text-indigo-600 p-4 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex flex-col items-center gap-2"
              >
                <Clock size={24} />
                Zadanie
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-orange-50 text-orange-600 p-4 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors flex flex-col items-center gap-2"
              >
                <Leaf size={24} />
                Nawyk
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-violet-50 text-violet-600 p-4 rounded-xl font-bold text-sm hover:bg-violet-100 transition-colors flex flex-col items-center gap-2"
              >
                <NotebookPen size={24} />
                Notatka
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-emerald-50 text-emerald-600 p-4 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors flex flex-col items-center gap-2"
              >
                <Wallet size={24} />
                Wydatki
              </motion.button>
            </div>
          </section>

        </div>
      </div>

      {/* ── FOCUS MODE (Hero Card) ── */}
      {focusTask ? (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-8 md:p-10 shadow-2xl"
        >
          {/* Background glow effects */}
          <div className="absolute -z-0 blur-3xl opacity-20 rounded-full bg-white w-96 h-96 -top-20 -right-20 pointer-events-none animate-pulse" />
          <div className="absolute -z-0 blur-3xl opacity-10 rounded-full bg-yellow-300 w-64 h-64 -bottom-10 -left-10 pointer-events-none animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex-1">
                <p className="text-[10px] font-black tracking-[0.4em] text-yellow-300 uppercase mb-3">
                  🔥 NAJWAŻNIEJSZE DZISIAJ
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">
                  {focusTask.title}
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  {focusTask.dueDate && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock size={16} />
                      <span className="text-sm font-bold">
                        {format(new Date(focusTask.dueDate), 'HH:mm', { locale: pl })}
                      </span>
                    </div>
                  )}
                  {focusTask.priority === 'high' && (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full">
                      HIGH PRIORITY
                    </span>
                  )}
                </div>
                <p className="text-white/70 text-sm max-w-md">
                  To jest Twoje focus zadanie na dziś. Skup się na nim i zrób to dobrze!
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-4xl font-black text-yellow-300">{doneToday}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest mt-1">Zrobione</p>
                </div>
                <Link to="/tasks" className="block">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-indigo-600 font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-2xl transition-all flex items-center gap-3"
                  >
                    <Zap size={20} className="fill-current" />
                    START FOCUS
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      ) : (
        /* Empty state for focus mode */
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 p-8 md:p-10 border-2 border-dashed border-gray-300"
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Target size={40} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Brak zadań na dziś</h2>
            <p className="text-gray-500 mb-6">Dodaj pierwsze zadanie i zacznij działać!</p>
            <Link to="/tasks">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-600 text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-3 mx-auto"
              >
                <ListTodo size={20} />
                Dodaj zadanie
              </motion.button>
            </Link>
          </div>
        </motion.section>
      )}

      {/* ── Shared Dashboard (Hero Section) ── */}
      {partnerUid && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 border-2 border-purple-200 shadow-2xl"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30 -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-200 to-purple-200 rounded-full blur-2xl opacity-30 translate-y-10 -translate-x-10" />
          
          <div className="relative p-10 md:p-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-black tracking-[0.4em] text-purple-600 uppercase mb-2">
                    💝 WSPÓLNY DASHBOARD
                  </p>
                  <h2 className="text-3xl font-black text-gray-800">
                    Ty i {partnerName || 'Partner'}
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Ostatnia aktywność</p>
                <p className="text-lg font-bold text-purple-600">
                  {format(new Date(), 'd MMM HH:mm', { locale: pl })}
                </p>
              </div>
            </div>
            
            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Shared Tasks */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Wspólne zadania</h3>
                </div>
                <div className="space-y-3">
                  {tasks.filter(t => t.shared).slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      {task.completed ? 
                        <CheckCircle2 size={16} className="text-green-500" /> : 
                        <Circle size={16} className="text-purple-400" />
                      }
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.shared).length === 0 && (
                    <p className="text-sm text-gray-400 italic">Brak wspólnych zadań</p>
                  )}
                </div>
                {tasks.filter(t => t.shared).length > 3 && (
                  <Link to="/tasks" className="text-purple-600 text-sm font-bold hover:underline mt-3 block">
                    Zobacz wszystkie →
                  </Link>
                )}
              </div>
              
              {/* Shared Goals */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Trophy size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Wspólne cele</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <Target size={16} className="text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Wspólne wyzwania</p>
                      <p className="text-xs text-amber-600">{sharedGoals.filter(g => g.type === 'challenge').length} aktywne</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
                    <Heart size={16} className="text-pink-600" />
                    <div>
                      <p className="text-sm font-medium">Cele na miesiąc</p>
                      <p className="text-xs text-pink-600">{sharedGoals.filter(g => g.type === 'monthly').length} w toku</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Szybkie akcje</h3>
                </div>
                <div className="space-y-3">
                  <Link to="/chat" className="block">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-sm"
                    >
                      💬 Napisz wiadomość
                    </motion.button>
                  </Link>
                  <Link to="/plan" className="block">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl text-sm"
                    >
                      📅 Zaplanuj razem
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Stats grid ── */}
      <section>
        <SectionLabel>Podsumowanie</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Zadania"
            value={openTasks.length}
            sub={`${doneToday} ukończ. dziś`}
            icon={CheckCircle2}
            color="bg-indigo-50 text-indigo-600"
            to="/tasks"
          />
          <StatCard
            label="Nawyki"
            value={`${habitProgress}%`}
            sub={`${habitsToday.length} / ${habits.length} dziś`}
            icon={Flame}
            color="bg-orange-50 text-orange-500"
            to="/habits"
          />
          <StatCard
            label="Finanse"
            value={`${budgetTotal.toFixed(0)} zł`}
            sub="wydatki mies."
            icon={Wallet}
            color="bg-emerald-50 text-emerald-600"
            to="/budget"
          />
          <StatCard
            label="Notatki"
            value={notesCount}
            sub="zapisanych"
            icon={NotebookPen}
            color="bg-violet-50 text-violet-600"
            to="/notes"
          />
        </div>
      </section>

      {/* ── AI Assistant (Action Hub) ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-[2.5rem] p-8 border border-purple-100 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.35em] text-purple-600 uppercase">AI Assistant</p>
              <h3 className="text-xl font-black text-gray-800">Jak mogę Ci pomóc dzisiaj?</h3>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
              <Calendar size={20} className="text-indigo-600" />
            </div>
            <p className="font-bold text-gray-800 mb-1">Zaplanuj mój dzień</p>
            <p className="text-xs text-gray-500">AI zoptymalizuje Twój plan</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <p className="font-bold text-gray-800 mb-1">Podsumuj tydzień</p>
            <p className="text-xs text-gray-500">Analiza postępów</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <Sparkles size={20} className="text-amber-600" />
            </div>
            <p className="font-bold text-gray-800 mb-1">Motywuj mnie</p>
            <p className="text-xs text-gray-500">Dawkuj energię!</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
              <Target size={20} className="text-pink-600" />
            </div>
            <p className="font-bold text-gray-800 mb-1">Analizuj nawyki</p>
            <p className="text-xs text-gray-500">Sprawdź swoje wzorce</p>
          </motion.button>
        </div>
      </motion.section>

      {/* ── Today's tasks + Habits ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Tasks */}
        <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Dzisiejsze zadania</p>
            <Link to="/tasks" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest">Wszystkie</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={22} className="text-indigo-400" />
              </div>
              <p className="text-sm text-gray-400 font-bold">Wszystko zrobione!</p>
              <Link to="/tasks">
                <p className="text-xs text-indigo-500 mt-1 font-bold hover:underline">Dodaj nowe zadanie →</p>
              </Link>
            </div>
          ) : (
            <div>
              {todayTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={() => {}} />
              ))}
              {openTasks.length > 5 && (
                <Link to="/tasks">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-4 hover:underline">
                    +{openTasks.length - 5} więcej →
                  </p>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Habits */}
        <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Nawyki dziś</p>
            <Link to="/habits" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest">Wszystkie</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {habits.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Flame size={22} className="text-orange-400" />
              </div>
              <p className="text-sm text-gray-400 font-bold">Brak nawyków</p>
              <Link to="/habits">
                <p className="text-xs text-indigo-500 mt-1 font-bold hover:underline">Dodaj pierwszy nawyk →</p>
              </Link>
            </div>
          ) : (
            <div>
              {habits.slice(0, 5).map((habit) => (
                <HabitRow key={habit.id} habit={habit} done={!!habit.completions?.[today]} />
              ))}

              {/* Progress bar */}
              <div className="mt-5 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Postęp</span>
                  <span className="text-[10px] font-black text-indigo-600">{habitProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${habitProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Hero focus card ── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#0f0f10] text-white p-8 md:p-10">
        {/* glow */}
        <div className="absolute -z-0 blur-3xl opacity-30 rounded-full bg-indigo-500 w-80 h-80 -top-20 -right-20 pointer-events-none" />
        <div className="absolute -z-0 blur-3xl opacity-20 rounded-full bg-violet-500 w-60 h-60 -bottom-10 -left-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="text-[10px] font-black tracking-[0.4em] text-indigo-400 uppercase mb-2">Focus Mode</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
              Czas na głęboki focus.
            </h2>
            <p className="text-white/50 mt-2 text-sm max-w-sm">
              Uruchom timer Pomodoro i pracuj bez rozpraszaczy.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-black text-white">{doneToday}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Zrobione</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-black text-white">{stats?.level ?? 1}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Level</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-black text-indigo-400">{stats?.xp ?? 0}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">XP</p>
            </div>
          </div>
        </div>

        <Link to="/plan" className="mt-6 md:mt-0 md:absolute md:bottom-10 md:right-10 block">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest px-7 py-4 rounded-2xl shadow-2xl shadow-indigo-900/40 transition-colors flex items-center gap-2"
          >
            <Zap size={16} className="fill-current" />
            Start Focus
          </motion.button>
        </Link>
      </section>

      {/* ── Quick nav ── */}
      <section>
        <SectionLabel>Szybki dostęp</SectionLabel>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          <QuickLink icon={CalendarRange} label="Kalendarz" to="/calendar" color="bg-blue-50 text-blue-600" />
          <QuickLink icon={Zap}          label="Plan"      to="/plan"     color="bg-indigo-50 text-indigo-600" />
          <QuickLink icon={Utensils}     label="Posiłki"   to="/meals"    color="bg-amber-50 text-amber-600" />
          <QuickLink icon={Heart}        label="Nastrój"   to="/mood"     color="bg-rose-50 text-rose-600" />
          <QuickLink icon={ListTodo}     label="Zadania"   to="/tasks"    color="bg-violet-50 text-violet-600" />
          <QuickLink icon={ShoppingBag}  label="Zakupy"    to="/shopping" color="bg-emerald-50 text-emerald-600" />
          <QuickLink icon={MessageCircle} label="Chat"     to="/chat"     color="bg-cyan-50 text-cyan-600" />
          <QuickLink icon={Sparkles}     label="Nawyki"    to="/habits"   color="bg-orange-50 text-orange-500" />
        </div>
      </section>

      {/* ── Quick Add Section ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase">Szybkie dodawanie</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Zap size={14} className="text-indigo-500" />
            <span>Błyskawiczne akcje</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="relative z-10">
              <ListTodo size={24} className="mb-3" />
              <p className="font-black text-lg mb-1">Zadanie</p>
              <p className="text-xs opacity-80">Dodaj nowe</p>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="relative z-10">
              <Flame size={24} className="mb-3" />
              <p className="font-black text-lg mb-1">Nawyk</p>
              <p className="text-xs opacity-80">Nowa rutyna</p>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-violet-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="relative z-10">
              <NotebookPen size={24} className="mb-3" />
              <p className="font-black text-lg mb-1">Notatka</p>
              <p className="text-xs opacity-80">Zapisz myśl</p>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="relative z-10">
              <Wallet size={24} className="mb-3" />
              <p className="font-black text-lg mb-1">Wydatki</p>
              <p className="text-xs opacity-80">Dodaj koszt</p>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
          </motion.button>
        </div>
      </motion.section>

      {/* ── Gamification badges ── */}
      {stats?.badges?.length > 0 && (
        <section className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <SectionLabel>Osiągnięcia</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((badge: string) => (
              <div
                key={badge}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-2xl"
              >
                <Trophy size={13} />
                <span className="text-xs font-black">{badge}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
