import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';

export function useAdmin() {
  const [user, authLoading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'userProfiles', user.uid));
        setIsAdmin(profileSnap.exists() && profileSnap.data()?.role === 'admin');
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading };
}
