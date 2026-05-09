import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc,
  serverTimestamp, orderBy, limit, Timestamp
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, CheckCircle2, Circle, Clock, AlertTriangle,
  Search, BrainCircuit, CalendarDays, Loader2, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { brainstormTaskBreakdown } from '../services/geminiService';
import { SkeletonList } from './SkeletonUI';
import { NetworkError } from './ErrorStates';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  dueDate?: string;
  userId: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  completedAt?: Timestamp | Date | null;
  tags?: string[];
  notes?: string;
  recurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const TASK_CATEGORIES = [
  { id: 'work',      label: 'Praca',       color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'home',      label: 'Dom',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'health',    label: 'Zdrowie',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'finance',   label: 'Finanse',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'personal',  label: 'Osobiste',    color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'education', label: 'Edukacja',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'shopping',  label: 'Zakupy',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'travel',    label: 'Podróże',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'fitness',   label: 'Fitness',     color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'social',    label: 'Społeczne',   color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'hobby',     label: 'Hobby',       color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { id: 'creative',  label: 'Twórcze',     color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'volunteer', label: 'Wolontariat', color: 'bg-lime-100 text-lime-700 border-lime-200' },
  { id: 'spiritual', label: 'Duchowe',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'other',     label: 'Inne',        color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

function getCategoryStyle(id: string) {
  return TASK_CATEGORIES.find(c => c.id === id)?.color ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function dueDateLabel(dateStr: string): { label: string; urgent: boolean } {
  try {
    const d = parseISO(dateStr);
    if (isToday(d))    return { label: 'Dziś',        urgent: true };
    if (isTomorrow(d)) return { label: 'Jutro',       urgent: false };
    if (isPast(d))     return { label: 'Po terminie!', urgent: true };
    return { label: format(d, 'd MMM', { locale: pl }), urgent: false };
  } catch { return { label: dateStr, urgent: false }; }
}

export default function Tasks() {
  const [user] = useAuthState(auth);
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [retryCount, setRetryCount]     = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority]         = useState<Priority>('medium');
  const [newCategory, setNewCategory]   = useState('other');
  const [newDueDate, setNewDueDate]     = useState('');
  const [isAdding, setIsAdding]         = useState(false);
  const [filter, setFilter]             = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch]             = useState('');
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const handleError = useCallback((err: any, operation: string) => {
    const msg = err?.message || `Wystąpił błąd podczas ${operation}`;
    setError(msg);
    if (!isOffline) showToast({ type: 'error', message: msg });
  }, [showToast, isOffline]);

  const retryLoad = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
  }, []);

  useEffect(() => {
    if (!user) { setTasks([]); setLoading(false); setError(null); return; }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, snap => {
      try {
        const valid = snap.docs.map(d => {
          const data = d.data();
          if (!data.title || typeof data.title !== 'string') return null;
          return {
            id: d.id,
            title: String(data.title).trim(),
            completed: Boolean(data.completed),
            priority: ['low', 'medium', 'high', 'urgent'].includes(data.priority) ? data.priority : 'medium',
            category: data.category || 'other',
            dueDate: data.dueDate || null,
            userId: data.userId,
            createdAt: data.createdAt || serverTimestamp(),
            updatedAt: data.updatedAt,
            completedAt: data.completedAt,
            tags: data.tags || [],
            notes: data.notes,
            recurring: data.recurring || false,
            recurringPattern: data.recurringPattern,
          } as Task;
        }).filter(Boolean);

        setTasks(valid as Task[]);
        setLoading(false);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        handleError(err, 'processing tasks');
        setTasks([]);
        setLoading(false);
      }
    }, err => {
      handleError(err, 'loading tasks');
      setTasks([]);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'tasks');
    });

    return unsubscribe;
  }, [user, retryCount, handleError]);

  const addTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const sanitized = newTaskTitle.trim().replace(/\s+/g, ' ');

    if (!sanitized || sanitized.length < 2) {
      hapticFeedback('heavy');
      showToast({ type: 'warning', message: sanitized ? 'Tytuł musi mieć co najmniej 2 znaki' : 'Tytuł zadania jest wymagany' });
      return;
    }
    if (sanitized.length > 200) {
      hapticFeedback('heavy');
      showToast({ type: 'warning', message: 'Tytuł nie może przekraczać 200 znaków' });
      return;
    }
    if (!user) return;

    if (isOffline) {
      hapticFeedback('heavy');
      showToast({ type: 'offline', message: 'Nie można dodać zadania w trybie offline' });
      return;
    }

    const duplicate = tasks.find(t =>
      t.title.toLowerCase() === sanitized.toLowerCase() && !t.completed && t.category === newCategory
    );
    if (duplicate) {
      hapticFeedback('heavy');
      showToast({ type: 'warning', message: 'Takie zadanie już istnieje w tej kategorii' });
      return;
    }

    if (newDueDate && new Date(newDueDate) < new Date(format(new Date(), 'yyyy-MM-dd'))) {
      hapticFeedback('heavy');
      showToast({ type: 'warning', message: 'Data nie może być w przeszłości' });
      return;
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        title: sanitized,
        completed: false,
        priority,
        category: newCategory,
        dueDate: newDueDate || null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: [],
        notes: null,
        recurring: false,
      });

      setNewTaskTitle('');
      setPriority('medium');
      setNewCategory('other');
      setNewDueDate('');
      setIsAdding(false);
      hapticFeedback('medium');
      showToast({ type: 'success', message: 'Zadanie dodane pomyślnie' });
    } catch (err) {
      hapticFeedback('heavy');
      handleError(err, 'adding task');
    }
  };

  const toggleTask = async (task: Task) => {
    const newCompleted = !task.completed;

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, completed: newCompleted, completedAt: newCompleted ? new Date() : null } : t
    ));
    hapticFeedback('medium');

    if (isOffline) {
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, completed: task.completed, completedAt: task.completedAt } : t
      ));
      showToast({ type: 'offline', message: 'Nie można zaktualizować zadania w trybie offline' });
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: newCompleted,
        updatedAt: serverTimestamp(),
        completedAt: newCompleted ? serverTimestamp() : null,
      });
      showToast({ type: 'success', message: newCompleted ? 'Zadanie ukończone!' : 'Zadanie ponownie otwarte' });
    } catch (err) {
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, completed: task.completed, completedAt: task.completedAt } : t
      ));
      hapticFeedback('heavy');
      handleError(err, 'toggling task');
    }
  };

  const deleteTask = async (id: string) => {
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można usunąć zadania w trybie offline' });
      return;
    }

    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    hapticFeedback('heavy');
    setDeleteConfirm(null);

    try {
      await deleteDoc(doc(db, 'tasks', id));
      showToast({ type: 'success', message: 'Zadanie usunięte' });
    } catch (err) {
      if (taskToDelete) setTasks(prev => [...prev, taskToDelete]);
      hapticFeedback('heavy');
      handleError(err, 'deleting task');
    }
  };

  const handleAiBreakdown = async (task: Task) => {
    if (!task.title || task.title.length < 3 || aiLoadingTaskId === task.id) return;
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można użyć AI w trybie offline' });
      return;
    }

    setAiLoadingTaskId(task.id);
    hapticFeedback('medium');

    try {
      const steps = await brainstormTaskBreakdown(task.title);
      if (!steps || steps.length === 0) throw new Error('Invalid AI response');

      const validSteps = steps.filter(s => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 100);
      if (validSteps.length === 0) throw new Error('No valid steps generated');

      await Promise.all(validSteps.map(step =>
        addDoc(collection(db, 'tasks'), {
          title: `[${task.title}] ${step.trim()}`,
          completed: false,
          priority: 'low',
          category: task.category || 'other',
          userId: user?.uid,
          createdAt: serverTimestamp(),
          parentTaskId: task.id,
          updatedAt: serverTimestamp(),
          tags: ['ai-generated'],
          notes: `Wygenerowane z zadania: ${task.title}`,
        })
      ));

      hapticFeedback('heavy');
      showToast({ type: 'success', message: `Utworzono ${validSteps.length} podzadań` });
    } catch (err) {
      hapticFeedback('heavy');
      handleError(err, 'AI task breakdown');
    } finally {
      setAiLoadingTaskId(null);
    }
  };

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesFilter =
        filter === 'all' ? true :
        filter === 'active' ? !task.completed :
        task.completed;

      const matchesSearch = !search ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.notes && task.notes.toLowerCase().includes(search.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [tasks, filter, search]);

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-10 pb-40">
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-600" />
            <div>
              <h4 className="font-bold text-rose-900">Błąd</h4>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-800 text-sm font-medium">X</button>
          </div>
        </div>
      )}

      <PageHeader
        title="Zadania"
        subtitle={`${activeCount} aktywnych priorytetów`}
        action={
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Wykonanie</p>
              <p className="text-lg font-bold text-indigo-600">{completionRate}%</p>
            </div>
            <Button variant="primary" onClick={() => setIsAdding(true)}>
              <Plus size={20} className="mr-2" /> Nowe zadanie
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <div className="lg:sticky lg:top-10 w-full lg:w-64 space-y-4">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
            {(['all', 'active', 'completed'] as const).map(f => (
              <button
                type="button"
                key={f}
                onClick={() => { hapticFeedback('light'); setFilter(f); }}
                className={cn(
                  'whitespace-nowrap px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all flex items-center justify-between gap-4',
                  filter === f ? 'bg-[#1d1d1f] text-white shadow-xl shadow-gray-200' : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-50'
                )}
              >
                {f === 'all' ? 'Wszystkie' : f === 'active' ? 'Do zrobienia' : 'Ukończone'}
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-black',
                  filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                )}>
                  {f === 'all' ? tasks.length : f === 'active' ? activeCount : tasks.length - activeCount}
                </span>
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors" size={17} />
            <input
              type="text"
              placeholder="Szukaj..."
              className="w-full pl-11 pr-5 py-4 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-base transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Button variant="primary" className="w-full py-4 text-sm" onClick={() => setIsAdding(true)}>
            <Plus size={20} className="mr-2" /> Nowe zadanie
          </Button>
        </div>

        {/* Task list */}
        <div className="flex-1 w-full space-y-3">
          {loading ? (
            <SkeletonList items={5} />
          ) : error ? (
            <NetworkError onRetry={retryLoad} />
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTasks.length > 0 ? filteredTasks.map((task, idx) => {
                const catStyle = getCategoryStyle(task.category);
                const due = task.dueDate ? dueDateLabel(task.dueDate) : null;

                return (
                  <motion.div
                    layout key={task.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card
                      className={cn(
                        'flex items-center gap-5 p-5 border-none shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] cursor-pointer group hover:bg-indigo-50/30 transition-all duration-300',
                        task.completed && 'opacity-60 bg-gray-50/50'
                      )}
                      onClick={() => toggleTask(task)}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0',
                        task.completed ? 'bg-[#1d1d1f] border-[#1d1d1f] text-white' : 'bg-white border-gray-100 group-hover:border-indigo-400'
                      )}>
                        {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-gray-100" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          'text-lg font-black tracking-tight truncate transition-all',
                          task.completed ? 'line-through text-gray-400' : 'text-[#1d1d1f]'
                        )}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'danger' : task.priority === 'medium' ? 'primary' : 'success'}>
                            {task.priority === 'high' ? 'Wysoki' : task.priority === 'urgent' ? 'Pilny' : task.priority === 'medium' ? 'Średni' : 'Niski'}
                          </Badge>
                          {task.category && task.category !== 'other' && (
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black', catStyle)}>
                              {TASK_CATEGORIES.find(c => c.id === task.category)?.label}
                            </span>
                          )}
                          {due && (
                            <div className={cn('flex items-center gap-1 text-[10px] font-black', due.urgent ? 'text-rose-500' : 'text-gray-400')}>
                              <CalendarDays size={11} />
                              {due.label}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-gray-300">
                            <Clock size={11} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {format(task.createdAt?.toDate?.() || new Date(), 'd MMM', { locale: pl })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        {!task.completed && (
                          <IconButton
                            icon={aiLoadingTaskId === task.id ? Loader2 : BrainCircuit}
                            disabled={!!aiLoadingTaskId}
                            title="Rozbij zadanie z AI"
                            onClick={() => handleAiBreakdown(task)}
                            className={cn(
                              'p-3 bg-indigo-50 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 border border-indigo-100',
                              aiLoadingTaskId === task.id && 'animate-spin'
                            )}
                          />
                        )}
                        {deleteConfirm === task.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" title="Potwierdź" onClick={() => deleteTask(task.id)} className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600">
                              <Check size={14} />
                            </button>
                            <button type="button" title="Anuluj" onClick={() => setDeleteConfirm(null)} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <IconButton
                            icon={Trash2}
                            title="Usuń zadanie"
                            onClick={() => setDeleteConfirm(task.id)}
                            className="p-3 bg-gray-50 text-gray-200 hover:bg-rose-50 hover:text-rose-500"
                          />
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              }) : (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-[2rem] flex items-center justify-center mb-6">
                    <Search size={40} />
                  </div>
                  <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Brak zadań</h4>
                  <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Brak wyników dla obecnych filtrów.</p>
                  <Button variant="secondary" className="mt-8" onClick={() => { setFilter('all'); setSearch(''); }}>
                    Wyczyść filtry
                  </Button>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowe zadanie">
        <form onSubmit={addTask} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2">Opisz zadanie</label>
            <textarea
              autoFocus
              placeholder="Np. Napisać raport miesięczny..."
              className="w-full bg-gray-50 p-7 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-2xl outline-none transition-all min-h-[130px] resize-none leading-tight"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2 block">Priorytet</label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => { setPriority(p); hapticFeedback('light'); }}
                  className={cn(
                    'py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                    priority === p
                      ? p === 'high'   ? 'bg-rose-500 text-white shadow-xl shadow-rose-200'
                        : p === 'medium' ? 'bg-[#1d1d1f] text-white shadow-xl shadow-gray-200'
                        : 'bg-emerald-500 text-white shadow-xl shadow-emerald-200'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  )}
                >
                  {p === 'low' ? 'Niski' : p === 'medium' ? 'Średni' : 'Wysoki'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2 block">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {TASK_CATEGORIES.map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => setNewCategory(cat.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                    newCategory === cat.id ? cat.color + ' border-current' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2 block">Termin (opcjonalnie)</label>
            <input
              type="date"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="ghost" className="py-5" onClick={() => setIsAdding(false)}>Anuluj</Button>
            <Button type="submit" className="py-5">Utwórz zadanie</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
