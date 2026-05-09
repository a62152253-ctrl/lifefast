import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, FloatingActionButton, PageHeader, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc,
  serverTimestamp, orderBy, where, writeBatch, Timestamp, limit
} from 'firebase/firestore';
import { Plus, ShoppingCart, X, CheckCircle2, RefreshCw, CheckCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  quantity: string;
  category: string;
  addedBy: string;
  listId: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  recurring?: boolean;
  estimatedPrice?: number;
  actualPrice?: number;
  purchasedAt?: Timestamp | Date;
}

const CATEGORIES = [
  { id: 'warzywa',   label: 'Warzywa & Owoce', icon: '🥦' },
  { id: 'nabiał',   label: 'Nabiał',           icon: '🥛' },
  { id: 'mięso',    label: 'Mięso & Ryby',     icon: '🥩' },
  { id: 'piekarnia', label: 'Piekarnia',        icon: '🍞' },
  { id: 'napoje',   label: 'Napoje',            icon: '🥤' },
  { id: 'dom',      label: 'Dom & Chemia',      icon: '🧹' },
  { id: 'mrożonki', label: 'Mrożonki',          icon: '🧊' },
  { id: 'konservy', label: 'Konserwy',          icon: '🥫' },
  { id: 'słodycze', label: 'Słodycze',          icon: '🍫' },
  { id: 'przyprawy', label: 'Przyprawy',        icon: '🌿' },
  { id: 'alkohole', label: 'Alkohole',          icon: '🍷' },
  { id: 'higiena',  label: 'Higiena',           icon: '🧴' },
  { id: 'papier',   label: 'Papier',            icon: '🧻' },
  { id: 'zwierzęta', label: 'Zwierzęta',        icon: '🐾' },
  { id: 'elektronika', label: 'Elektronika',    icon: '📱' },
  { id: 'odzież',   label: 'Odzież',            icon: '👕' },
  { id: 'inne',     label: 'Inne',              icon: '📦' },
];

function getCategory(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export default function Shopping() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedCat, setSelectedCat] = useState('inne');

  const { showToast } = useToast();
  const { isOffline } = useOffline();

  // Error handler
  const handleError = useCallback((err: any, operation: string) => {
    const msg = err?.message || `Błąd podczas ${operation}`;
    setError(msg);
    if (!isOffline) showToast({ type: 'error', message: msg });
  }, [showToast, isOffline]);

  // Fetch partner UID from user profile
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, 'userProfiles', user.uid),
      snap => setPartnerUid(snap.exists() ? snap.data().partnerUid ?? null : null),
      err => handleError(err, 'pobierania profilu')
    );
    return unsub;
  }, [user, handleError]);

  // Fetch shopping items (own + partner)
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const uids = [user.uid, ...(partnerUid ? [partnerUid] : [])];
    const q = query(
      collection(db, 'shoppingItems'),
      where('addedBy', 'in', uids),
      orderBy('checked', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        const data = snapshot.docs
          .map(d => {
            const raw = d.data();
            if (!raw.name || typeof raw.name !== 'string') return null;
            return {
              id: d.id,
              name: String(raw.name).trim(),
              checked: Boolean(raw.checked),
              quantity: raw.quantity || '1',
              category: raw.category || 'inne',
              addedBy: raw.addedBy || user.uid,
              listId: raw.listId || 'default',
              createdAt: raw.createdAt || serverTimestamp(),
              updatedAt: raw.updatedAt,
              priority: raw.priority || 'medium',
              notes: raw.notes,
              tags: raw.tags || [],
              recurring: raw.recurring || false,
              estimatedPrice: raw.estimatedPrice,
              actualPrice: raw.actualPrice,
              purchasedAt: raw.purchasedAt,
            } as ShoppingItem;
          })
          .filter((i): i is ShoppingItem => i !== null);

        setItems(data);
        setLoading(false);
        setError(null);
      },
      err => {
        handleError(err, 'pobierania listy zakupów');
        handleFirestoreError(err, OperationType.LIST, 'shoppingItems');
        setItems([]);
        setLoading(false);
      }
    );

    return unsub;
  }, [user, partnerUid, handleError]);

  // Add item
  const addItem = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newItemName.trim();
    if (!name || !user) {
      if (!name) showToast({ type: 'warning', message: 'Wpisz nazwę produktu' });
      return;
    }
    if (name.length < 2 || name.length > 100) {
      showToast({ type: 'warning', message: 'Nazwa musi mieć 2–100 znaków' });
      return;
    }
    if (quantity && (isNaN(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > 999)) {
      showToast({ type: 'warning', message: 'Ilość musi być liczbą 1–999' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Niedostępne w trybie offline' });
      return;
    }
    const duplicate = items.find(
      i => i.name.toLowerCase() === name.toLowerCase() && !i.checked && i.category === selectedCat
    );
    if (duplicate) {
      showToast({ type: 'warning', message: 'Taki produkt już istnieje w tej kategorii' });
      return;
    }

    try {
      await addDoc(collection(db, 'shoppingItems'), {
        name,
        checked: false,
        quantity,
        category: selectedCat,
        addedBy: user.uid,
        listId: 'default',
        priority: 'medium',
        recurring: false,
        tags: [],
        createdAt: serverTimestamp(),
      });
      setNewItemName('');
      setQuantity('1');
      setSelectedCat('inne');
      setIsAdding(false);
      hapticFeedback('medium');
      showToast({ type: 'success', message: 'Produkt dodany' });
    } catch (err) {
      handleError(err, 'dodawania produktu');
    }
  }, [newItemName, quantity, selectedCat, user, items, isOffline, showToast, handleError]);

  // Toggle checked
  const toggleItem = useCallback(async (item: ShoppingItem) => {
    const newChecked = !item.checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: newChecked } : i));
    hapticFeedback('medium');

    if (isOffline) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
      showToast({ type: 'offline', message: 'Niedostępne w trybie offline' });
      return;
    }

    try {
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        checked: newChecked,
        updatedAt: serverTimestamp(),
        purchasedAt: newChecked ? serverTimestamp() : null,
      });
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: item.checked } : i));
      hapticFeedback('heavy');
      handleError(err, 'aktualizacji produktu');
    }
  }, [isOffline, showToast, handleError]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    if (isOffline) {
      showToast({ type: 'offline', message: 'Niedostępne w trybie offline' });
      return;
    }
    const backup = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    hapticFeedback('heavy');

    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
      showToast({ type: 'success', message: 'Produkt usunięty' });
    } catch (err) {
      if (backup) setItems(prev => [...prev, backup]);
      hapticFeedback('heavy');
      handleError(err, 'usuwania produktu');
    }
  }, [items, isOffline, showToast, handleError]);

  // Clear all checked items
  const clearChecked = useCallback(async () => {
    const checked = items.filter(i => i.checked);
    if (!checked.length) {
      showToast({ type: 'warning', message: 'Brak zakupionych produktów' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Niedostępne w trybie offline' });
      return;
    }
    hapticFeedback('heavy');
    setItems(prev => prev.filter(i => !i.checked));

    try {
      const batch = writeBatch(db);
      checked.forEach(i => batch.delete(doc(db, 'shoppingItems', i.id)));
      await batch.commit();
      showToast({ type: 'success', message: `Wyczyszczono ${checked.length} produktów` });
    } catch (err) {
      handleError(err, 'czyszczenia listy');
    }
  }, [items, isOffline, showToast, handleError]);

  // Derived counts
  const checkedCount = useMemo(() => items.filter(i => i.checked).length, [items]);
  const uncheckedCount = useMemo(() => items.filter(i => !i.checked).length, [items]);
  const completionRate = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  // Group unchecked items by category
  const grouped = CATEGORIES
    .map(cat => ({ cat, catItems: items.filter(i => !i.checked && (i.category || 'inne') === cat.id) }))
    .filter(g => g.catItems.length > 0);

  return (
    <div className="space-y-8 pb-28">
      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} className="text-rose-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-900">Błąd</h4>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
          <button type="button" aria-label="Zamknij błąd" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 text-sm font-medium">✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Ładowanie listy zakupów...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <PageHeader
            title="Zakupy"
            subtitle="Zsynchronizowana lista zakupów."
            action={
              <div className="flex items-center gap-2">
                <div className="text-right mr-4">
                  <p className="text-xs text-gray-500">Postęp</p>
                  <p className="text-lg font-bold text-indigo-600">{completionRate}%</p>
                </div>
                {checkedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearChecked}
                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-colors"
                  >
                    <CheckCheck size={15} />
                    Wyczyść kupione ({checkedCount})
                  </button>
                )}
              </div>
            }
          />

          {/* Progress bar */}
          {items.length > 0 && (
            <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Postęp zakupów</span>
                <span className="text-[10px] font-black text-indigo-600">{checkedCount}/{items.length}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
              <p className="text-2xl font-black text-[#1d1d1f]">{uncheckedCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Do kupienia</p>
            </div>
            <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
              <p className="text-2xl font-black text-emerald-600">{checkedCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Kupione</p>
            </div>
            <div className="bg-white rounded-[1.75rem] p-5 border border-gray-100 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <RefreshCw size={12} className="text-emerald-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live sync</p>
            </div>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <ShoppingCart size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">Lista pusta!</p>
              <p className="text-gray-300 text-sm mt-1">Dodaj produkty przyciskiem poniżej.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unchecked items grouped by category */}
              {grouped.map(({ cat, catItems }) => (
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
                            type="button"
                            aria-label={`Usuń ${item.name}`}
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

              {/* Checked items */}
              {checkedCount > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-3 px-1">
                    Kupione ({checkedCount})
                  </p>
                  <div className="space-y-2">
                    {items.filter(i => i.checked).map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-3.5 flex items-center gap-4 group cursor-pointer opacity-60"
                        onClick={() => toggleItem(item)}
                      >
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <span className="flex-1 font-bold text-gray-400 text-sm line-through">{item.name}</span>
                        <button
                          type="button"
                          aria-label={`Usuń ${item.name}`}
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

          {/* FAB */}
          <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

          {/* Add item modal */}
          <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Dodaj produkt">
            <form onSubmit={addItem} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="shop-item-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Co kupić?</label>
                <input
                  id="shop-item-name"
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
                  <label htmlFor="shop-item-qty" className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Ilość</label>
                  <input
                    id="shop-item-qty"
                    type="text"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="shop-item-cat" className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kategoria</label>
                  <select
                    id="shop-item-cat"
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
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Anuluj</Button>
                <Button type="submit">Dodaj</Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
