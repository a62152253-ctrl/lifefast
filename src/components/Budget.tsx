import { useAuthState } from 'react-firebase-hooks/auth';
import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc,
  doc, updateDoc, serverTimestamp, orderBy, limit, Timestamp
} from 'firebase/firestore';
import {
  Plus, Wallet, TrendingUp, TrendingDown, DollarSign, ReceiptText, PieChart,
  ArrowUpRight, ArrowDownRight, Search, Filter, Target, PiggyBank, Pencil, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  userId: string;
  date: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

const CATEGORIES = [
  { id: 'jedzenie',     name: 'Jedzenie',     icon: '🍕' },
  { id: 'transport',   name: 'Transport',    icon: '🚗' },
  { id: 'oplaty',      name: 'Opłaty',       icon: '🏠' },
  { id: 'rozrywka',    name: 'Rozrywka',     icon: '🎬' },
  { id: 'zdrowie',     name: 'Zdrowie',      icon: '🏥' },
  { id: 'shopping',    name: 'Zakupy',       icon: '🛒' },
  { id: 'edukacja',    name: 'Edukacja',     icon: '📚' },
  { id: 'podroze',     name: 'Podróże',      icon: '✈️' },
  { id: 'hobby',       name: 'Hobby',        icon: '🎮' },
  { id: 'dom',         name: 'Dom',          icon: '🏡' },
  { id: 'inne',        name: 'Inne',         icon: '📦' },
  { id: 'praca',       name: 'Praca',        icon: '💼' },
  { id: 'inwestycje',  name: 'Inwestycje',   icon: '📈' },
  { id: 'prezenty',    name: 'Prezenty',     icon: '🎁' },
  { id: 'sprzedaz',    name: 'Sprzedaż',     icon: '💰' },
  { id: 'inne-dochody',name: 'Inne dochody', icon: '💵' },
];

export default function Budget() {
  const [user] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('inne');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthlyLimit] = useState(3000);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const analytics = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const filtered = transactions.filter(t => {
      const d = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd }) &&
        (filterType === 'all' || t.type === filterType) &&
        (searchQuery === '' || t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    });
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, filtered };
  }, [transactions, selectedMonth, filterType, searchQuery]);

  useEffect(() => {
    if (!user) { setTransactions([]); setLoading(false); return; }
    setLoading(true);
    const q = query(collection(db, 'budget'), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(200));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => {
        const x = d.data();
        if (!x.description || typeof x.amount !== 'number' || !x.type) return null;
        return { id: d.id, description: String(x.description).trim(), amount: Number(x.amount), type: x.type, category: x.category || 'Inne', userId: x.userId, date: x.date || x.createdAt } as Transaction;
      }).filter((t): t is Transaction => t !== null);
      setTransactions(data);
      setLoading(false);
    }, err => {
      handleFirestoreError(err, OperationType.LIST, 'budget');
      showToast({ type: 'error', message: 'Nie udało się załadować transakcji' });
      setLoading(false);
    });
    return () => unsub();
  }, [user, showToast]);

  const closeModal = useCallback(() => {
    setIsAdding(false);
    setEditingTransaction(null);
    setDesc('');
    setAmount('');
    setType('expense');
    setCategory('inne');
  }, []);

  const saveTransaction = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!desc.trim() || !amount || !user) return;
    if (isOffline) { showToast({ type: 'error', message: 'Tryb offline' }); return; }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast({ type: 'warning', message: 'Nieprawidłowa kwota' });
      return;
    }
    try {
      const data = { description: desc.trim(), amount: parsedAmount, type, userId: user.uid, category, date: serverTimestamp() };
      if (editingTransaction) {
        await updateDoc(doc(db, 'budget', editingTransaction.id), { ...data, updatedAt: serverTimestamp() });
        showToast({ type: 'success', message: 'Transakcja zaktualizowana' });
      } else {
        await addDoc(collection(db, 'budget'), { ...data, createdAt: serverTimestamp() });
        showToast({ type: 'success', message: 'Transakcja dodana' });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'budget');
      showToast({ type: 'error', message: 'Nie udało się zapisać transakcji' });
    }
  }, [desc, amount, type, category, user, editingTransaction, isOffline, closeModal, showToast]);

  const openEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setCategory(t.category);
    setIsAdding(true);
  };

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user || isOffline) return;
    try {
      await deleteDoc(doc(db, 'budget', id));
      showToast({ type: 'success', message: 'Transakcja usunięta' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'budget');
      showToast({ type: 'error', message: 'Nie udało się usunąć' });
    }
  }, [user, isOffline, showToast]);

  const { totalIncome, totalExpenses, balance, filtered } = analytics;

  return (
    <div className="space-y-12 pb-40">
      <PageHeader title="Skarbiec" />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: TrendingUp, color: 'text-green-500', label: 'Przychody', value: totalIncome },
          { icon: TrendingDown, color: 'text-red-500', label: 'Wydatki', value: totalExpenses },
          { icon: PiggyBank, color: 'text-blue-500', label: 'Oszczędności', value: balance },
          { icon: Target, color: 'text-purple-500', label: 'Budżet', value: monthlyLimit - totalExpenses },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{value.toFixed(2)} zł</div>
          </div>
        ))}
      </div>

      {/* Hero balance card */}
      <Card className="bg-[#1d1d1f] text-white border-none p-8 md:p-12 relative overflow-hidden shadow-2xl group">
        <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 translate-x-10 -translate-y-10 pointer-events-none">
          <Wallet size={320} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
                <PieChart size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Stan Konta</p>
            </div>
            <Badge variant="primary" className="bg-white/10 text-white border-none">Live Sync</Badge>
          </div>
          <h3 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            {balance.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span className="text-2xl text-white/30 ml-2">PLN</span>
          </h3>
          <div className="flex flex-wrap gap-6 md:gap-10 mt-10">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Przychody</p>
              <div className="flex items-center gap-2 text-emerald-400">
                <ArrowUpRight size={20} />
                <span className="text-xl md:text-2xl font-black">{totalIncome.toLocaleString('pl-PL')} zł</span>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block self-center" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Wydatki</p>
              <div className="flex items-center gap-2 text-rose-400">
                <ArrowDownRight size={20} />
                <span className="text-xl md:text-2xl font-black">{totalExpenses.toLocaleString('pl-PL')} zł</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Category breakdown */}
        <div className="w-full lg:w-80 space-y-8 lg:sticky lg:top-10">
          <Card className="p-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" /> Wydatki wg kategorii
            </h4>
            <div className="space-y-4">
              {(() => {
                const expenses = transactions.filter(t => t.type === 'expense');
                const tot = expenses.reduce((s, t) => s + t.amount, 0) || 1;
                const catColors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'];
                return CATEGORIES
                  .map(cat => ({ ...cat, total: expenses.filter(t => t.category === cat.name).reduce((s, t) => s + t.amount, 0) }))
                  .filter(c => c.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 5)
                  .map((cat, i) => {
                    const pct = Math.round((cat.total / tot) * 100);
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-500">{cat.icon} {cat.name}</span>
                          <span className="text-[#1d1d1f]">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
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

        {/* Transaction list */}
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
              {filtered.length > 0 ? filtered.map((t, idx) => (
                <motion.div layout key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}>
                      <TransactionItem
                        transaction={t}
                        onDelete={deleteTransaction}
                        onEdit={openEdit}
                      />
                </motion.div>
              )) : (
                <div className="bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                    <ReceiptText size={48} />
                  </div>
                  <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Portfel jest pusty</h4>
                  <p className="text-gray-400 mt-3 max-w-sm text-lg">Każda wielka suma zaczyna się od jednej monety.</p>
                  <Button variant="primary" className="mt-10" onClick={() => setIsAdding(true)}>Zapisz operację</Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => { closeModal(); setIsAdding(true); }} />

      <Modal isOpen={isAdding} onClose={closeModal} title={editingTransaction ? 'Edytuj Transakcję' : 'Nowa Transakcja'}>
        <form onSubmit={saveTransaction} className="space-y-12">
          <div className="flex bg-gray-100 p-2 rounded-[2rem] gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} className={cn('flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all', type === t ? (t === 'expense' ? 'bg-rose-500 text-white shadow-xl shadow-rose-200' : 'bg-emerald-500 text-white shadow-xl shadow-emerald-200') : 'text-gray-400')}>
                {t === 'expense' ? 'Wydatek' : 'Przychód'}
              </button>
            ))}
          </div>
          <div className="space-y-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Kwota</label>
              <div className="flex items-center bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mr-6"><DollarSign size={24} /></div>
                <input type="number" placeholder="0.00" step="0.01" className="w-full text-5xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Tytuł transakcji</label>
              <div className="flex items-center bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm mr-6"><ReceiptText size={20} /></div>
                <input type="text" placeholder="Np. Zakupy spożywcze, Premia..." className="w-full text-2xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent" value={desc} onChange={e => setDesc(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Kategoria</label>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.name)} className={cn('flex flex-col items-center p-4 rounded-3xl border-2 transition-all', category === cat.name ? 'bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-transparent hover:border-gray-100')}>
                    <span className="text-2xl mb-1">{cat.icon}</span>
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', category === cat.name ? 'text-indigo-600' : 'text-gray-400')}>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="ghost" className="py-6" onClick={closeModal}>Anuluj</Button>
            <Button type="submit" className="py-6">Zapisz transakcję</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function resolveTransactionCategory(category: string) {
  return (
    CATEGORIES.find((item) => item.id === category || item.name === category) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

function TransactionItem({
  transaction,
  onDelete,
  onEdit,
}: {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}) {
  const category = resolveTransactionCategory(transaction.category);
  const isIncome = transaction.type === 'income';
  const transactionDate =
    transaction.date instanceof Timestamp ? transaction.date.toDate() : new Date(transaction.date);

  return (
    <motion.div
      layout
      className="group flex items-center gap-4 rounded-[1.75rem] border border-gray-100 bg-white px-5 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.06)]"
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-xl',
          isIncome ? 'bg-emerald-50' : 'bg-rose-50',
        )}
      >
        {category.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-[#1d1d1f]">{transaction.description}</p>
          <Badge
            variant={isIncome ? 'success' : 'danger'}
            className="border-none text-[9px] uppercase tracking-[0.16em]"
          >
            {isIncome ? 'Przychod' : 'Wydatek'}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span>{category.name}</span>
          <span>|</span>
          <span>{format(transactionDate, 'd MMM yyyy', { locale: pl })}</span>
        </div>
      </div>

      <div className="text-right">
        <p className={cn('text-base font-black', isIncome ? 'text-emerald-600' : 'text-rose-600')}>
          {isIncome ? '+' : '-'}
          {transaction.amount.toFixed(2)} zl
        </p>
        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="rounded-xl bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="rounded-xl bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
