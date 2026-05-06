import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc,
  getDocs,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './db';

export interface Invite {
  id: string;
  fromUid: string;
  fromEmail: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  partnerUid?: string;
  partnerEmail?: string;
  settings?: {
    notifications: {
      push: boolean;
      habits: boolean;
      shopping: boolean;
      plans: boolean;
    }
  }
}

export const DEFAULT_SETTINGS = {
  notifications: {
    push: true,
    habits: true,
    shopping: true,
    plans: true
  }
};

export async function updateUserSettings(settings: Partial<UserProfile['settings']>) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const profileRef = doc(db, 'userProfiles', user.uid);
    await setDoc(profileRef, {
      settings
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'userProfiles');
  }
}

export async function sendInvite(toEmail: string) {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  try {
    // Check if user already has a partner
    const profileRef = doc(db, 'userProfiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists() && profileSnap.data().partnerUid) {
      throw new Error('Już masz połączone konto.');
    }

    await addDoc(collection(db, 'invites'), {
      fromUid: user.uid,
      fromEmail: user.email,
      toEmail: toEmail.toLowerCase().trim(),
      status: 'pending',
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'invites');
  }
}

export async function acceptInvite(invite: Invite) {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  try {
    // 1. Update invite status
    await updateDoc(doc(db, 'invites', invite.id), {
      status: 'accepted'
    });

    // 2. Update both user profiles
    const myProfileRef = doc(db, 'userProfiles', user.uid);
    const partnerProfileRef = doc(db, 'userProfiles', invite.fromUid);

    await setDoc(myProfileRef, {
      uid: user.uid,
      email: user.email,
      partnerUid: invite.fromUid,
      partnerEmail: invite.fromEmail
    }, { merge: true });

    await setDoc(partnerProfileRef, {
      partnerUid: user.uid,
      partnerEmail: user.email
    }, { merge: true });

    // 3. Delete the invite (clean up)
    await deleteDoc(doc(db, 'invites', invite.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'invites');
  }
}

export async function rejectInvite(inviteId: string) {
  try {
    await deleteDoc(doc(db, 'invites', inviteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'invites');
  }
}

export async function disconnectPartner() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const profileRef = doc(db, 'userProfiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const partnerUid = profileSnap.data().partnerUid;
      
      // Update my profile
      await updateDoc(profileRef, {
        partnerUid: null,
        partnerEmail: null
      });

      // Update partner profile if exists
      if (partnerUid) {
        await updateDoc(doc(db, 'userProfiles', partnerUid), {
          partnerUid: null,
          partnerEmail: null
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'userProfiles');
  }
}
