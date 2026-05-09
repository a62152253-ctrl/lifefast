import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { differenceInDays, startOfDay } from 'date-fns';
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
  updatedAt?: Timestamp | Date;
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
  priorities?: Array<'low' | 'medium' | 'high'>;
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
  difficulty?: Array<'easy' | 'medium' | 'hard'>;
  location?: string;
}

type NewTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

function toDateValue(value: Timestamp | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Timestamp ? value.toDate() : value;
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

  const handleError = useCallback(
    (err: unknown, operation: string) => {
      const message =
        err instanceof Error ? err.message : `Wystąpił błąd podczas ${operation}.`;
      setError(message);

      if (!isOffline) {
        showToast({
          type: 'error',
          message,
        });
      }
    },
    [isOffline, showToast],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(500),
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const nextTasks = snapshot.docs
          .map((taskDoc) => {
            const data = taskDoc.data();

            if (!data.title || typeof data.title !== 'string') {
              return null;
            }

            return {
              id: taskDoc.id,
              title: data.title.trim(),
              completed: Boolean(data.completed),
              dueDate: typeof data.dueDate === 'string' ? data.dueDate : undefined,
              category: typeof data.category === 'string' ? data.category : 'other',
              priority:
                data.priority === 'low' || data.priority === 'medium' || data.priority === 'high'
                  ? data.priority
                  : 'medium',
              userId: typeof data.userId === 'string' ? data.userId : user.uid,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt : new Date(),
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
              completedAt:
                data.completedAt instanceof Timestamp || data.completedAt instanceof Date
                  ? data.completedAt
                  : null,
              parentTaskId: typeof data.parentTaskId === 'string' ? data.parentTaskId : undefined,
              tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown) => typeof tag === 'string') : [],
              estimatedTime: typeof data.estimatedTime === 'number' ? data.estimatedTime : undefined,
              actualTime: typeof data.actualTime === 'number' ? data.actualTime : undefined,
              notes: typeof data.notes === 'string' ? data.notes : undefined,
              recurring: Boolean(data.recurring),
              recurringPattern:
                data.recurringPattern === 'daily' ||
                data.recurringPattern === 'weekly' ||
                data.recurringPattern === 'monthly'
                  ? data.recurringPattern
                  : undefined,
              subtasks: Array.isArray(data.subtasks)
                ? data.subtasks.filter((subtask: unknown) => typeof subtask === 'string')
                : [],
              attachments: Array.isArray(data.attachments)
                ? data.attachments.filter((attachment: unknown) => typeof attachment === 'string')
                : [],
              location: typeof data.location === 'string' ? data.location : undefined,
              weatherDependent: Boolean(data.weatherDependent),
              energyRequired: typeof data.energyRequired === 'number' ? data.energyRequired : undefined,
              difficulty:
                data.difficulty === 'easy' || data.difficulty === 'medium' || data.difficulty === 'hard'
                  ? data.difficulty
                  : 'medium',
            } satisfies Task;
          })
          .filter((task): task is Task => task !== null);

        setTasks(nextTasks);
        setLoading(false);
      },
      (err) => {
        handleError(err, 'pobierania zadań');
        setTasks([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [handleError, user]);

  const addTask = useCallback(
    async (taskData: NewTaskInput) => {
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany.');
      }

      if (isOffline) {
        throw new Error('Nie można dodać zadania w trybie offline.');
      }

      if (!taskData.title.trim()) {
        throw new Error('Tytuł zadania jest wymagany.');
      }

      if (taskData.estimatedTime !== undefined && (taskData.estimatedTime < 0 || taskData.estimatedTime > 1000)) {
        throw new Error('Szacowany czas musi mieścić się w zakresie 0-1000.');
      }

      await addDoc(collection(db, 'tasks'), {
        ...taskData,
        title: taskData.title.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast({
        type: 'success',
        message: 'Zadanie zostało dodane.',
      });
    },
    [isOffline, showToast, user],
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany.');
      }

      if (isOffline) {
        throw new Error('Nie można zaktualizować zadania w trybie offline.');
      }

      if (updates.estimatedTime !== undefined && (updates.estimatedTime < 0 || updates.estimatedTime > 1000)) {
        throw new Error('Szacowany czas musi mieścić się w zakresie 0-1000.');
      }

      await updateDoc(doc(db, 'tasks', taskId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      showToast({
        type: 'success',
        message: 'Zadanie zostało zaktualizowane.',
      });
    },
    [isOffline, showToast, user],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany.');
      }

      if (isOffline) {
        throw new Error('Nie można usunąć zadania w trybie offline.');
      }

      await deleteDoc(doc(db, 'tasks', taskId));

      showToast({
        type: 'success',
        message: 'Zadanie zostało usunięte.',
      });
    },
    [isOffline, showToast, user],
  );

  const toggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!user) {
        throw new Error('Użytkownik nie jest zalogowany.');
      }

      if (isOffline) {
        showToast({
          type: 'offline',
          message: 'Nie można zaktualizować zadania w trybie offline.',
        });
        return;
      }

      await updateDoc(doc(db, 'tasks', taskId), {
        completed,
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    },
    [isOffline, showToast, user],
  );

  const analytics = useMemo<TaskAnalytics>(() => {
    const now = new Date();
    const today = startOfDay(now);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.completed);
    const pendingTasks = tasks.filter((task) => !task.completed);
    const overdueTasks = pendingTasks.filter((task) => {
      if (!task.dueDate) {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    });

    const tasksByCategory = tasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = task.category || 'other';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const tasksByPriority = tasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = task.priority || 'medium';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const tasksByDifficulty = tasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = task.difficulty || 'medium';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const completionDurations = completedTasks
      .map((task) => {
        const createdAt = toDateValue(task.createdAt);
        const completedAt = toDateValue(task.completedAt);

        if (!createdAt || !completedAt) {
          return null;
        }

        return Math.max(0, differenceInDays(completedAt, createdAt));
      })
      .filter((duration): duration is number => duration !== null);

    const totalTime = tasks.reduce((sum, task) => sum + (task.actualTime ?? task.estimatedTime ?? 0), 0);
    const sortedByTime = [...tasks]
      .map((task) => ({
        title: task.title,
        time: task.actualTime ?? task.estimatedTime ?? 0,
      }))
      .filter((task) => task.time > 0)
      .sort((left, right) => left.time - right.time);

    const completionRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      averageCompletionTime: completionDurations.length
        ? Math.round(completionDurations.reduce((sum, duration) => sum + duration, 0) / completionDurations.length)
        : 0,
      tasksByCategory,
      tasksByPriority,
      tasksByDifficulty,
      weeklyTrend: Array(7).fill(0),
      monthlyTrend: Array(12).fill(0),
      mostProductiveDay: 'Poniedziałek',
      averageTasksPerDay: totalTasks ? Math.round(totalTasks / 7) : 0,
      completionRate,
      efficiency: completionRate,
      streakDays: completedTasks.length ? 1 : 0,
      recurringTasksCount: tasks.filter((task) => task.recurring).length,
      timeTracking: {
        totalTime,
        averageTaskTime: totalTasks ? Math.round(totalTime / totalTasks) : 0,
        mostTimeConsumingTask: sortedByTime.at(-1)?.title ?? '',
        leastTimeConsumingTask: sortedByTime[0]?.title ?? '',
      },
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = filters.searchText?.trim().toLowerCase();

    const nextTasks = tasks.filter((task) => {
      const matchesStatus =
        !filters.status ||
        filters.status === 'all' ||
        (filters.status === 'active' && !task.completed) ||
        (filters.status === 'completed' && task.completed) ||
        (filters.status === 'overdue' &&
          !task.completed &&
          task.dueDate !== undefined &&
          new Date(task.dueDate) < new Date());

      const matchesCategory =
        !filters.categories?.length ||
        filters.categories.includes(task.category || 'other');

      const matchesPriority =
        !filters.priorities?.length ||
        filters.priorities.includes(task.priority || 'medium');

      const matchesTags =
        !filters.tags?.length ||
        filters.tags.some((tag) => task.tags?.includes(tag));

      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.notes?.toLowerCase().includes(normalizedSearch);

      const matchesDateRange =
        !filters.dateRange ||
        (() => {
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          if (!dueDate || Number.isNaN(dueDate.getTime())) {
            return false;
          }

          return dueDate >= filters.dateRange.start && dueDate <= filters.dateRange.end;
        })();

      const matchesSubtasks = !filters.hasSubtasks || Boolean(task.subtasks?.length);
      const matchesRecurring = !filters.isRecurring || Boolean(task.recurring);
      const matchesWeather = !filters.weatherDependent || Boolean(task.weatherDependent);
      const matchesDifficulty =
        !filters.difficulty?.length || filters.difficulty.includes(task.difficulty || 'medium');
      const matchesLocation =
        !filters.location ||
        (task.location ? task.location.toLowerCase().includes(filters.location.toLowerCase()) : false);

      return (
        matchesStatus &&
        matchesCategory &&
        matchesPriority &&
        matchesTags &&
        matchesSearch &&
        matchesDateRange &&
        matchesSubtasks &&
        matchesRecurring &&
        matchesWeather &&
        matchesDifficulty &&
        matchesLocation
      );
    });

    return nextTasks.sort((left, right) => {
      if (sortBy === 'name') {
        return left.title.localeCompare(right.title, 'pl');
      }

      if (sortBy === 'category') {
        return (left.category || '').localeCompare(right.category || '', 'pl');
      }

      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[left.priority || 'medium'] - priorityOrder[right.priority || 'medium'];
      }

      const leftDate = toDateValue(left.createdAt)?.getTime() ?? 0;
      const rightDate = toDateValue(right.createdAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    });
  }, [filters, sortBy, tasks]);

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
    clearError,
  };
}
