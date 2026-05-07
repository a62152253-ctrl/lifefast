import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface BudgetItem {
  id: string;
  amount: number;
  category: string;
  description: string;
  userId: string;
  createdAt: Date;
}

export function useBudget() {
  const { user } = useAuth();
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBudgetTotal(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'budget'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Process data asynchronously to avoid blocking UI
      requestAnimationFrame(() => {
        const budgetData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BudgetItem[];
        
        const total = budgetData.reduce((sum, item) => sum + item.amount, 0);
        setBudgetTotal(total);
        setLoading(false);
      });
    }, (error) => {
      console.error('Error fetching budget:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addBudgetItem = useCallback(async (itemData: Omit<BudgetItem, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const budgetRef = collection(db, 'budget');
      await addDoc(budgetRef, {
        ...itemData,
        userId: user.uid,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error adding budget item:', error);
      throw error;
    }
  }, [user]);

  return { budgetTotal, loading, addBudgetItem };
}
