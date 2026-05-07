import { useAuthState } from 'react-firebase-hooks/auth';
import { useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, Wallet, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, ReceiptText, PieChart, ArrowUpRight, ArrowDownRight, Search, Filter, BarChart3, Target, AlertCircle, PiggyBank } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export default function Budget() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Inne');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(3000);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const CATEGORIES = [
    { name: 'Jedzenie', icon: '🍕' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Opłaty', icon: '🏠' },
    { name: 'Rozrywka', icon: '🎬' },
    { name: 'Zdrowie', icon: '🏥' },
    { name: 'Inne', icon: '📦' }
  ];

  // Calculate analytics
  const analytics = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const balance = income - expenses;
    const spendingByCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat.name] = transactions
        .filter(t => t.type === 'expense' && t.category === cat.name)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      return acc;
    }, {} as Record<string, number>);
    
    return {
      income,
      expenses,
      balance,
      spendingByCategory,
      savingsRate: income > 0 ? ((income - expenses) / income * 100) : 0,
      dailyAverage: expenses / 30,
      remainingBudget: monthlyLimit - expenses
    };
  }, [transactions, monthlyLimit]);

  useEffect(() => {
    // Early return if user is not available
    if (!user) {
      console.log('👤 No user provided - skipping budget transactions fetch');
      return;
    }

    console.log(`💰 Fetching budget transactions for user: ${user.uid}`);

    const transactionsQuery = query(
      collection(db, 'budget'), 
      where('userId', '==', user.uid), 
      orderBy('date', 'desc'),
      limit(100) // Prevent excessive data loading
    );
    
    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        try {
          const transactions = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            // Validate transaction structure
            if (!data.description || typeof data.amount !== 'number' || !data.type) {
              console.warn('⚠️ Invalid transaction structure:', doc.id, data);
              return null;
            }

            // Validate amount is positive
            if (data.amount <= 0) {
              console.warn('⚠️ Invalid transaction amount:', doc.id, data.amount);
              return null;
            }

            // Validate transaction type
            if (!['income', 'expense'].includes(data.type)) {
              console.warn('⚠️ Invalid transaction type:', doc.id, data.type);
              return null;
            }

            return {
              id: doc.id,
              ...data,
              // Ensure consistent data types
              amount: Number(data.amount),
              type: data.type as 'income' | 'expense',
              description: String(data.description).trim(),
              category: data.category || 'Inne'
            };
          }).filter(Boolean); // Remove null entries

          setTransactions(transactions);
          console.log(`💰 Loaded ${transactions.length} valid transactions`);
          
        } catch (error) {
          console.error('❌ Error processing transactions data:', error);
          setTransactions([]);
        }
      },
      (error) => {
        console.error('❌ Error fetching budget transactions:', error);
        handleFirestoreError(error, OperationType.LIST, 'budget');
        setTransactions([]);
      }
    );

    // Cleanup function
    return () => {
      console.log('🔄 Unsubscribing from budget transactions updates');
      unsubscribe();
    };
  }, [user]);

  const saveTransaction = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Enhanced validation
    if (!desc.trim() || !amount || !user) {
      if (!desc.trim()) {
        showToast({
          type: 'warning',
          message: 'Wpisz opis transakcji',
        });
      }
      if (!amount) {
        showToast({
          type: 'warning',
          message: 'Wpisz kwotę transakcji',
        });
      }
      hapticFeedback('heavy');
      return;
    }

    if (isOffline) {
      showToast({
        type: 'offline',
        message: 'Nie można zapisać transakcji w trybie offline',
      });
      return;
    }

    // Clean and validate amount
    const cleanAmount = amount.toString().replace(',', '.').replace(/[^\d.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      hapticFeedback('heavy');
      showToast({
        type: 'warning',
        message: 'Nieprawidłowa kwota transakcji',
      });
      return;
    }

    // Reasonable limits (prevent accidental huge amounts)
    if (parsedAmount > 1000000) {
      hapticFeedback('heavy');
      showToast({
        type: 'warning',
        message: 'Kwota przekracza dopuszczalny limit',
      });
      return;
    }

    // Validate description length
    if (desc.trim().length < 2 || desc.trim().length > 100) {
      hapticFeedback('heavy');
      showToast({
        type: 'warning',
        message: 'Opis musi mieć od 2 do 100 znaków',
      });
      return;
    }

    try {
      const transactionData = {
        description: desc.trim(),
        amount: parsedAmount,
        type,
        userId: user.uid,
        category: category || 'Inne'
      };

      if (editingTransaction) {
        await updateDoc(doc(db, 'budget', editingTransaction.id), {
          ...transactionData,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Transakcja zaktualizowana pomyślnie');
        showToast({
          type: 'success',
          message: 'Transakcja zaktualizowana',
        });
      } else {
        await addDoc(collection(db, 'budget'), {
          ...transactionData,
          date: serverTimestamp()
        });
        console.log('✅ Transakcja dodana pomyślnie');
        showToast({
          type: 'success',
          message: 'Transakcja dodana',
        });
      }
      
      hapticFeedback('medium');
      closeModal();
      
    } catch (error) {
      hapticFeedback('heavy');
      console.error('❌ Błąd zapisu transakcji:', error);
      handleFirestoreError(error, OperationType.CREATE, 'budget');
      showToast({
        type: 'error',
        message: 'Nie udało się zapisać transakcji',
      });
    }
  };

  const openEditModal = (transaction: any) => {
    // Validation
    if (!transaction || !transaction.id) {
      hapticFeedback('heavy');
      console.error('❌ Invalid transaction provided to openEditModal');
      return;
    }

    // Validate transaction data structure
    if (!transaction.description || typeof transaction.amount !== 'number' || !transaction.type) {
      hapticFeedback('heavy');
      console.error('❌ Transaction missing required fields:', {
        hasDescription: !!transaction.description,
        hasAmount: typeof transaction.amount === 'number',
        hasType: !!transaction.type
      });
      return;
    }

    // Validate amount is positive
    if (transaction.amount <= 0) {
      hapticFeedback('heavy');
      console.error('❌ Transaction amount must be positive:', transaction.amount);
      return;
    }

    // Validate transaction type
    if (!['income', 'expense'].includes(transaction.type)) {
      hapticFeedback('heavy');
      console.error('❌ Invalid transaction type:', transaction.type);
      return;
    }

    try {
      // Reset form first to ensure clean state
      closeModal();
      
      // Set editing transaction
      setEditingTransaction(transaction);
      
      // Set form fields with validation and sanitization
      setDesc(transaction.description.trim());
      setAmount(transaction.amount.toString());
      setType(transaction.type as 'income' | 'expense');
      setCategory(transaction.category || 'Inne');
      
      // Open modal
      setIsAdding(true);
      
      hapticFeedback('light');
      console.log(`✅ Edit modal opened for transaction: "${transaction.description}" (${transaction.amount} PLN)`);
      
    } catch (error) {
      hapticFeedback('heavy');
      console.error('❌ Error opening edit modal:', error);
      
      // Reset to safe state
      closeModal();
    }
  };

  const closeModal = () => {
    try {
      // Validate current state before closing
      const wasAdding = isAdding;
      const wasEditing = !!editingTransaction;
      
      // Log the closing action
      if (wasEditing) {
        console.log(`🔒 Closing edit modal for transaction: "${editingTransaction?.description}"`);
      } else if (wasAdding) {
        console.log('🔒 Closing add transaction modal');
      } else {
        console.log('🔒 closeModal called but no modal was open');
        return; // Early return if no modal is open
      }

      // Reset all modal states atomically
      setIsAdding(false);
      setEditingTransaction(null);
      setDesc('');
      setAmount('');
      setType('expense');
      setCategory('Inne');
      
      // Provide haptic feedback for successful close
      hapticFeedback('light');
      
      console.log('✅ Modal closed successfully, form reset to defaults');
      
    } catch (error) {
      console.error('❌ Error closing modal:', error);
      
      // Fallback: ensure modal is closed even if error occurs
      try {
        setIsAdding(false);
        setEditingTransaction(null);
      } catch (fallbackError) {
        console.error('❌ Critical error in modal close fallback:', fallbackError);
      }
    }
  };

  const total = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Skarbiec" 
      />

      {/* Analytics Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-400">Przychody</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{incomeTotal.toFixed(2)} zł</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-400">Wydatki</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{expenseTotal.toFixed(2)} zł</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <PiggyBank className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-400">Oszczędności</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{total.toFixed(2)} zł</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-400">Budżet</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{(incomeTotal - expenseTotal).toFixed(2)} zł</div>
        </div>
      </div>

      {/* Hero Balance Card */}
      <Card className="bg-[#1d1d1f] text-white border-none p-8 md:p-12 relative overflow-hidden shadow-2xl group">
        <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 group-hover:opacity-10 transition-all duration-1000 -rotate-12 translate-x-10 -translate-y-10 group-hover:rotate-0 group-hover:translate-x-0 group-hover:translate-y-0 pointer-events-none">
          <Wallet size={320} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                   <PieChart size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Stan Konta</p>
             </div>
             <Badge variant="primary" className="bg-white/10 text-white border-none backdrop-blur-md">Live Sync</Badge>
          </div>
          <h3 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 scrollbar-hide overflow-x-auto whitespace-nowrap">
            {total.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span className="text-2xl md:text-3xl text-white/30 ml-2">PLN</span>
          </h3>
          <div className="flex flex-wrap gap-6 md:gap-10 mt-10">
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Przychody</p>
                <div className="flex items-center gap-2 text-emerald-400">
                   <ArrowUpRight size={20} />
                   <span className="text-xl md:text-2xl font-black tracking-tight">{incomeTotal.toLocaleString('pl-PL')} zł</span>
                </div>
             </div>
             <div className="w-px h-10 bg-white/10 hidden sm:block self-center" />
             <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Wydatki</p>
                <div className="flex items-center gap-2 text-rose-400">
                   <ArrowDownRight size={20} />
                   <span className="text-xl md:text-2xl font-black tracking-tight">{expenseTotal.toLocaleString('pl-PL')} zł</span>
                </div>
             </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Stats and Quick Actions */}
        <div className="w-full lg:w-80 space-y-8 lg:sticky lg:top-10">
           <Card className="p-6 bg-white/80 backdrop-blur-lg border-gray-100/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-500" />
                Wydatki wg kategorii
              </h4>
              <div className="space-y-4">
                {(() => {
                  const expenses = transactions.filter(t => t.type === 'expense');
                  const total = expenses.reduce((s, t) => s + t.amount, 0) || 1;
                  const catTotals = CATEGORIES.reduce((acc: Record<string, number>, cat) => {
                    acc[cat.name] = expenses
                      .filter(t => t.category === cat.name)
                      .reduce((s, t) => s + t.amount, 0);
                    return acc;
                  }, {});
                  const catColors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'];
                  return CATEGORIES.filter(c => catTotals[c.name] > 0)
                    .sort((a, b) => catTotals[b.name] - catTotals[a.name])
                    .slice(0, 5)
                    .map((cat, i) => {
                      const pct = Math.round((catTotals[cat.name] / total) * 100);
                      return (
                        <div key={cat.name} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-500">{cat.icon} {cat.name}</span>
                            <span className="text-[#1d1d1f]">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: 'easeOut' }}
                              className={cn('h-full rounded-full', catColors[i % catColors.length])}
                            />
                          </div>
                        </div>
                      );
                    });
                })()}
                {transactions.filter(t => t.type === 'expense').length === 0 && (
                  <p className="text-gray-300 text-xs italic">Brak wydatków do analizy.</p>
                )}
              </div>
           </Card>

           <Button variant="primary" className="hidden lg:flex w-full py-6 text-base" onClick={() => { closeModal(); setIsAdding(true); }}>
             <Plus size={24} className="mr-3" /> Nowa transakcja
           </Button>
        </div>

        {/* Right Side: Transaction List */}
        <div className="flex-1 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tighter">Historia</h3>
              <div className="flex gap-2">
                 <IconButton icon={Search} className="bg-white/50" />
                 <IconButton icon={Filter} className="bg-white/50" />
              </div>
           </div>

           <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {transactions.length > 0 ? transactions.map((t, idx) => (
                <motion.div 
                  layout
                  key={t.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className="flex items-center justify-between p-4 md:p-6 hover:bg-white transition-all group border-none cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
                    onClick={() => openEditModal(t)}
                  >
                    <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                       <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0",
                          t.type === 'income' ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" : "bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white"
                       )}>
                          {t.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                       </div>
                       <div className="min-w-0">
                          <h5 className="text-lg md:text-xl font-black text-[#1d1d1f] tracking-tight truncate group-hover:text-indigo-600 transition-colors uppercase">{t.description}</h5>
                          <div className="flex items-center gap-2 md:gap-3 mt-1.5 overflow-x-auto scrollbar-hide">
                             <Badge variant="primary" className="bg-gray-50 text-gray-400 border-none px-2 py-0.5 text-[8px] whitespace-nowrap">{t.category || 'Inne'}</Badge>
                             <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
                               {format(t.date?.toDate?.() || new Date(), 'd MMM', { locale: pl })}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 pl-4 shrink-0">
                       <p className={cn(
                          "text-xl md:text-2xl font-black tracking-tighter whitespace-nowrap",
                          t.type === 'income' ? "text-emerald-500 font-black" : "text-[#1d1d1f]"
                       )}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span className="text-[10px] ml-0.5 opacity-40">PLN</span>
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                   <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                      <ReceiptText size={48} />
                   </div>
                   <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Portfel jest pusty</h4>
                   <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Każda wielka suma zaczyna się od jednej monety. Dodaj swoją pierwszą transakcję.</p>
                   <Button variant="primary" className="mt-10" onClick={() => setIsAdding(true)}>Zapisz operację</Button>
                </div>
              )}
            </AnimatePresence>
           </div>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => { closeModal(); setIsAdding(true); }} />

      <Modal isOpen={isAdding} onClose={closeModal} title={editingTransaction ? "Edytuj Transakcję" : "Nowa Transakcja"}>
        <form onSubmit={saveTransaction} className="space-y-12">
          <div className="flex bg-gray-100 p-2 rounded-[2rem] gap-2">
            <button 
              type="button" 
              onClick={() => { setType('expense'); hapticFeedback('light'); }} 
              className={cn(
                "flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                type === 'expense' ? "bg-rose-500 text-white shadow-xl shadow-rose-200" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Wydatek
            </button>
            <button 
              type="button" 
              onClick={() => { setType('income'); hapticFeedback('light'); }} 
              className={cn(
                "flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                type === 'income' ? "bg-emerald-500 text-white shadow-xl shadow-emerald-200" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Przychód
            </button>
          </div>
          
          <div className="space-y-10">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Kwota</label>
               <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mr-6">
                    <DollarSign size={24} />
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01"
                    className="w-full text-5xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    required
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Tytuł transakcji</label>
               <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm mr-6 transition-colors group-focus-within:text-indigo-500">
                    <ReceiptText size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Np. Zakupy spożywcze, Premia..." 
                    className="w-full text-2xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent leading-none" 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)} 
                    required
                  />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Kategoria</label>
               <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => { setCategory(cat.name); hapticFeedback('light'); }}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-300",
                        category === cat.name 
                          ? "bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100" 
                          : "bg-white border-transparent hover:border-gray-100"
                      )}
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        category === cat.name ? "text-indigo-600" : "text-gray-400"
                      )}>{cat.name}</span>
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="ghost" className="py-6" onClick={() => setIsAdding(false)}>Anuluj</Button>
            <Button type="submit" className="py-6 shadow-indigo-500/40">Zapisz transakcję</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
