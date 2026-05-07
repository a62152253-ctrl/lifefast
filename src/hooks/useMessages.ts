import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  content: string;
  sender: string;
  senderId: string;
  createdAt: any;
}

export function useMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    await addDoc(collection(db, 'messages'), {
      content: content.trim(),
      sender: user.displayName || 'Użytkownik',
      senderId: user.uid,
      participants: [user.uid], // Would include partner ID in real implementation
      createdAt: serverTimestamp()
    });
  }, [user]);

  return { messages, loading, sendMessage };
}
