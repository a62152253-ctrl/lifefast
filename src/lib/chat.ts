import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './db';

export interface ChatMessage {
  id: string;
  fromUid: string;
  toUid: string;
  chatId: string;
  content: string;
  timestamp: any;
  read: boolean;
  type: 'text' | 'system';
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: any;
    fromUid: string;
  };
  createdAt: any;
}

export async function sendMessage(content: string, toUid: string) {
  const user = auth.currentUser;
  if (!user || !content.trim()) {
    console.error('sendMessage: No user or empty content');
    return false;
  }

  // Create chat ID for consistent routing
  const chatId = [user.uid, toUid].sort().join('_');
  console.log('Sending message:', { fromUid: user.uid, toUid, chatId, content: content.trim() });

  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      fromUid: user.uid,
      toUid,
      chatId,
      content: content.trim(),
      timestamp: serverTimestamp(),
      read: false,
      type: 'text'
    });
    
    console.log('Message sent successfully with ID:', docRef.id);
    return true;
  } catch (err) {
    console.error('Failed to send message:', err);
    try {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } catch (handledErr) {
      // handleFirestoreError throws, so we catch and log it
      console.error('Handled Firestore error:', handledErr);
    }
    return false;
  }
}

export async function markMessageAsRead(messageId: string) {
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      read: true
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'messages');
  }
}

export function subscribeToChat(partnerUid: string, callback: (messages: ChatMessage[]) => void) {
  const user = auth.currentUser;
  if (!user || !partnerUid) {
    console.error('subscribeToChat: No user or partnerUid');
    return () => {};
  }

  console.log('Setting up chat subscription for:', { userUid: user.uid, partnerUid });

  // Simple approach: Create a chat room ID and query by that
  const chatId = [user.uid, partnerUid].sort().join('_');
  console.log('Using chatId:', chatId);

  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    console.log('Chat snapshot received:', snap.docs.length, 'messages');
    const messages = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as ChatMessage));
    callback(messages.reverse());
  }, (error) => {
    console.error('Chat subscription error:', error);
  });
}

export async function markAllMessagesAsRead(partnerUid: string) {
  const user = auth.currentUser;
  if (!user || !partnerUid) return;

  try {
    const q = query(
      collection(db, 'messages'),
      where('fromUid', '==', partnerUid),
      where('toUid', '==', user.uid),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'messages');
  }
}
