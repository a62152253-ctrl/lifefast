import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, FloatingActionButton, IconButton, PageHeader, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, where, writeBatch
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Trash2, CheckCircle2, ShoppingBag, RefreshCw, X, CheckCheck, TrendingUp, Calculator, Barcode, Filter, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

const CATEGORIES = [
  { id: 'warzywa',  label: 'Warzywa & Owoce', icon: '🥦', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'nabiał',  label: 'Nabiał',            icon: '🥛', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'mięso',   label: 'Mięso & Ryby',      icon: '🥩', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'piekarnia', label: 'Piekarnia',        icon: '🍞', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'napoje',  label: 'Napoje',             icon: '🥤', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { id: 'dom',     label: 'Dom & Chemia',       icon: '🧹', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { id: 'inne',    label: 'Inne',               icon: '📦', color: 'bg-gray-50 border-gray-200 text-gray-600' },
];

function getCat(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export default function Shopping() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedCat, setSelectedCat] = useState('inne');
  const [isAdding, setIsAdding] = useState(false);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(500);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'userProfiles', user.uid), snap => {
      setPartnerUid(snap.exists() ? snap.data().partnerUid || null : null);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uids = [user.uid, ...(partnerUid ? [partnerUid] : [])];
    const q = query(
      collection(db, 'shoppingItems'),
      where('addedBy', 'in', uids),
      orderBy('checked', 'asc'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => handleFirestoreError(err, OperationType.LIST, 'shoppingItems'));
  }, [user, partnerUid]);

  const addItem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!newItemName.trim() || !user) {
      if (!newItemName.trim()) {
        showToast({
          type: 'warning',
          message: 'Wpisz nazwę produktu',
        });
      }
      return;
    }
    
    if (isOffline) {
      showToast({
        type: 'offline',
        message: 'Nie można dodać produktu w trybie offline',
      });
      return;
    }
    
    try {
      await addDoc(collection(db, 'shoppingItems'), {
        name: newItemName,
        checked: false,
        quantity,
        category: selectedCat,
        addedBy: user.uid,
        listId: 'default',
        createdAt: serverTimestamp(),
      });
      setNewItemName(''); setQuantity('1'); setIsAdding(false);
      hapticFeedback('medium');
      showToast({
        type: 'success',
        message: 'Produkt dodany do listy',
      });
    } catch (err) { 
      console.error('Error adding shopping item:', err);
      handleFirestoreError(err, OperationType.CREATE, 'shoppingItems');
      showToast({
        type: 'error',
        message: 'Nie udało się dodać produktu',
      });
    }
  };

  const toggleItem = async (item: any) => {
    try {
      hapticFeedback('medium');
      await updateDoc(doc(db, 'shoppingItems', item.id), { checked: !item.checked });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `shoppingItems/${item.id}`); }
  };

  const deleteItem = async (id: string) => {
    try {
      hapticFeedback('heavy');
      await deleteDoc(doc(db, 'shoppingItems', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `shoppingItems/${id}`); }
  };

  const clearChecked = async () => {
    const checked = items.filter(i => i.checked);
    if (!checked.length) return;
    hapticFeedback('heavy');
    const batch = writeBatch(db);
    checked.forEach(i => batch.delete(doc(db, 'shoppingItems', i.id)));
    try { await batch.commit(); } catch (err) { console.error(err); }
  };

  const unchecked = items.filter(i => !i.checked);
  const checked   = items.filter(i => i.checked);
  const progress  = items.length > 0 ? Math.round((checked.length / items.length) * 100) : 0;

  // Group unchecked by category
  const grouped = CATEGORIES.map(cat => ({
    cat,
    items: unchecked.filter(i => (i.category || 'inne') === cat.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-8 pb-28">
      <PageHeader
        title="Zakupy"
        subtitle="Zsynchronizowana lista zakupów."
        action={
          checked.length > 0 ? (
            <button
              onClick={clearChecked}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-colors"
            >
              <CheckCheck size={15} />
              Wyczyść kupione ({checked.length})
            </button>
          ) : undefined
        }
      />

      {/* Progress */}
      {items.length > 0 && (
        <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Postęp zakupów</span>
            <span className="text-[10px] font-black text-indigo-600">{checked.length}/{items.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
          <p className="text-2xl font-black text-[#1d1d1f]">{unchecked.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Do kupienia</p>
        </div>
        <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
          <p className="text-2xl font-black text-emerald-600">{checked.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Kupione</p>
        </div>
        <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <RefreshCw size={12} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live sync</p>
        </div>
      </div>

      {/* Items grouped by category */}
      {items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
          <ShoppingCart size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-bold">Lista pusta!</p>
          <p className="text-gray-300 text-sm mt-1">Dodaj produkty przyciskiem poniżej.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items: catItems }) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-base">{cat.icon}</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{cat.label}</p>
                <span className="text-[10px] text-gray-300 font-bold">({catItems.length})</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {catItems.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 group cursor-pointer hover:border-indigo-100 transition-all"
                      onClick={() => toggleItem(item)}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                        'border-gray-200 group-hover:border-indigo-400'
                      )}>
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <span className="flex-1 font-bold text-[#1d1d1f] text-sm">{item.name}</span>
                      {item.quantity && item.quantity !== '1' && (
                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{item.quantity}</span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-300 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Checked items (collapsed) */}
          {checked.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-3 px-1">Kupione ({checked.length})</p>
              <div className="space-y-2">
                {checked.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-3.5 flex items-center gap-4 group cursor-pointer opacity-60"
                    onClick={() => toggleItem(item)}
                  >
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="flex-1 font-bold text-gray-400 text-sm line-through">{item.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-300 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Dodaj produkt">
        <form onSubmit={addItem} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Co kupić?</label>
            <input
              autoFocus
              type="text"
              placeholder="np. Mleko owsiane..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Ilość</label>
              <input
                type="text"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kategoria</label>
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Anuluj</Button>
            <Button type="submit">Dodaj</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
