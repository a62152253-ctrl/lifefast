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
    return false;
  }

  const chatId = [user.uid, toUid].sort().join('_');

  try {
    await addDoc(collection(db, 'messages'), {
      fromUid: user.uid,
      toUid,
      chatId,
      content: content.trim(),
      timestamp: serverTimestamp(),
      read: false,
      type: 'text'
    });
    return true;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    } catch {
      // handleFirestoreError always rethrows
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
    return () => {};
  }

  const chatId = [user.uid, partnerUid].sort().join('_');

  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
    callback(messages.reverse());
  }, () => {});
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
    const updatePromises = snapshot.docs.map(snapshotDoc => 
      updateDoc(doc(db, 'messages', snapshotDoc.id), { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'messages');
  }
}
