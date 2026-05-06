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
  orderBy,
  limit
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
    // Early return if user is not available
    if (!user) {
      console.log('👤 No user provided - skipping partner profile fetch');
      return;
    }

    console.log(`🔍 Fetching partner profile for user: ${user.uid}`);

    const userDocRef = doc(db, 'userProfiles', user.uid);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            const partnerId = profileData.partnerUid || null;
            
            setPartnerUid(partnerId);
            
            if (partnerId) {
              console.log(`👫 Partner found: ${partnerId}`);
            } else {
              console.log('🔓 No partner assigned to user');
            }
          } else {
            console.log('📝 User profile does not exist - creating default state');
            setPartnerUid(null);
          }
        } catch (error) {
          console.error('❌ Error processing partner profile data:', error);
          setPartnerUid(null);
        }
      },
      (error) => {
        console.error('❌ Error fetching partner profile:', error);
        handleFirestoreError(error, OperationType.LIST, 'userProfiles');
        setPartnerUid(null);
      }
    );

    // Cleanup function
    return () => {
      console.log('🔄 Unsubscribing from partner profile updates');
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    // Early return if user is not available
    if (!user) {
      console.log('👤 No user provided - skipping tasks fetch');
      return;
    }

    console.log(`📋 Fetching tasks for user: ${user.uid}${partnerUid ? ` + partner: ${partnerUid}` : ''}`);

    // Build array of user IDs (user + partner if exists)
    const userIds = [user.uid];
    if (partnerUid) {
      userIds.push(partnerUid);
    }

    const tasksQuery = query(
      collection(db, 'tasks'), 
      where('userId', 'in', userIds),
      orderBy('createdAt', 'desc'),
      limit(200) // Prevent excessive data loading
    );
    
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        try {
          const tasks = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            // Validate task structure
            if (!data.title || typeof data.title !== 'string') {
              console.warn('⚠️ Invalid task title:', doc.id, data.title);
              return null;
            }

            // Validate priority
            if (!['low', 'medium', 'high'].includes(data.priority)) {
              console.warn('⚠️ Invalid task priority:', doc.id, data.priority);
              return null;
            }

            // Validate completed is boolean
            if (typeof data.completed !== 'boolean') {
              console.warn('⚠️ Invalid task completed status:', doc.id, data.completed);
              return null;
            }

            return {
              id: doc.id,
              title: String(data.title).trim(),
              completed: Boolean(data.completed),
              priority: data.priority || 'medium',
              userId: data.userId,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              completedAt: data.completedAt,
              // Additional metadata if present
              titleLength: data.titleLength,
              wordCount: data.wordCount,
              parentTaskId: data.parentTaskId
            };
          }).filter(Boolean); // Remove null entries

          setTasks(tasks);
          console.log(`📋 Loaded ${tasks.length} valid tasks`);
          
        } catch (error) {
          console.error('❌ Error processing tasks data:', error);
          setTasks([]);
        }
      },
      (error) => {
        console.error('❌ Error fetching tasks:', error);
        handleFirestoreError(error, OperationType.LIST, 'tasks');
        setTasks([]);
      }
    );

    // Cleanup function
    return () => {
      console.log('🔄 Unsubscribing from tasks updates');
      unsubscribe();
    };
  }, [user, partnerUid]);

  const addTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Enhanced validation and sanitization
    const sanitizedTitle = newTaskTitle.trim().replace(/\s+/g, ' ');
    
    if (!sanitizedTitle || !user) {
      hapticFeedback('heavy');
      return;
    }

    // Validate title length
    if (sanitizedTitle.length < 2) {
      hapticFeedback('heavy');
      console.error('❌ Tytuł zadania jest zbyt krótki (minimum 2 znaki)');
      return;
    }

    if (sanitizedTitle.length > 200) {
      hapticFeedback('heavy');
      console.error('❌ Tytuł zadania jest zbyt długi (maksimum 200 znaków)');
      return;
    }

    // Check for duplicates (case-insensitive)
    const existingTask = tasks.find(t => 
      t.title.toLowerCase().trim() === sanitizedTitle.toLowerCase() && 
      !t.completed
    );
    
    if (existingTask) {
      hapticFeedback('heavy');
      console.error('❌ Takie zadanie już istnieje');
      return;
    }

    try {
      const taskData = {
        title: sanitizedTitle,
        completed: false,
        priority,
        userId: user.uid,
        createdAt: serverTimestamp(),
        // Add metadata for better tracking
        titleLength: sanitizedTitle.length,
        wordCount: sanitizedTitle.split(' ').length
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      // Reset form and UI state
      setNewTaskTitle('');
      setPriority('medium');
      setIsAdding(false);
      
      hapticFeedback('medium');
      console.log('✅ Zadanie dodane pomyślnie');
      
    } catch (error) {
      hapticFeedback('heavy');
      console.error('❌ Błąd dodawania zadania:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Wystąpił błąd podczas dodawania zadania';
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Brak uprawnień do dodawania zadań';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Serwis jest chwilowo niedostępny. Spróbuj ponownie';
        } else if (error.message.includes('deadline-exceeded')) {
          errorMessage = 'Przekroczono czas oczekiwania. Spróbuj ponownie';
        } else {
          errorMessage = `Błąd: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTask = async (task: any) => {
    // Validation
    if (!task || !task.id) {
      hapticFeedback('heavy');
      console.error('❌ Invalid task provided to toggleTask');
      return;
    }

    // Optimistic update - update UI immediately
    const originalCompleted = task.completed;
    const newCompleted = !originalCompleted;
    
    // Update local state optimistically
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === task.id ? { ...t, completed: newCompleted } : t
      )
    );

    // Provide immediate feedback
    hapticFeedback('medium');
    console.log(`🔄 Task ${task.id} toggled to ${newCompleted ? 'completed' : 'active'} (optimistic)`);

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'tasks', task.id), { 
        completed: newCompleted,
        updatedAt: serverTimestamp(),
        completedAt: newCompleted ? serverTimestamp() : null
      });
      
      console.log(`✅ Task ${task.id} successfully updated in database`);
      
    } catch (error) {
      // Rollback optimistic update on error
      hapticFeedback('heavy');
      console.error('❌ Failed to toggle task:', error);
      
      // Revert to original state
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id ? { ...t, completed: originalCompleted } : t
        )
      );
      
      console.log(`🔄 Task ${task.id} rolled back to ${originalCompleted ? 'completed' : 'active'}`);
      
      // Show user-friendly error
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    // Validation
    if (!id || typeof id !== 'string') {
      hapticFeedback('heavy');
      console.error('❌ Invalid task ID provided to deleteTask');
      return;
    }

    // Find the task to get its title for confirmation
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) {
      hapticFeedback('heavy');
      console.error('❌ Task not found for deletion:', id);
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć zadanie "${taskToDelete.title}"?`
    );
    
    if (!confirmed) {
      hapticFeedback('light');
      console.log('🚫 Task deletion cancelled by user');
      return;
    }

    // Optimistic update - remove from UI immediately
    const originalTask = taskToDelete;
    setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
    
    hapticFeedback('heavy');
    console.log(`🗑️ Task "${originalTask.title}" removed from UI (optimistic)`);

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'tasks', id));
      
      console.log(`✅ Task "${originalTask.title}" successfully deleted from database`);
      
    } catch (error) {
      // Rollback optimistic update on error
      hapticFeedback('heavy');
      console.error('❌ Failed to delete task:', error);
      
      // Restore the task to the list
      setTasks(prevTasks => [...prevTasks, originalTask]);
      
      console.log(`🔄 Task "${originalTask.title}" restored due to deletion error`);
      
      // Show user-friendly error
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleAiBreakdown = async (task: any) => {
    // Walidacja wejściowa
    if (!task.title || task.title.trim().length < 3) {
      hapticFeedback('heavy');
      return;
    }

    // Sprawdzenie czy nie jest już w trakcie przetwarzania
    if (aiLoadingTaskId === task.id) return;

    setAiLoadingTaskId(task.id);
    hapticFeedback('medium');
    
    try {
      const steps = await brainstormTaskBreakdown(task.title);
      
      // Walidacja wyniku AI
      if (!steps || steps.length === 0) {
        throw new Error('AI nie mogło wygenerować kroków dla tego zadania');
      }

      if (steps.length > 10) {
        throw new Error('Zbyt wiele kroków wygenerowanych. Spróbuj uprościć zadanie.');
      }

      // Batch create tasks for better performance
      const taskPromises = steps.map((step) => 
        addDoc(collection(db, 'tasks'), {
          title: `[${task.title}] ${step}`,
          completed: false,
          priority: 'low',
          userId: user?.uid,
          createdAt: serverTimestamp(),
          parentTaskId: task.id
        })
      );

      await Promise.all(taskPromises);
      
      hapticFeedback('heavy');
      // Success feedback - można zastąpić toast notification
      console.log(`✅ AI pomyślnie rozbiło zadanie na ${steps.length} kroków`);
      
    } catch (error) {
      console.error('❌ Błąd podczas rozbijania zadania:', error);
      hapticFeedback('heavy');
      
      // User-friendly error handling
      const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd';
      
      // Można tu dodać toast notification zamiast alert
      console.error(`Błąd: ${errorMessage}`);
      
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
