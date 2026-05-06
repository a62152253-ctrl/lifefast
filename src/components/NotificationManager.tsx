import React, { useEffect, useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, limit } from 'firebase/firestore';
import { Toast } from './CommonUI';
import { UserProfile, DEFAULT_SETTINGS } from '../lib/sharing';
import { format, isSameDay } from 'date-fns';

export const NotificationManager = () => {
  const [user] = useAuthState(auth);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Keep track of IDs we've already notified about to avoid duplicate alerts
  const notifiedIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!user) return;

    // 1. Monitor Profile & Settings
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });

    // 2. Monitor Shopping Items
    const qShopping = query(
      collection(db, 'shoppingItems'),
      where('checked', '==', false),
      limit(10)
    );
    const unsubShopping = onSnapshot(qShopping, (snap) => {
      if (!initialLoadDone.current) return;
      
      const settings = profile?.settings || DEFAULT_SETTINGS;
      if (!settings.notifications.shopping) return;

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const item = change.doc.data();
          // Only notify if someone else (partner) added it
          if (item.addedBy !== user.uid && !notifiedIds.current.has(change.doc.id)) {
            setToast({ 
              message: `Partner dodał "${item.name}" do listy zakupów!`, 
              type: 'info' 
            });
            notifiedIds.current.add(change.doc.id);
          }
        }
      });
    });

    // 3. Monitor Daily Plans (Temporal checks)
    const today = format(new Date(), 'yyyy-MM-dd');
    const qPlans = query(
      collection(db, 'plans'),
      where('date', '==', today)
    );
    
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      // For plans, we set up a timer system based on the fetched plans
      const settings = profile?.settings || DEFAULT_SETTINGS;
      if (!settings.notifications.plans) return;

      const plans = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const checkPlans = () => {
        const now = format(new Date(), 'HH:mm');
        plans.forEach(plan => {
          if (plan.time === now && !notifiedIds.current.has(`plan-${plan.id}-${now}`)) {
            setToast({ 
              message: `Czas na: ${plan.activity}!`, 
              type: 'warning' 
            });
            notifiedIds.current.add(`plan-${plan.id}-${now}`);
          }
        });
      };

      const interval = setInterval(checkPlans, 30000); // Check every 30s
      checkPlans(); // Check immediately
      return () => clearInterval(interval);
    });

    // Mark initial load as done after a short delay
    const timeout = setTimeout(() => {
      initialLoadDone.current = true;
    }, 2000);

    return () => {
      unsubProfile();
      unsubShopping();
      unsubPlans();
      clearTimeout(timeout);
    };
  }, [user, profile?.settings]);

  return (
    <Toast 
      isVisible={!!toast} 
      message={toast?.message || ''} 
      type={toast?.type} 
      onClose={() => setToast(null)} 
    />
  );
};
