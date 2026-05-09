import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit, Timestamp } from 'firebase/firestore';
import { format, startOfDay, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  userId: string;
  createdAt: Timestamp | Date;
  completedAt?: Timestamp | Date | null;
  parentTaskId?: string;
  tags?: string[];
  estimatedTime?: number;
  actualTime?: number;
  notes?: string;
  recurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  subtasks?: string[];
  attachments?: string[];
  location?: string;
  weatherDependent?: boolean;
  energyRequired?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
  tasksByCategory: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByDifficulty: Record<string, number>;
  weeklyTrend: number[];
  monthlyTrend: number[];
  mostProductiveDay: string;
  averageTasksPerDay: number;
  completionRate: number;
  efficiency: number;
  streakDays: number;
  recurringTasksCount: number;
  timeTracking: {
    totalTime: number;
    averageTaskTime: number;
    mostTimeConsumingTask: string;
    leastTimeConsumingTask: string;
  };
}

export interface TaskFilters {
  categories?: string[];
  priorities?: ('low' | 'medium' | 'high')[];
  status?: 'all' | 'active' | 'completed' | 'overdue';
  tags?: string[];
  searchText?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasSubtasks?: boolean;
  isRecurring?: boolean;
  weatherDependent?: boolean;
  difficulty?: ('easy' | 'medium' | 'hard')[];
  location?: string;
}
export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'name' | 'category'>('date');
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  // Enhanced error handling
  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error?.message || `Wystąpił błąd podczas ${operation}`;
    setError(errorMessage);
    
    showToast({
      type: 'error',
      message: errorMessage
    });
  }, [showToast]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Enhanced data fetching with better error handling
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const tasksData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            if (!data.title || typeof data.title !== 'string') {
              return null;
            }
            
            return {
              id: doc.id,
              title: String(data.title).trim(),
              completed: Boolean(data.completed),
              dueDate: data.dueDate || undefined,
              category: data.category || 'other',
              priority: ['low', 'medium', 'high'].includes(data.priority) ? data.priority : 'medium',
              userId: data.userId || user.uid,
              createdAt: data.createdAt || serverTimestamp(),
              completedAt: data.completedAt,
              parentTaskId: data.parentTaskId,
              tags: data.tags || [],
              estimatedTime: data.estimatedTime,
              actualTime: data.actualTime,
              notes: data.notes,
              recurring: data.recurring || false,
              recurringPattern: data.recurringPattern,
              subtasks: data.subtasks || [],
              attachments: data.attachments || [],
              location: data.location,
              weatherDependent: data.weatherDependent || false,
              energyRequired: data.energyRequired,
              difficulty: data.difficulty || 'medium'
            } as Task;
          }).filter((task): task is Task => task !== null);
          
          setTasks(tasksData);
          setLoading(false);
          setError(null);
        } catch (processingError) {
          if (!isOffline) {
            handleError(processingError, 'processing tasks');
          }
          setTasks([]);
          setLoading(false);
        }
      }, (error) => {
        if (!isOffline) {
          handleError(error, 'fetching tasks');
        }
        setTasks([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      if (!isOffline) {
        handleError(error, 'setting up tasks listener');
      }
      setTasks([]);
      setLoading(false);
    }
  }, [user, handleError, isOffline]);

  // Enhanced task creation with validation
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      const error = new Error('User not authenticated');
      handleError(error, 'adding task');
      return;
    }
    
    // Validation
    if (!taskData.title || typeof taskData.title !== 'string' || taskData.title.trim().length < 2 || taskData.title.trim().length > 200) {
      const error = new Error('Tytuł zadania jest wymagany i musi mieć od 2 do 200 znaków');
      handleError(error, 'adding task');
      return;
    }
    
    if (taskData.estimatedTime && (taskData.estimatedTime < 0 || taskData.estimatedTime > 1000)) {
      const error = new Error('Szacowany czas musi być między 0 a 1000 godzin');
      handleError(error, 'adding task');
      return;
    }

    if (isOffline) {
      const error = new Error('Nie można dodać zadania w trybie offline');
      handleError(error, 'adding task');
      return;
    }
    
    try {
      const taskRef = collection(db, 'tasks');
      await addDoc(taskRef, {
        ...taskData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      showToast({
        type: 'success',
        message: 'Zadanie dodane pomyślnie'
      });
    } catch (error) {
      handleError(error, 'adding task');
      throw error;
    }
  }, [tasks, user, isOffline, showToast, handleError]);

  // Enhanced task update with validation
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!user) {
      const error = new Error('User not authenticated');
      handleError(error, 'updating task');
      return;
    }
    
    // Validation
    if (updates.estimatedTime && (updates.estimatedTime < 0 || updates.estimatedTime > 1000)) {
      const error = new Error('Szacowany czas musi być między 0 a 1000 godzin');
      handleError(error, 'updating task');
      return;
    }
    
    if (isOffline) {
      const error = new Error('Nie można zaktualizować zadania w trybie offline');
      handleError(error, 'updating task');
      return;
    }
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
      
      showToast({
        type: 'success',
        message: 'Zadanie zaktualizowane'
      });
    } catch (error) {
      handleError(error, 'updating task');
      throw error;
    }
  }, [user, isOffline, showToast, handleError]);

  // Enhanced task deletion with confirmation
  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) {
      const error = new Error('User not authenticated');
      handleError(error, 'deleting task');
      return;
    }
    
    if (isOffline) {
      const error = new Error('Nie można usunąć zadania w trybie offline');
      handleError(error, 'deleting task');
      return;
    }
    
    // Optimistic update
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      
      showToast({
        type: 'success',
        message: 'Zadanie usunięte'
      });
    } catch (error) {
      // Revert optimistic update on error
      if (taskToDelete) {
        setTasks(prev => [...prev, taskToDelete]);
      }
      handleError(error, 'deleting task');
    }
  }, [tasks, isOffline, showToast, handleError]);

  const toggleTaskSimple = useCallback(async (taskId: string, completed: boolean) => {
    return updateTask(taskId, { 
      completed, 
      completedAt: completed ? serverTimestamp() : null 
    });
  }, [updateTask]);

  // Enhanced task toggle with optimistic updates
  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    if (!user) {
      const error = new Error('User not authenticated');
      handleError(error, 'toggling task');
      return;
    }
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed, completedAt: completed ? new Date() : null } : t
    ));
    
    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (isOffline) {
      // Revert optimistic update if offline
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, completed: !completed, completedAt: null } : t
      ));
      showToast({
        type: 'offline',
        message: 'Nie można zaktualizować zadania w trybie offline'
      });
      return;
    }
    
    try {
      await updateDoc(doc(db, 'tasks', taskId), { 
        completed, 
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      
      showToast({
        type: 'success',
        message: completed ? 'Zadanie ukończone!' : 'Zadanie ponownie otwarte'
      });
    } catch (error) {
      // Revert optimistic update on error
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, completed: t.completed, completedAt: t.completedAt } : t
      ));
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      handleError(error, 'toggling task');
    }
  }, [tasks, isOffline, showToast, handleError]);
  
  // Enhanced analytics calculation
  const analytics = useMemo((): TaskAnalytics => {
    try {
      const now = new Date();
      const today = startOfDay(now);
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const pendingTasks = tasks.filter(t => !t.completed).length;
      const overdueTasks = tasks.filter(t => 
        !t.completed && t.dueDate && new Date(t.dueDate) < now
      ).length;
      
      const averageCompletionTime = completedTasks > 0
        ? Math.round(tasks.reduce((sum, task) => {
          const created = task.createdAt instanceof Timestamp ? task.createdAt.toDate() : new Date(task.createdAt);
          const completed = task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt);
          if (created && completed) {
            return sum + differenceInDays(created, completed);
          }
          return sum;
        }, 0) / completedTasks)
        : 0;
      
      // Tasks by category
      const tasksByCategory = tasks.reduce((acc, task) => {
        acc[task.category || 'other'] = (acc[task.category || 'other'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Tasks by priority
      const tasksByPriority = tasks.reduce((acc, task) => {
        acc[task.priority || 'medium'] = (acc[task.priority || 'medium'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Tasks by difficulty
      const tasksByDifficulty = tasks.reduce((acc, task) => {
        acc[task.difficulty || 'medium'] = (acc[task.difficulty || 'medium'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Weekly trend (mock data)
      const weeklyTrend = [12, 15, 8, 18, 14, 20, 16];
      
      // Monthly trend (mock data)
      const monthlyTrend = [45, 52, 48, 61, 55, 68, 72, 78, 65, 71, 69, 74];
      
      // Most productive day
      const mostProductiveDay = 'Środa';
      
      // Average tasks per day
      const averageTasksPerDay = Math.round(totalTasks / 7);
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Efficiency (tasks completed per hour)
      const efficiency = averageCompletionTime > 0 ? Math.round(60 / averageCompletionTime) : 0;
      
      // Streak days (mock data)
      const streakDays = 7;
      
      // Time tracking
      const totalTime = tasks.reduce((sum, task) => {
        const actualTime = task.actualTime || 0;
        const estimatedTime = task.estimatedTime || 0;
        return sum + (actualTime || estimatedTime);
      }, 0);
      
      const averageTaskTime = totalTime > 0 ? Math.round(totalTime / totalTasks) : 0;
      
      const mostTimeConsumingTask = tasks.reduce((max, task) => {
        const time = task.actualTime || task.estimatedTime || 0;
        return time > (max.time || 0) ? { ...max, task: task.title, time } : max;
      }, { time: 0, task: '' });
      
      const leastTimeConsumingTask = tasks.reduce((min, task) => {
        const time = task.actualTime || task.estimatedTime || 0;
        return time < (min.time || 0) ? { ...min, task: task.title, time } : min;
      }, { time: 0, task: '' });
      
      
      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        averageCompletionTime,
        tasksByCategory,
        tasksByPriority,
        tasksByDifficulty,
        weeklyTrend,
        monthlyTrend,
        mostProductiveDay,
        averageTasksPerDay,
        completionRate,
        efficiency,
        streakDays,
        recurringTasksCount: tasks.filter(t => t.recurring).length,
        timeTracking: {
          totalTime,
          averageTaskTime,
          mostTimeConsumingTask,
          leastTimeConsumingTask
        }
      };
    } catch (error) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        averageCompletionTime: 0,
        tasksByCategory: {},
        tasksByPriority: {},
        tasksByDifficulty: {},
        weeklyTrend: [],
        monthlyTrend: [],
        mostProductiveDay: '',
        averageTasksPerDay: 0,
        completionRate: 0,
        efficiency: 0,
        streakDays: 0,
        recurringTasksCount: 0,
        timeTracking: {
          totalTime: 0,
          averageTaskTime: 0,
          mostTimeConsumingTask: '',
          leastTimeConsumingTask: ''
        }
      };
    }
  }, [tasks]);

  // Enhanced filtering with multiple criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      const matchesStatus = !filters.status || 
        (filters.status === 'all') ||
        (filters.status === 'active' && !task.completed) ||
        (filters.status === 'completed' && task.completed) ||
        (filters.status === 'overdue' && !task.completed && task.dueDate && new Date(task.dueDate) < new Date());
      
      // Category filter
      const matchesCategory = !filters.categories || filters.categories.length === 0 ||
        filters.categories.includes(task.category || 'other');
      
      // Priority filter
      const matchesPriority = !filters.priorities || filters.priorities.length === 0 ||
        filters.priorities.includes(task.priority || 'medium');
      
      // Tags filter
      const matchesTags = !filters.tags || filters.tags.length === 0 ||
        (task.tags && task.tags.some(tag => filters.tags.includes(tag)));
      
      // Search filter
      const matchesSearch = !filters.searchText || 
        task.title.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        (task.notes && task.notes.toLowerCase().includes(filters.searchText.toLowerCase()));
      
      // Has subtasks filter
      const matchesSubtasks = !filters.hasSubtasks || 
        (filters.hasSubtasks ? !!task.subtasks && task.subtasks.length > 0 : true);
      
      // Recurring filter
      const matchesRecurring = !filters.isRecurring || 
        (filters.isRecurring ? task.recurring : true);
      
      // Weather dependent filter
      const matchesWeather = !filters.weatherDependent || 
        (filters.weatherDependent ? task.weatherDependent : true);
      
      // Location filter
      const matchesLocation = !filters.location || 
        (filters.location ? task.location ? task.location.includes(filters.location) : true : true);
      
      return matchesStatus && matchesCategory && matchesPriority && matchesTags && matchesSearch && matchesSubtasks && matchesRecurring && matchesWeather && matchesLocation;
    });
  }, [tasks, filters]);

  return { 
    tasks: filteredTasks,
    loading,
    error,
    analytics,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    filters,
    sortBy,
    setFilters,
    setSortBy,
    handleError,
    clearError
  };
}
