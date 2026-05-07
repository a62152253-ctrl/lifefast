import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function useNotes() {
  const { user } = useAuth();
  const [notesCount, setNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotesCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotesCount(snapshot.size);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { notesCount, loading };
}
