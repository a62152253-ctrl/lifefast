import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  userId: string;
  createdAt: Date;
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Process data asynchronously to avoid blocking UI
      requestAnimationFrame(() => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];
        setTasks(tasksData);
        setLoading(false);
      });
    }, (error) => {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const taskRef = collection(db, 'tasks');
      await addDoc(taskRef, {
        ...taskData,
        userId: user.uid,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }, [user]);

  return { tasks, loading, addTask };
}
