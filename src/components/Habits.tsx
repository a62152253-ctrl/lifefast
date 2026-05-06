import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, ProgressCircle, Modal } from './CommonUI';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, Zap, CheckCircle2, Trash2, Calendar, Trophy, Sparkles, TrendingUp, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { format, startOfToday, subDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { hapticFeedback, cn } from '../lib/utils';
import { getHabitCoaching } from '../services/geminiService';

export default function Habits() {
  const [user] = useAuthState(auth);
  const [habits, setHabits] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [coachingText, setCoachingText] = useState<Record<string, string>>({});
  const [loadingHabitId, setLoadingHabitId] = useState<string | null>(null);

  const today = format(startOfToday(), 'yyyy-MM-dd');
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(startOfToday(), 6 - i);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE', { locale: pl }),
      fullDate: d
    };
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'habits'));
  }, [user]);

  const addHabit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'habits'), {
        name: newName,
        userId: user.uid,
        completions: {},
        createdAt: serverTimestamp()
      });
      setNewName(''); setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'habits'); }
  };

  const toggleDay = async (habit: any, date: string) => {
    const newCompletions = { ...(habit.completions || {}) };
    const isActuallyCompleting = !newCompletions[date];
    if (newCompletions[date]) delete newCompletions[date];
    else newCompletions[date] = true;

    try {
      if (isActuallyCompleting) hapticFeedback('medium');
      await updateDoc(doc(db, 'habits', habit.id), { completions: newCompletions });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `habits/${habit.id}`); }
  };

  const handleGetCoaching = async (habit: any) => {
    setLoadingHabitId(habit.id);
    hapticFeedback('medium');
    try {
      const streak = Object.keys(habit.completions || {}).length;
      const advice = await getHabitCoaching(habit.name, streak);
      setCoachingText(prev => ({ ...prev, [habit.id]: advice }));
      hapticFeedback('heavy');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHabitId(null);
    }
  };

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Dyscyplina" 
        subtitle="Twoje nawyki definiują Twój sukces. Buduj je z głową."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-[#1d1d1f] text-white border-none p-10 relative overflow-hidden">
           <Sparkles size={80} className="absolute -top-5 -right-5 opacity-10" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Statystyki</p>
           <h4 className="text-5xl font-black tracking-tighter mb-1">{habits.length}</h4>
           <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest leading-none">Aktywne nawyki</p>
        </Card>

        <Card className="bg-indigo-600 text-white border-none p-10 relative overflow-hidden">
           <Zap size={80} className="absolute -top-5 -right-5 opacity-10" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Zaangażowanie</p>
           <h4 className="text-5xl font-black tracking-tighter mb-1">
             {Math.round((habits.filter(h => h.completions?.[today]).length / (habits.length || 1)) * 100)}%
           </h4>
           <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest leading-none">Realizacja na dziś</p>
        </Card>

        <Button variant="white" className="h-full flex-col !items-start !p-10 group" onClick={() => setIsAdding(true)}>
           <div className="p-4 bg-gray-50 rounded-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
             <Plus size={32} />
           </div>
           <p className="text-xl font-black text-[#1d1d1f] tracking-tighter">Dodaj nowy nawyk</p>
           <p className="text-xs font-bold text-gray-400 mt-1">Zacznij nową podróż</p>
        </Button>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tighter px-2">Twoje Rutyny</h3>
        <div className="grid gap-6">
          {habits.map((habit, idx) => {
            const completionCount = Object.keys(habit.completions || {}).length;
            const isCompletedToday = habit.completions?.[today];
            const progress = Math.min(100, (completionCount / 30) * 100);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={habit.id}
              >
                <Card className="p-0 overflow-hidden group hover:border-[#1d1d1f] transition-all duration-500">
                  <div className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center">
                      <div className="mr-8">
                         <ProgressCircle progress={progress} size={80} strokeWidth={8} color={isCompletedToday ? '#10b981' : '#4f46e5'}>
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl",
                             isCompletedToday ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-indigo-50 text-indigo-600 shadow-indigo-100"
                           )}>
                             <Zap size={24} fill={isCompletedToday ? "currentColor" : "none"} />
                           </div>
                         </ProgressCircle>
                      </div>
                      <div className="flex-1">
                          <h3 className="text-3xl font-black text-[#1d1d1f] tracking-tighter lowercase">{habit.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest">
                               <Trophy size={14} className="text-amber-500" />
                               <span>Streak: {completionCount} dni</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-xs font-black text-emerald-500 uppercase tracking-widest">
                               <TrendingUp size={14} />
                               <span>Level Up</span>
                             </div>
                          </div>
                      </div>
                      <div className="flex gap-2">
                        <IconButton 
                          icon={loadingHabitId === habit.id ? Loader2 : BrainCircuit}
                          className={cn(
                            "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-300",
                            loadingHabitId === habit.id && "animate-spin"
                          )} 
                          onClick={() => handleGetCoaching(habit)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8 flex-1 xl:justify-end w-full">
                      <div className="flex items-center gap-1.5 sm:gap-3 bg-gray-50/80 p-2 rounded-[2rem] border border-gray-100 overflow-x-auto w-full md:w-auto scrollbar-hide">
                         {last7Days.map((day) => (
                           <button
                             key={day.date}
                             onClick={() => toggleDay(habit, day.date)}
                             className={cn(
                               "flex flex-col items-center justify-center min-w-[44px] sm:min-w-[48px] h-16 sm:h-20 rounded-[1.5rem] transition-all duration-500",
                               habit.completions?.[day.date] 
                                ? "bg-[#1d1d1f] text-white shadow-xl scale-105" 
                                : isSameDay(day.date, today)
                                  ? "bg-white border-2 border-indigo-600 text-indigo-600 font-black"
                                  : "bg-white text-gray-300 hover:text-gray-600 shadow-sm"
                             )}
                           >
                             <span className="text-[9px] font-black uppercase mb-2 tracking-tighter">{day.label[0]}</span>
                             {habit.completions?.[day.date] ? (
                               <CheckCircle2 size={18} className="text-emerald-400" />
                             ) : (
                               <div className={cn("w-1 h-1 rounded-full", isSameDay(day.date, today) ? "bg-indigo-300" : "bg-gray-200")} />
                             )}
                           </button>
                         ))}
                      </div>
                      
                      <div className="flex items-center justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-none border-gray-100">
                         <IconButton icon={Trash2} onClick={() => { hapticFeedback('heavy'); deleteDoc(doc(db, 'habits', habit.id)); }} className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-4" />
                         <div className="md:hidden flex items-center gap-2 text-xs font-black text-gray-300 uppercase tracking-widest">
                            <Calendar size={14} />
                            <span>Ostatnie 7 dni</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {coachingText[habit.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-8 pb-8"
                      >
                         <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-4">
                            <Sparkles size={24} className="text-amber-500 shrink-0" />
                            <div className="flex-1">
                               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Porada AI Strategist</p>
                               <p className="text-sm font-bold text-gray-700 italic leading-relaxed">"{coachingText[habit.id]}"</p>
                               <button 
                                 onClick={() => setCoachingText(prev => { 
                                   const next = { ...prev }; 
                                   delete next[habit.id]; 
                                   return next; 
                                 })}
                                 className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest mt-3 hover:text-amber-600"
                               >
                                 Rozumiem, ukryj
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {habits.length === 0 && !isAdding && (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
             <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                <TrendingUp size={48} />
             </div>
             <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Czysta karta</h4>
             <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Budowanie nawyków to proces. Zacznij go teraz dodając pierwszy punkt kontrolny.</p>
             <Button variant="primary" className="mt-10" onClick={() => setIsAdding(true)}>Stwórz nowy nawyk</Button>
          </div>
        )}
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowa Rutyna">
        <form onSubmit={addHabit} className="space-y-12">
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2">Co chcesz śledzić?</label>
             <textarea 
               autoFocus
               placeholder="Np. Picie wody 2L, Czytanie 20 stron..." 
               className="w-full bg-gray-50 p-8 rounded-[2.5rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-3xl outline-none transition-all min-h-[160px] resize-none leading-tight" 
               value={newName} 
               onChange={(e) => setNewName(e.target.value)} 
               required
             />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="py-6" onClick={() => setIsAdding(false)}>Anuluj</Button>
              <Button type="submit" className="py-6 shadow-indigo-500/40">Zacznij nawyk</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
