import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, ProgressCircle, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Zap, CheckCircle2, Trash2, Trophy, Sparkles, TrendingUp, BrainCircuit, Loader2, Flame, Target, Bell, Calendar, Award, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { format, startOfToday, subDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { hapticFeedback, cn } from '../lib/utils';
import { getHabitCoaching } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

const HABIT_CATEGORIES = [
  { id: 'health',  label: 'Zdrowie',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { id: 'work',    label: 'Praca',    color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-400' },
  { id: 'sport',   label: 'Sport',    color: 'bg-red-100 text-red-700',         dot: 'bg-red-400' },
  { id: 'mind',    label: 'Umysł',    color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400' },
  { id: 'finance', label: 'Finanse',  color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  { id: 'other',   label: 'Inne',     color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-300' },
];

function getCategory(id: string) {
  return HABIT_CATEGORIES.find(c => c.id === id) ?? HABIT_CATEGORIES[HABIT_CATEGORIES.length - 1];
}

function calcConsecutiveStreak(completions: Record<string, boolean>): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = format(d, 'yyyy-MM-dd');
    if (completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function Habits() {
  const [user] = useAuthState(auth);
  const [habits, setHabits] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');
  const [newCategory, setNewCategory] = useState('health');
  const [newTarget, setNewTarget] = useState(21);
  const [showNotifications, setShowNotifications] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);
  const [coachingMessage, setCoachingMessage] = useState('');
  const [coachingText, setCoachingText] = useState<Record<string, string>>({});
  const [loadingHabitId, setLoadingHabitId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const today = format(startOfToday(), 'yyyy-MM-dd');
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(startOfToday(), 6 - i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE', { locale: pl }), fullDate: d };
  });

  const EMOJI_PRESETS = ['⚡','🏃','📚','💧','🧘','🍎','💪','🎯','🌿','😴','✍️','🎵','🧹','🥗','🏋️','🎨','🚴','🧠'];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    return onSnapshot(q, snap => setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => handleFirestoreError(err, OperationType.LIST, 'habits'));
  }, [user]);

  useEffect(() => {
    const maxStreak = Math.max(...habits.map(h => h.streak || 0), 0);
    setBestStreak(maxStreak);
  }, [habits]);

  useEffect(() => {
    if (habits.length > 0) {
      const todayHabits = habits.filter(h => !h.completedToday);
      if (todayHabits.length > 0) {
        setCoachingMessage(`Masz jeszcze ${todayHabits.length} nawyków do zrobienia dziś! 💪`);
      } else {
        setCoachingMessage('Świetnie! Wszystkie nawyki na dziś zrobione! 🎉');
      }
    }
  }, [habits]);

  const handleHabitComplete = async (habitId: string) => {
    try {
      const habit = habits.find(h => h.id === habitId);
      if (!habit || habit.completedToday) return;

      await updateDoc(doc(db, 'habits', habitId), {
        completedToday: true,
        streak: (habit.streak || 0) + 1,
        completions: {
          ...habit.completions,
          [format(new Date(), 'yyyy-MM-dd')]: true
        }
      });

      hapticFeedback('medium');
      showToast('Nawyk zakończony! 🔥', 'success');

      // Get AI coaching
      const coaching = await getHabitCoaching(habit.name, (habit.streak || 0) + 1);
      if (coaching) {
        setTimeout(() => showToast(coaching, 'info'), 1000);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'habits');
    }
  };

  const addHabit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!newName.trim() || !user) {
      if (!newName.trim()) {
        showToast({
          type: 'warning',
          message: 'Wpisz nazwę nawyku',
        });
      }
      return;
    }
    
    if (isOffline) {
      showToast({
        type: 'offline',
        message: 'Nie można dodać nawyku w trybie offline',
      });
      return;
    }
    
    try {
      await addDoc(collection(db, 'habits'), {
        name: newName.trim(),
        emoji: newEmoji,
        category: newCategory,
        target: newTarget,
        userId: user.uid,
        completions: {},
        createdAt: serverTimestamp(),
      });
      setNewName(''); setNewEmoji('⚡'); setNewCategory('health'); setNewTarget(7); setIsAdding(false);
      hapticFeedback('medium');
      showToast({
        type: 'success',
        message: 'Nawyk dodany pomyślnie',
      });
    } catch (err) { 
      console.error('Error adding habit:', err);
      handleFirestoreError(err, OperationType.CREATE, 'habits');
      showToast({
        type: 'error',
        message: 'Nie udało się dodać nawyku',
      });
    }
  };

  const toggleDay = async (habit: any, date: string) => {
    const newCompletions = { ...(habit.completions || {}) };
    const completing = !newCompletions[date];
    if (newCompletions[date]) delete newCompletions[date];
    else newCompletions[date] = true;
    try {
      if (completing) hapticFeedback('medium');
      await updateDoc(doc(db, 'habits', habit.id), { completions: newCompletions });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `habits/${habit.id}`); }
  };

  const deleteHabit = async (id: string) => {
    hapticFeedback('heavy');
    try { await deleteDoc(doc(db, 'habits', id)); setDeleteConfirm(null); } catch (err) { console.error(err); }
  };

  const handleGetCoaching = async (habit: any) => {
    setLoadingHabitId(habit.id);
    hapticFeedback('medium');
    try {
      const streak = calcConsecutiveStreak(habit.completions || {});
      const advice = await getHabitCoaching(habit.name, streak);
      setCoachingText(prev => ({ ...prev, [habit.id]: advice }));
      hapticFeedback('heavy');
    } catch (e) { console.error(e); }
    finally { setLoadingHabitId(null); }
  };

  const completedToday = habits.filter(h => h.completions?.[today]).length;
  const completionRate = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;

  const displayedHabits = useMemo(() =>
    filterCat ? habits.filter(h => (h.category || 'other') === filterCat) : habits,
    [habits, filterCat]
  );

  return (
    <div className="space-y-10 pb-40">
      <PageHeader title="Dyscyplina" subtitle="Twoje nawyki definiują Twój sukces." />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1d1d1f] text-white border-none p-8 relative overflow-hidden">
          <Sparkles size={70} className="absolute -top-4 -right-4 opacity-10" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Aktywne</p>
          <h4 className="text-5xl font-black tracking-tighter mb-1">{habits.length}</h4>
          <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">nawyki</p>
        </Card>

        <Card className="bg-indigo-600 text-white border-none p-8 relative overflow-hidden">
          <Flame size={70} className="absolute -top-4 -right-4 opacity-10" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Dziś</p>
          <h4 className="text-5xl font-black tracking-tighter mb-1">{completionRate}%</h4>
          <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">
            {completedToday} z {habits.length} zrobionych
          </p>
        </Card>

        <Button variant="white" className="h-full flex-col !items-start !p-8 group" onClick={() => setIsAdding(true)}>
          <div className="p-4 bg-gray-50 rounded-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Plus size={28} />
          </div>
          <p className="text-xl font-black text-[#1d1d1f] tracking-tighter">Nowy nawyk</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Zacznij nową podróż</p>
        </Button>
      </div>

      {/* Category filter */}
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterCat(null)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all',
              !filterCat ? 'bg-[#1d1d1f] text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            )}
          >
            Wszystkie
          </button>
          {HABIT_CATEGORIES.map(cat => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all border',
                filterCat === cat.id ? cat.color + ' border-current' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Habits list */}
      <div className="space-y-5">
        {displayedHabits.map((habit, idx) => {
          const completionCount = Object.keys(habit.completions || {}).length;
          const streak = calcConsecutiveStreak(habit.completions || {});
          const isCompletedToday = !!habit.completions?.[today];
          const target = habit.target || 30;
          const progress = Math.min(100, Math.round((streak / target) * 100));
          const cat = getCategory(habit.category || 'other');

          return (
            <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} key={habit.id}>
              <Card className="p-0 overflow-hidden hover:border-[#1d1d1f] transition-all duration-500">
                <div className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-8">

                  {/* Left: icon + info */}
                  <div className="flex items-center gap-5">
                    <ProgressCircle progress={progress} size={76} strokeWidth={7} color={isCompletedToday ? '#10b981' : '#4f46e5'}>
                      <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 shadow-lg',
                        isCompletedToday ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-50 shadow-indigo-100'
                      )}>
                        {habit.emoji || '⚡'}
                      </div>
                    </ProgressCircle>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tighter">{habit.name}</h3>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black uppercase', cat.color)}>
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {streak > 0 && (
                          <div className="flex items-center gap-1 text-xs font-black text-orange-500">
                            <Flame size={13} className="text-orange-400" />
                            {streak} {streak === 1 ? 'dzień' : streak < 5 ? 'dni' : 'dni'} z rzędu
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs font-black text-gray-400">
                          <Trophy size={12} className="text-amber-400" />
                          {completionCount} łącznie
                        </div>
                        <div className="flex items-center gap-1 text-xs font-black text-indigo-400">
                          <Target size={12} />
                          cel: {target} dni
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: 7-day tracker + actions */}
                  <div className="flex flex-col md:flex-row items-center gap-6 xl:ml-auto">
                    <div className="flex items-center gap-1.5 bg-gray-50/80 p-2 rounded-[2rem] border border-gray-100">
                      {last7Days.map(day => (
                        <button
                          type="button"
                          key={day.date}
                          onClick={() => toggleDay(habit, day.date)}
                          title={day.label}
                          className={cn(
                            'flex flex-col items-center justify-center w-10 h-14 rounded-2xl transition-all duration-300',
                            habit.completions?.[day.date]
                              ? 'bg-[#1d1d1f] text-white shadow-lg scale-105'
                              : isSameDay(day.date, today)
                                ? 'bg-white border-2 border-indigo-400 text-indigo-600'
                                : 'bg-white text-gray-200 hover:text-gray-500 shadow-sm'
                          )}
                        >
                          <span className="text-[9px] font-black uppercase tracking-tighter">{day.label[0]}</span>
                          {habit.completions?.[day.date]
                            ? <CheckCircle2 size={15} className="text-emerald-400 mt-1" />
                            : <div className={cn('w-1 h-1 rounded-full mt-1', isSameDay(day.date, today) ? 'bg-indigo-300' : 'bg-gray-200')} />
                          }
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <IconButton
                        icon={loadingHabitId === habit.id ? Loader2 : BrainCircuit}
                        title="Porady AI"
                        className={cn(
                          'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all',
                          loadingHabitId === habit.id && 'animate-spin'
                        )}
                        onClick={() => handleGetCoaching(habit)}
                      />
                      {deleteConfirm === habit.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" title="Potwierdź usunięcie" onClick={() => deleteHabit(habit.id)} className="px-3 py-2 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600">Usuń</button>
                          <button type="button" title="Anuluj" onClick={() => setDeleteConfirm(null)} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-200">Nie</button>
                        </div>
                      ) : (
                        <IconButton icon={Trash2} title="Usuń nawyk" onClick={() => setDeleteConfirm(habit.id)} className="text-gray-300 hover:text-rose-500 hover:bg-rose-50" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', isCompletedToday ? 'bg-emerald-400' : 'bg-indigo-400')}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 shrink-0">{progress}% celu</span>
                  </div>
                </div>

                {/* AI coaching */}
                <AnimatePresence>
                  {coachingText[habit.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6"
                    >
                      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-3">
                        <Sparkles size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Porada AI</p>
                          <p className="text-sm font-bold text-gray-700 italic leading-relaxed">"{coachingText[habit.id]}"</p>
                          <button
                            type="button"
                            onClick={() => setCoachingText(prev => { const n = { ...prev }; delete n[habit.id]; return n; })}
                            className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest mt-2 hover:text-amber-600"
                          >
                            Ukryj
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

        {habits.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-[2rem] flex items-center justify-center mb-6">
              <TrendingUp size={40} />
            </div>
            <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Czysta karta</h4>
            <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Budowanie nawyków to proces. Zacznij go teraz.</p>
            <Button variant="primary" className="mt-8" onClick={() => setIsAdding(true)}>Stwórz nowy nawyk</Button>
          </div>
        )}
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowy nawyk">
        <form onSubmit={addHabit} className="space-y-6">
          {/* Emoji */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Emoji ikona</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewEmoji(em)}
                  className={cn(
                    'w-10 h-10 rounded-2xl text-lg flex items-center justify-center transition-all border-2',
                    newEmoji === em ? 'border-indigo-400 bg-indigo-50 scale-110 shadow-md' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Nazwa nawyku</label>
            <input
              autoFocus
              type="text"
              placeholder="Np. Picie wody 2L..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                    newCategory === cat.id ? cat.color + ' border-current' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                  )}
                >
                  <div className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target days */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">
              Cel: <span className="text-indigo-600">{newTarget} dni</span>
            </label>
            <div className="flex gap-2">
              {[7, 14, 21, 30, 60, 90].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewTarget(t)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-black transition-all',
                    newTarget === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  )}
                >
                  {t}d
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Anuluj</Button>
            <Button type="submit">Zacznij nawyk</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
