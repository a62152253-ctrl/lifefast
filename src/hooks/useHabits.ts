import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  streak?: number;
  completions?: Record<string, boolean>;
  userId: string;
  createdAt: Date;
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Process data asynchronously to avoid blocking UI
      requestAnimationFrame(() => {
        const habitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Habit[];
        setHabits(habitsData);
        setLoading(false);
      });
    }, (error) => {
      console.error('Error fetching habits:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addHabit = useCallback(async (habitData: Omit<Habit, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const habitRef = collection(db, 'habits');
      await addDoc(habitRef, {
        ...habitData,
        userId: user.uid,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error adding habit:', error);
      throw error;
    }
  }, [user]);

  return { habits, loading, addHabit };
}
