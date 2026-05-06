import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Card, Button, NAV_ITEMS, PageHeader, Badge, ProgressCircle, BentoGrid, BentoCard } from './CommonUI';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit,
  doc
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AIInsights from './AIInsights';
import MoodTracker from './MoodTracker';
import FocusTimer from './FocusTimer';
import { calculateStats, UserStats } from '../lib/gamification';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  CheckCircle2, 
  TrendingUp, 
  CloudSun,
  ShoppingBag,
  ArrowRight,
  Zap,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Target,
  Utensils,
  Play,
  Wallet,
  Heart
} from 'lucide-react';

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) setPartnerUid(snap.data().partnerUid || null);
      else setPartnerUid(null);
    });
    return unsubProfile;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uids = [user.uid];
    if (partnerUid) uids.push(partnerUid);

    const qTasks = query(collection(db, 'tasks'), where('userId', 'in', uids), where('completed', '==', false), limit(3));
    const unsubTasks = onSnapshot(qTasks, (snap) => setRecentTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qHabits = query(collection(db, 'habits'), where('userId', 'in', uids), limit(5));
    const unsubHabits = onSnapshot(qHabits, (snap) => setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Stats sync
    const qAllTasks = query(collection(db, 'tasks'), where('userId', 'in', uids));
    const unsubStats = onSnapshot(qAllTasks, (taskSnap) => {
       const tasksData = taskSnap.docs.map(d => d.data());
       setStats(calculateStats(tasksData, habits.map(h => h)));
    });

    return () => { unsubTasks(); unsubHabits(); unsubStats(); };
  }, [user, partnerUid]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Cześć';
    return 'Dobry wieczór';
  };

  const habitProgress = habits.length > 0 
    ? Math.round((habits.filter(h => h.completions?.[today]).length / habits.length) * 100) 
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-16 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 pt-6 animate-entrance">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] leading-none">System LiveSync Active</span>
          </div>
          <h2 className="text-6xl md:text-8xl font-display font-black text-[#1d1d1f] tracking-tight leading-[0.85]">
            {greeting()}, <br />
            <span className="text-gray-300">{user?.displayName?.split(' ')[0] || 'Użytkowniku'}</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex-shrink-0">
           <div className="text-right">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Local Weather</p>
              <p className="text-2xl font-black text-[#1d1d1f]">24°C</p>
           </div>
           <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
             <CloudSun size={32} />
           </div>
        </div>
      </header>

      <BentoGrid className="gap-8">
        {/* Main AI Insights Card */}
        <BentoCard span="lg:col-span-2 lg:row-span-2" className="bg-[#1D1D1F] text-white !p-12 border-none shadow-2xl overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-[1.7] group-hover:rotate-0 transition-all duration-1000">
              <Sparkles size={200} />
           </div>
           
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 mb-12">
                   <Zap size={16} className="text-amber-400 fill-amber-400" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Flow State Engine 4.0</span>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-5xl font-black tracking-tighter leading-tight">
                    Twój poziom skupienia <br />
                    <span className="text-indigo-400">osiąga maksimum.</span>
                  </h3>
                  <p className="text-xl text-white/40 font-medium leading-relaxed max-w-md">
                    Ukończyłeś 80% swoich porannych zadań. AI sugeruje teraz krótki blok pracy głębokiej nad najważniejszym projektem.
                  </p>
                </div>
              </div>

              <div className="pt-12 border-t border-white/10 flex items-center justify-between">
                 <div className="flex gap-12">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">XP Level</p>
                      <p className="text-4xl font-black">{stats?.level || 1}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Total XP</p>
                      <p className="text-4xl font-black">{stats?.xp || 0}</p>
                   </div>
                 </div>
                 <Button variant="white" className="!rounded-2xl !p-5 shadow-none">
                    <ArrowUpRight size={24} />
                 </Button>
              </div>
           </div>
        </BentoCard>

        {/* Focus Session Mini */}
        <BentoCard className="bg-indigo-600 border-none text-white !p-10 flex flex-col justify-between group">
           <div className="flex justify-between items-start">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Deep Work</p>
             <Zap size={24} className="text-amber-400 fill-amber-400 animate-pulse" />
           </div>
           <div>
              <h4 className="text-5xl font-black tracking-tighter mb-4">Focus</h4>
              <Link to="/plan">
                <Button variant="white" className="w-full !rounded-2xl !py-3 shadow-none text-[10px]">
                  Zacznij sesję
                </Button>
              </Link>
           </div>
        </BentoCard>

        {/* Habits Progress */}
        <BentoCard className="!p-10 flex flex-col justify-between">
           <div className="flex justify-between items-start">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Nawyki</p>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
           </div>
           <div>
              <h4 className="text-5xl font-black text-[#1d1d1f] tracking-tighter mb-6">{habitProgress}%</h4>
              <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${habitProgress}%` }}
                    className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                 />
              </div>
           </div>
        </BentoCard>

        {/* Quick Insights Slot */}
        <BentoCard span="lg:col-span-2" className="bg-gray-50/50 border-none !p-10 flex items-center justify-between">
           <div className="flex items-center gap-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                 <Target size={24} className="text-indigo-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Status Dnia</p>
                 <h4 className="text-2xl font-black text-[#1d1d1f] tracking-tighter leading-none">Wszystko pod kontrolą.</h4>
              </div>
           </div>
           <Link to="/tasks" className="p-4 bg-white rounded-2xl hover:bg-[#1d1d1f] hover:text-white transition-all shadow-sm">
              <ArrowRight size={20} />
           </Link>
        </BentoCard>
      </BentoGrid>

      {/* Primary Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         <div className="lg:col-span-8 space-y-8 animate-entrance delay-200">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-3xl font-display font-black text-[#1d1d1f] tracking-tighter flex items-center gap-4">
                <Target size={28} />
                Priorytety
              </h3>
              <Link to="/tasks" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:gap-2 flex items-center transition-all">
                Wszystkie zadania <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
            
            <div className="grid gap-4">
              {recentTasks.length > 0 ? recentTasks.map((task, idx) => (
                <Card key={task.id} className="p-8 group hover:border-[#1d1d1f] transition-all duration-500">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 group-hover:scale-110">
                            <CheckCircle2 size={28} />
                         </div>
                         <div>
                            <h4 className="text-2xl font-black text-[#1d1d1f] tracking-tighter group-hover:translate-x-1 transition-transform">{task.title}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-1">Deadline: Dzisiaj</p>
                         </div>
                      </div>
                      <Badge variant={task.priority === 'high' ? 'danger' : 'secondary'}>{task.priority}</Badge>
                   </div>
                </Card>
              )) : (
                <div className="bg-white rounded-[3rem] p-24 text-center border-dashed border-2 border-gray-100 flex flex-col items-center">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                      <Zap size={32} />
                   </div>
                   <h4 className="text-2xl font-black text-[#1d1d1f]">Idealnie!</h4>
                   <p className="text-gray-400 font-medium mt-2">Wszystkie zadania na dziś są już wspomnieniem.</p>
                </div>
              )}
            </div>
         </div>

         <div className="lg:col-span-4 space-y-12 animate-entrance delay-300">
            <BentoCard className="flex flex-col gap-8 bg-white shadow-xl !p-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Toolkit</p>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Posiłki', icon: Utensils, path: '/meals', color: 'bg-rose-50 text-rose-600' },
                   { label: 'Zakupy', icon: ShoppingBag, path: '/shopping', color: 'bg-emerald-50 text-emerald-600' },
                   { label: 'Budżet', icon: Wallet, path: '/budget', color: 'bg-amber-50 text-amber-600' },
                   { label: 'Mood', icon: Heart, path: '/mood', color: 'bg-indigo-50 text-indigo-600' }
                 ].map(tool => (
                   <Link key={tool.label} to={tool.path} className="group">
                      <div className="p-6 rounded-[2rem] bg-gray-50 group-hover:bg-indigo-600 group-hover:shadow-2xl group-hover:shadow-indigo-200 transition-all duration-500 flex flex-col items-center gap-4">
                         <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:bg-white group-hover:scale-110", tool.color)}>
                            <tool.icon size={28} />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{tool.label}</span>
                      </div>
                   </Link>
                 ))}
              </div>
            </BentoCard>

            <MoodTracker isMini />
         </div>
      </div>
    </motion.div>
  );
}
