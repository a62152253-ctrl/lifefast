import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Trash2, CheckCircle2, Circle, ShoppingBag, Hash, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';

export default function Shopping() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isAdding, setIsAdding] = useState(false);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) setPartnerUid(snap.data().partnerUid || null);
      else setPartnerUid(null);
    });
    return unsubProfile;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uids = [user.uid];
    if (partnerUid) uids.push(partnerUid);
    const q = query(
      collection(db, 'shoppingItems'), 
      where('addedBy', 'in', uids),
      orderBy('checked', 'asc'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => handleFirestoreError(err, OperationType.LIST, 'shoppingItems'));
  }, [user, partnerUid]);

  const addItem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newItemName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'shoppingItems'), {
        name: newItemName,
        checked: false,
        quantity,
        addedBy: user.uid,
        listId: 'default',
        createdAt: serverTimestamp()
      });
      setNewItemName(''); setQuantity('1'); setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'shoppingItems'); }
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

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Spiżarnia" 
        subtitle="Zsynchronizowana lista zakupów dla Ciebie i Twojego partnera."
      />

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-96 space-y-8">
           <Card className="bg-[#1d1d1f] text-white border-none p-10 relative overflow-hidden">
              <Sparkles size={80} className="absolute -top-5 -right-5 opacity-10" />
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-6">
                    <RefreshCw size={14} className="text-emerald-400 animate-spin-slow" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Sync Aktywny</span>
                 </div>
                 <h4 className="text-4xl font-black tracking-tighter mb-2">
                    {items.filter(i => !i.checked).length}
                 </h4>
                 <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest leading-none">Produktów do kupienia</p>
              </div>
           </Card>

           <Button variant="primary" className="w-full py-6 text-base" onClick={() => setIsAdding(true)}>
             <Plus size={24} className="mr-3" /> Dodaj produkt
           </Button>

           <Card className="p-8 bg-white/50 backdrop-blur-sm border-gray-100 italic text-gray-500 font-medium leading-relaxed">
             "Lista zakupów jest współdzielona automatycznie, jeśli Sparowałeś/aś swoje konto w ustawieniach."
           </Card>
        </div>

        <div className="flex-1">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {items.length > 0 ? items.map((item, idx) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "flex items-center gap-6 p-7 border-none shadow-[0_4px_20px_-8px_rgba(0,0,0,0.03)] cursor-pointer group hover:bg-indigo-50/30 transition-all duration-500",
                      item.checked && "opacity-50 grayscale bg-gray-50/50"
                    )}
                    onClick={() => toggleItem(item)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                      item.checked ? "bg-[#1d1d1f] border-[#1d1d1f] text-white" : "bg-white border-gray-100 group-hover:border-indigo-600"
                    )}>
                      {item.checked && <CheckCircle2 size={24} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "text-2xl font-black tracking-tighter truncate transition-all duration-500 lowercase",
                        item.checked ? "line-through text-gray-400" : "text-[#1d1d1f]"
                      )}>
                        {item.name}
                      </h4>
                      {item.quantity && (
                         <div className="mt-1">
                            <Badge variant="primary" className="bg-indigo-100 text-indigo-600 border-none font-black text-[10px]">
                              {item.quantity} szt.
                            </Badge>
                         </div>
                      )}
                    </div>

                    <IconButton 
                      icon={Trash2} 
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} 
                      className="p-4 bg-gray-50/50 hover:bg-rose-50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all text-gray-300" 
                    />
                  </Card>
                </motion.div>
              )) : (
                <div className="col-span-full bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                   <div className="w-24 h-24 bg-emerald-50 text-emerald-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                      <ShoppingCart size={48} />
                   </div>
                   <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Lodówka pełna!</h4>
                   <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Brak brakujących produktów. Dodaj coś, czego zapomniałeś/aś kupić.</p>
                   <Button variant="secondary" className="mt-10" onClick={() => setIsAdding(true)}>Dodaj do spiżarni</Button>
                </div>
              )}
            </AnimatePresence>
           </div>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Dodaj do listy">
        <form onSubmit={addItem} className="space-y-12">
            <div className="space-y-10">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Co kupić?</label>
                 <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mr-6">
                      <ShoppingBag size={24} />
                    </div>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Np. Mleko owsiane, Chleb..." 
                      className="w-full text-3xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent leading-none" 
                      value={newItemName} 
                      onChange={(e) => setNewItemName(e.target.value)} 
                      required
                    />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Ilość</label>
                 <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all w-full max-w-[200px]">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm mr-6">
                      <Hash size={20} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="1" 
                      className="w-full text-3xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent leading-none" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                    />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="py-6" onClick={() => setIsAdding(false)}>Anuluj</Button>
              <Button type="submit" className="py-6 shadow-indigo-500/40">Dodaj do listy</Button>
            </div>
        </form>
      </Modal>
    </div>
  );
}
