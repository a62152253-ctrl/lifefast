import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { format, startOfMonth, subMonths } from 'date-fns';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface BudgetItem {
  id: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  userId: string;
  date: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  tags?: string[];
  isRecurring?: boolean;
  recurringPeriod?: 'weekly' | 'monthly' | 'yearly';
}

export interface BudgetAnalytics {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  averageDailySpending: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  monthlyTrend: number[];
  budgetLimit?: number;
  remainingBudget?: number;
}

export interface BudgetFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  types?: ('income' | 'expense')[];
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
}

function toBudgetDate(value: Timestamp | Date): Date {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

export function useBudget() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  // Enhanced error handling
  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error?.message || `Wystąpił błąd podczas ${operation}`;
    setError(errorMessage);
    
    if (!isOffline) {
      showToast({
        type: 'error',
        message: errorMessage
      });
    }
  }, [showToast, isOffline]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Enhanced data fetching with better error handling
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'budget'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(500)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const transactionsData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            if (!data.description || typeof data.amount !== 'number' || !data.type) {
              return null;
            }

            return {
              id: doc.id,
              description: String(data.description).trim(),
              amount: Number(data.amount),
              type: data.type as 'income' | 'expense',
              category: data.category || 'Inne',
              userId: data.userId || user.uid,
              date: data.date || data.createdAt || serverTimestamp(),
              createdAt: data.createdAt || serverTimestamp(),
              updatedAt: data.updatedAt,
              tags: data.tags || [],
              isRecurring: data.isRecurring || false,
              recurringPeriod: data.recurringPeriod
            } as BudgetItem;
          }).filter((transaction): transaction is BudgetItem => transaction !== null);
          
          setTransactions(transactionsData);
          setLoading(false);
          setError(null);
        } catch (processingError) {
          handleError(processingError, 'processing budget transactions');
          setTransactions([]);
          setLoading(false);
        }
      }, (error) => {
        handleError(error, 'fetching budget transactions');
        setTransactions([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      handleError(error, 'setting up budget listener');
      setTransactions([]);
      setLoading(false);
    }
  }, [user, handleError]);

  // Enhanced add budget item with validation
  const addBudgetItem = useCallback(async (itemData: Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      const error = new Error('Użytkownik nie jest zalogowany');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    if (isOffline) {
      const error = new Error('Nie można dodać transakcji w trybie offline');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    // Validation
    if (!itemData.description?.trim()) {
      const error = new Error('Opis jest wymagany');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    if (typeof itemData.amount !== 'number' || itemData.amount <= 0) {
      const error = new Error('Kwota musi być dodatnią liczbą');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    if (itemData.amount > 1000000) {
      const error = new Error('Kwota przekracza dopuszczalny limit');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    if (!['income', 'expense'].includes(itemData.type)) {
      const error = new Error('Typ musi być income lub expense');
      handleError(error, 'adding budget item');
      throw error;
    }
    
    try {
      const budgetRef = collection(db, 'budget');
      const docRef = await addDoc(budgetRef, {
        ...itemData,
        userId: user.uid,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      showToast({
        type: 'success',
        message: 'Transakcja dodana pomyślnie'
      });
      
      return docRef.id;
    } catch (error) {
      handleError(error, 'adding budget item');
      throw error;
    }
  }, [user, isOffline, handleError, showToast]);

  // Enhanced update budget item
  const updateBudgetItem = useCallback(async (id: string, updates: Partial<BudgetItem>) => {
    if (!user) {
      const error = new Error('Użytkownik nie jest zalogowany');
      handleError(error, 'updating budget item');
      throw error;
    }
    
    if (isOffline) {
      const error = new Error('Nie można zaktualizować transakcji w trybie offline');
      handleError(error, 'updating budget item');
      throw error;
    }
    
    // Validation
    if (updates.amount !== undefined && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
      const error = new Error('Kwota musi być dodatnią liczbą');
      handleError(error, 'updating budget item');
      throw error;
    }
    
    if (updates.description !== undefined && !updates.description.trim()) {
      const error = new Error('Opis jest wymagany');
      handleError(error, 'updating budget item');
      throw error;
    }
    
    try {
      await updateDoc(doc(db, 'budget', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      showToast({
        type: 'success',
        message: 'Transakcja zaktualizowana pomyślnie'
      });
    } catch (error) {
      handleError(error, 'updating budget item');
      throw error;
    }
  }, [user, isOffline, handleError, showToast]);

  // Delete budget item
  const deleteBudgetItem = useCallback(async (id: string) => {
    if (!user) {
      const error = new Error('Użytkownik nie jest zalogowany');
      handleError(error, 'deleting budget item');
      throw error;
    }
    
    if (isOffline) {
      const error = new Error('Nie można usunąć transakcji w trybie offline');
      handleError(error, 'deleting budget item');
      throw error;
    }
    
    try {
      await deleteDoc(doc(db, 'budget', id));
      
      showToast({
        type: 'success',
        message: 'Transakcja usunięta pomyślnie'
      });
    } catch (error) {
      handleError(error, 'deleting budget item');
      throw error;
    }
  }, [user, isOffline, handleError, showToast]);

  // Enhanced analytics calculation
  const analytics = useMemo((): BudgetAnalytics => {
    try {
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = income - expenses;
      
      // Calculate top categories
      const categoryTotals = transactions.reduce((acc, t) => {
        if (t.type === 'expense') {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const totalExpenses = Object.values(categoryTotals).reduce((sum: number, amount) => sum + Number(amount), 0) || 1;
      const topCategories = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount: Number(amount),
          percentage: Math.round((Number(amount) / Number(totalExpenses)) * 100)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const monthlyTrend = Array.from({ length: 12 }, (_, index) => {
        const monthDate = startOfMonth(subMonths(new Date(), 11 - index));
        const monthKey = format(monthDate, 'yyyy-MM');

        return transactions.reduce((sum, transaction) => {
          const transactionDate = toBudgetDate(transaction.date);

          if (Number.isNaN(transactionDate.getTime()) || format(transactionDate, 'yyyy-MM') !== monthKey) {
            return sum;
          }

          return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
        }, 0);
      });
      
      return {
        totalIncome: income,
        totalExpenses: expenses,
        balance,
        savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
        averageDailySpending: expenses / 30,
        topCategories,
        monthlyTrend,
      };
    } catch (error) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        savingsRate: 0,
        averageDailySpending: 0,
        topCategories: [],
        monthlyTrend: []
      };
    }
  }, [transactions]);

  // Filter transactions
  const filterTransactions = useCallback((filters: BudgetFilters) => {
    return transactions.filter(transaction => {
      // Date range filter
      if (filters.dateRange) {
        const transactionDate = transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date);
        if (transactionDate < filters.dateRange.start || transactionDate > filters.dateRange.end) {
          return false;
        }
      }
      
      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(transaction.category)) {
          return false;
        }
      }
      
      // Type filter
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(transaction.type)) {
          return false;
        }
      }
      
      // Amount filter
      if (filters.minAmount && transaction.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount && transaction.amount > filters.maxAmount) {
        return false;
      }
      
      return true;
    });
  }, [transactions]);

  return {
    transactions,
    loading,
    error,
    clearError,
    analytics,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    filterTransactions
  };
}
