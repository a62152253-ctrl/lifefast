import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface WeekStats {
  completedThisWeek: number;
  totalThisWeek: number;
  progressPercentage: number;
}

export function useWeekStats() {
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWeekStats(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'weekStats', user.uid);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setWeekStats(doc.data() as WeekStats);
      } else {
        // Default stats
        setWeekStats({
          completedThisWeek: 0,
          totalThisWeek: 0,
          progressPercentage: 0
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { weekStats, loading };
}
