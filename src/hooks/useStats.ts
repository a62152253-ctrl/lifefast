import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface Stats {
  xp: number;
  level: number;
  xpToNextLevel: number;
  tasksCompleted: number;
  habitsCompleted: number;
  streak: number;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'stats', user.uid);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as Stats);
      } else {
        // Default stats
        setStats({
          xp: 0,
          level: 1,
          xpToNextLevel: 1000,
          tasksCompleted: 0,
          habitsCompleted: 0,
          streak: 0
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { stats, loading };
}
