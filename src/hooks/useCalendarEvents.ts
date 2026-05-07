import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  userId: string;
  createdAt: Date;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCalendarEvents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'calendarEvents'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      setCalendarEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { calendarEvents, loading };
}
