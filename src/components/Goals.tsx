import React, { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, addDoc, onSnapshot, query, where,
  deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Target, Plus, Trash2, CheckCircle2, Edit3,
  Trophy, TrendingUp, Flame, Award, Star, Zap, Target as TargetIcon,
  Calendar, Clock, Flag, Milestone
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { PageHeader, Button, Modal, FloatingActionButton } from './CommonUI';
import { cn } from '../lib/utils';

const CATEGORIES = [
  { id: 'health',    label: 'Zdrowie',  color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'work',      label: 'Praca',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'personal',  label: 'Osobiste', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'finance',   label: 'Finanse',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'learning',  label: 'Rozwój',   color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'social',    label: 'Social',   color: 'bg-pink-100 text-pink-700 border-pink-200' },
];

function getCat(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[2];
}

export default function Goals() {
  const [user] = useAuthState(auth);
  const [goals, setGoals] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('personal');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress]     = useState(0);
  const [motivationQuotes, setMotivationQuotes] = useState<string[]>([]);
  const [dailyTip, setDailyTip] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Motivation system
  useEffect(() => {
    const quotes = [
      "Każdy krok przybliża Cię do celu! 🎯",
      "Dyscyplina to klucz do sukcesu 💪",
      "Jesteś silniejszy niż myślisz! 🌟",
      "Dziś jest dzień na zwycięstwo! 🏆",
      "Nigdy się nie poddawaj! 🚀"
    ];
    setMotivationQuotes(quotes);
    setDailyTip(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    const inProgressGoals = goals.filter(g => g.progress > 0 && g.progress < 100).length;
    const avgProgress = totalGoals > 0 ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals : 0;
    
    return {
      total: totalGoals,
      completed: completedGoals,
      inProgress: inProgressGoals,
      avgProgress: Math.round(avgProgress),
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [goals]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'goals'), where('userId', '==', user.uid)),
      (s) => setGoals(s.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [user]);

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('personal');
    setTargetDate(''); setProgress(0); setEditGoal(null);
  };

  const openAdd  = () => { reset(); setIsOpen(true); };
  const openEdit = (g: any) => {
    setEditGoal(g);
    setTitle(g.title || '');
    setDescription(g.description || '');
    setCategory(g.category || 'personal');
    setTargetDate(g.targetDate || '');
    setProgress(g.progress || 0);
    setIsOpen(true);
  };

  const save = async () => {
    if (!title.trim() || !user) return;
    const payload = {
      title: title.trim(), description: description.trim(),
      category, targetDate, progress, userId: user.uid,
      completed: progress >= 100,
    };
    if (editGoal) {
      await updateDoc(doc(db, 'goals', editGoal.id), payload);
    } else {
      await addDoc(collection(db, 'goals'), { ...payload, createdAt: serverTimestamp() });
    }
    setIsOpen(false);
    reset();
  };

  const remove = (id: string) => deleteDoc(doc(db, 'goals', id));

  const setGoalProgress = (id: string, pct: number) =>
    updateDoc(doc(db, 'goals', id), { progress: pct, completed: pct >= 100 });

  const active    = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);
  const avgProgress = goals.length
    ? Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / goals.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-28"
    >
      <PageHeader
        title="Cele"
        subtitle={`${active.length} aktywnych celów`}
        action={<Button onClick={openAdd}><Plus size={16} />Nowy cel</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: active.length,    label: 'Aktywne',   color: 'text-indigo-600', icon: Target },
          { value: completed.length, label: 'Ukończone', color: 'text-emerald-600', icon: Trophy },
          { value: `${avgProgress}%`, label: 'Śr. postęp', color: 'text-amber-500', icon: TrendingUp },
        ].map(({ value, label, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-[1.75rem] p-5 border border-gray-100 shadow-sm text-center">
            <Icon size={20} className={cn('mx-auto mb-2', color)} />
            <p className={cn('text-2xl font-black', color)}>{value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Target size={40} className="text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Brak celów</h2>
          <p className="text-gray-400 mb-6">Dodaj swój pierwszy cel i zacznij działać!</p>
          <Button onClick={openAdd}><Plus size={16} />Dodaj cel</Button>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <section className="space-y-4">
          <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase px-1">Aktywne cele</p>
          <AnimatePresence>
            {active.map((goal, idx) => {
              const cat = getCat(goal.category);
              const daysLeft = goal.targetDate
                ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
                : null;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white rounded-[1.75rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', cat.color)}>
                          {cat.label}
                        </span>
                        {daysLeft !== null && (
                          <span className={cn('text-[10px] font-bold',
                            daysLeft < 0 ? 'text-rose-500' :
                            daysLeft === 0 ? 'text-orange-500' :
                            daysLeft < 7 ? 'text-amber-500' : 'text-gray-400'
                          )}>
                            {daysLeft < 0 ? 'Po terminie' : daysLeft === 0 ? 'Dziś!' : `${daysLeft} dni`}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-[#1d1d1f] truncate">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEdit(goal)}
                        className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => remove(goal.id)}
                        className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Postęp</span>
                      <span className="text-[10px] font-black text-indigo-600">{goal.progress || 0}%</span>
                    </div>
                    <div
                      className="h-2.5 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
                      title="Kliknij, aby ustawić postęp"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct  = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                        setGoalProgress(goal.id, Math.min(100, Math.max(0, pct)));
                      }}
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress || 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setGoalProgress(goal.id, pct)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                            (goal.progress || 0) >= pct
                              ? 'bg-indigo-100 text-indigo-600 scale-105'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-black tracking-[0.35em] text-gray-400 uppercase px-1">Ukończone</p>
          {completed.map((goal) => {
            const cat = getCat(goal.category);
            return (
              <div
                key={goal.id}
                className="bg-white rounded-[1.5rem] p-4 border border-gray-100 opacity-60 flex items-center gap-4"
              >
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border mr-2', cat.color)}>
                    {cat.label}
                  </span>
                  <p className="text-sm font-bold text-gray-400 line-through mt-1 truncate">{goal.title}</p>
                </div>
                <button onClick={() => remove(goal.id)} className="text-gray-200 hover:text-rose-400 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); reset(); }}
        title={editGoal ? 'Edytuj cel' : 'Nowy cel'}
      >
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tytuł</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Przebiec 5 km"
              className="input-base"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Opis (opcjonalnie)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opisz swój cel..."
              rows={2}
              className="input-base resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Kategoria</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold border transition-all',
                    category === cat.id
                      ? cn(cat.color, 'scale-105 shadow-sm')
                      : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Data docelowa</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input-base"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
              Postęp — {progress}%
            </label>
            <input
              type="range"
              min={0} max={100} step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <Button onClick={save} className="w-full" disabled={!title.trim()}>
            {editGoal ? 'Zapisz zmiany' : 'Dodaj cel'}
          </Button>
        </div>
      </Modal>

      <FloatingActionButton icon={Plus} onClick={openAdd} />
    </motion.div>
  );
}
