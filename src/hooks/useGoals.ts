import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function useGoals() {
  const { user } = useAuth();
  const [goalsCount, setGoalsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoalsCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoalsCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { goalsCount, loading };
}
