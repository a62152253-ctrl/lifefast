import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
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
  orderBy
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Flag, Filter, Search, MoreHorizontal, ArrowRight, X, Clock, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { brainstormTaskBreakdown } from '../services/geminiService';

type Priority = 'low' | 'medium' | 'high';

export default function Tasks() {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);

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
    const q = query(
      collection(db, 'tasks'), 
      where('userId', 'in', uids),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));
  }, [user, partnerUid]);

  const addTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle,
        completed: false,
        priority,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewTaskTitle(''); setPriority('medium'); setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'tasks'); }
  };

  const toggleTask = async (task: any) => {
    try {
      hapticFeedback('medium');
      await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`); }
  };

  const deleteTask = async (id: string) => {
    try {
      hapticFeedback('heavy');
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`); }
  };

  const handleAiBreakdown = async (task: any) => {
    setAiLoadingTaskId(task.id);
    hapticFeedback('medium');
    try {
      const steps = await brainstormTaskBreakdown(task.title);
      // For each step, create a new low-priority task
      for (const step of steps) {
        await addDoc(collection(db, 'tasks'), {
          title: `[${task.title}] ${step}`,
          completed: false,
          priority: 'low',
          userId: user?.uid,
          createdAt: serverTimestamp()
        });
      }
      hapticFeedback('heavy');
      alert(`AI rozbiło Twoje zadanie na ${steps.length} kroków!`);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? !t.completed : t.completed);
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Zadania" 
        subtitle={`${tasks.filter(t => !t.completed).length} aktywnych priorytetów`}
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="lg:sticky lg:top-10 w-full lg:w-72 space-y-6">
           <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {(['all', 'active', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { hapticFeedback('light'); setFilter(f); }}
                  className={cn(
                    "whitespace-nowrap px-6 lg:px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all flex items-center justify-between gap-4",
                    filter === f ? "bg-[#1d1d1f] text-white shadow-xl shadow-gray-200" : "bg-white text-gray-400 hover:text-gray-600 border border-gray-50 lg:border-none"
                  )}
                >
                  {f === 'all' ? 'Wszystkie' : f === 'active' ? 'Do zrobienia' : 'Ukończone'}
                  <div className={cn("w-1.5 h-1.5 rounded-full transition-all", filter === f ? "bg-indigo-500 scale-125" : "bg-transparent")} />
                </button>
              ))}
           </div>

           <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Szukaj..." 
                className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none font-extrabold text-lg transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>

           <Button variant="primary" className="w-full py-5 text-base" onClick={() => setIsAdding(true)}>
             <Plus size={24} className="mr-3" /> Nowe zadanie
           </Button>
        </div>

        <div className="flex-1 w-full space-y-4">
           <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? filteredTasks.map((task, idx) => (
              <motion.div 
                layout
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={cn(
                    "flex items-center gap-6 p-7 border-none shadow-[0_4px_24px_-8px_rgba(0,0,0,0.03)] cursor-pointer group hover:bg-indigo-50/30 transition-all duration-500",
                    task.completed && "opacity-60 bg-gray-50/50"
                  )}
                  onClick={() => toggleTask(task)}
                >
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-3xl border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm shrink-0",
                    task.completed ? "bg-[#1d1d1f] border-[#1d1d1f] text-white" : "bg-white border-gray-100 group-hover:border-indigo-600"
                  )}>
                    {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} className="text-gray-100" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-xl md:text-2xl font-black tracking-tighter truncate transition-all duration-500",
                      task.completed ? "line-through text-gray-400" : "text-[#1d1d1f]"
                    )}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 overflow-x-auto scrollbar-hide">
                       <Badge className="shrink-0" variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'primary' : 'success'}>
                         {task.priority === 'high' ? 'Wysoki' : task.priority === 'medium' ? 'Średni' : 'Niski'}
                       </Badge>
                       <div className="flex items-center gap-1 text-gray-300 shrink-0">
                          <Clock size={12} />
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {format(task.createdAt?.toDate?.() || new Date(), 'd MMM', { locale: pl })}
                          </span>
                       </div>
                    </div>
                  </div>

                  <div className="flex md:opacity-0 group-hover:opacity-100 transition-all items-center gap-2">
                    {!task.completed && (
                       <IconButton 
                        icon={aiLoadingTaskId === task.id ? Loader2 : BrainCircuit} 
                        disabled={aiLoadingTaskId === task.id}
                        onClick={(e) => { e.stopPropagation(); handleAiBreakdown(task); }} 
                        className={cn(
                          "p-3 md:p-4 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 border border-indigo-100",
                          aiLoadingTaskId === task.id && "animate-spin"
                        )} 
                      />
                    )}
                    <IconButton 
                      icon={Trash2} 
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                      className="p-3 md:p-4 bg-gray-50/50 hover:bg-rose-50 hover:text-rose-600 text-gray-200" 
                    />
                  </div>
                </Card>
              </motion.div>
            )) : (
              <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                 <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                    <Search size={48} />
                 </div>
                 <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Brak zadań</h4>
                 <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Nie znaleźliśmy niczego, co pasowałoby do Twoich obecnych filtrów.</p>
                 <Button variant="secondary" className="mt-10" onClick={() => { setFilter('all'); setSearch(''); }}>Wyczyść wszystkie filtry</Button>
              </div>
            )}
           </AnimatePresence>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowe zadanie">
        <form onSubmit={addTask} className="space-y-12">
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2">Opisz zadanie</label>
             <textarea 
               autoFocus
               placeholder="Np. Napisać raport miesięczny..." 
               className="w-full bg-gray-50 p-8 rounded-[2.5rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-3xl outline-none transition-all min-h-[160px] resize-none leading-tight" 
               value={newTaskTitle} 
               onChange={(e) => setNewTaskTitle(e.target.value)} 
               required
             />
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-2 text-center block">Ustaw Priorytet</label>
              <div className="grid grid-cols-3 gap-3">
                 {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                   <button
                     key={p}
                     type="button"
                     onClick={() => { setPriority(p); hapticFeedback('light'); }}
                     className={cn(
                       "py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
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

           <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="py-6" onClick={() => setIsAdding(false)}>Anuluj</Button>
              <Button type="submit" className="py-6 shadow-indigo-500/40">Utwórz zadanie</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
