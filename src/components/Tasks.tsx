import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc,
  serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Flag, Search, Clock, BrainCircuit, Loader2, Tag, CalendarDays, X, Check, Filter, TrendingUp, AlertCircle, Zap, Target, ListFilter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { brainstormTaskBreakdown } from '../services/geminiService';
import { SkeletonTask, SkeletonList } from './SkeletonUI';
import { NetworkError, DatabaseError } from './ErrorStates';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

type Priority = 'low' | 'medium' | 'high';

const TASK_CATEGORIES = [
  { id: 'work',    label: 'Praca',    color: 'bg-indigo-100 text-indigo-700' },
  { id: 'home',    label: 'Dom',      color: 'bg-orange-100 text-orange-700' },
  { id: 'health',  label: 'Zdrowie',  color: 'bg-emerald-100 text-emerald-700' },
  { id: 'finance', label: 'Finanse',  color: 'bg-amber-100 text-amber-700' },
  { id: 'personal',label: 'Osobiste', color: 'bg-violet-100 text-violet-700' },
  { id: 'other',   label: 'Inne',     color: 'bg-gray-100 text-gray-600' },
];

function getCategoryStyle(id: string) {
  return TASK_CATEGORIES.find(c => c.id === id)?.color ?? 'bg-gray-100 text-gray-600';
}

function dueDateLabel(dateStr: string): { label: string; urgent: boolean } {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return { label: 'Dziś', urgent: true };
    if (isTomorrow(d)) return { label: 'Jutro', urgent: false };
    if (isPast(d)) return { label: 'Po terminie!', urgent: true };
    return { label: format(d, 'd MMM', { locale: pl }), urgent: false };
  } catch { return { label: dateStr, urgent: false }; }
}

export default function Tasks() {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'name'>('date');
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [newCategory, setNewCategory] = useState('other');
  const [newDueDate, setNewDueDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'userProfiles', user.uid), snap => {
      setPartnerUid(snap.exists() ? snap.data().partnerUid || null : null);
    }, err => handleFirestoreError(err, OperationType.LIST, 'userProfiles'));
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    const userIds = partnerUid ? [user.uid, partnerUid] : [user.uid];
    const q = query(
      collection(db, 'tasks'),
      where('userId', 'in', userIds),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    return onSnapshot(q, snap => {
      try {
        const valid = snap.docs.map(d => {
          const data = d.data();
          if (!data.title || typeof data.title !== 'string') return null;
          return {
            id: d.id,
            title: String(data.title).trim(),
            completed: Boolean(data.completed),
            priority: ['low', 'medium', 'high'].includes(data.priority) ? data.priority : 'medium',
            category: data.category || 'other',
            dueDate: data.dueDate || null,
            userId: data.userId,
            createdAt: data.createdAt,
            completedAt: data.completedAt,
            parentTaskId: data.parentTaskId,
          };
        }).filter(Boolean);
        setTasks(valid as any[]);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error processing tasks:', err);
        setError('Failed to process tasks');
        setIsLoading(false);
        showToast({
          type: 'error',
          message: 'Nie udało się załadować zadań',
        });
      }
    }, (err) => {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks');
      setIsLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'tasks');
      showToast({
        type: 'error',
        message: 'Nie udało się załadować zadań',
      });
    });
  }, [user, partnerUid, showToast]);

  const addTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const sanitized = newTaskTitle.trim().replace(/\s+/g, ' ');
    if (!sanitized || sanitized.length < 2 || sanitized.length > 200 || !user) {
      hapticFeedback('heavy'); 
      showToast({
        type: 'warning',
        message: 'Tytuł zadania musi mieć od 2 do 200 znaków',
      });
      return;
    }
    
    if (isOffline) {
      hapticFeedback('heavy');
      showToast({
        type: 'offline',
        message: 'Nie można dodać zadania w trybie offline',
      });
      return;
    }
    
    const duplicate = tasks.find(t => t.title.toLowerCase() === sanitized.toLowerCase() && !t.completed);
    if (duplicate) { 
      hapticFeedback('heavy'); 
      showToast({
        type: 'warning',
        message: 'Takie zadanie już istnieje',
      });
      return; 
    }
    
    try {
      await addDoc(collection(db, 'tasks'), {
        title: sanitized, completed: false, priority,
        category: newCategory, dueDate: newDueDate || null,
        userId: user.uid, createdAt: serverTimestamp(),
      });
      setNewTaskTitle(''); setPriority('medium'); setNewCategory('other'); setNewDueDate('');
      setIsAdding(false);
      hapticFeedback('medium');
      showToast({
        type: 'success',
        message: 'Zadanie dodane pomyślnie',
      });
    } catch (error) {
      hapticFeedback('heavy');
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
      showToast({
        type: 'error',
        message: 'Nie udało się dodać zadania',
      });
    }
  };

  const toggleTask = async (task: any) => {
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
    hapticFeedback('medium');
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: newCompleted, updatedAt: serverTimestamp(),
        completedAt: newCompleted ? serverTimestamp() : null,
      });
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
      hapticFeedback('heavy');
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    hapticFeedback('heavy');
    setDeleteConfirm(null);
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      hapticFeedback('heavy');
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleAiBreakdown = async (task: any) => {
    if (!task.title || task.title.length < 3 || aiLoadingTaskId === task.id) return;
    setAiLoadingTaskId(task.id);
    hapticFeedback('medium');
    try {
      const steps = await brainstormTaskBreakdown(task.title);
      if (!steps || steps.length === 0 || steps.length > 10) throw new Error('Invalid AI response');
      await Promise.all(steps.map(step =>
        addDoc(collection(db, 'tasks'), {
          title: `[${task.title}] ${step}`, completed: false, priority: 'low',
          category: task.category || 'other', userId: user?.uid,
          createdAt: serverTimestamp(), parentTaskId: task.id,
        })
      ));
      hapticFeedback('heavy');
    } catch (error) {
      console.error('AI breakdown error:', error);
      hapticFeedback('heavy');
    } finally {
      setAiLoadingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? !t.completed : t.completed);
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [tasks, filter, search]);

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-10 pb-40">
      <PageHeader title="Zadania" subtitle={`${activeCount} aktywnych priorytetów`} />

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
          {isLoading ? (
            <SkeletonList items={5} />
          ) : error ? (
            <NetworkError onRetry={() => window.location.reload()} />
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
                    <Card className={cn(
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
                          <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'primary' : 'success'}>
                            {task.priority === 'high' ? 'Wysoki' : task.priority === 'medium' ? 'Średni' : 'Niski'}
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
          {/* Title */}
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

          {/* Priority */}
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
                      ? p === 'high' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200'
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

          {/* Category */}
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

          {/* Due date */}
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
