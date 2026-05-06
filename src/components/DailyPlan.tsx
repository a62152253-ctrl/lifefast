import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, GlassCard, Modal } from './CommonUI';
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
  orderBy
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Plus, Clock, Trash2, Calendar as CalendarIcon, Coffee, Briefcase, Moon, Sun, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { format, startOfToday, addDays, subDays, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { hapticFeedback, cn } from '../lib/utils';

export default function DailyPlan() {
  const [user] = useAuthState(auth);
  const [items, setItems] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [time, setTime] = useState('');
  const [activity, setActivity] = useState('');
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [partnerUid, setPartnerUid] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

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
      collection(db, 'plans'), 
      where('userId', 'in', uids), 
      where('date', '==', dateStr),
      orderBy('time', 'asc')
    );
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => handleFirestoreError(err, OperationType.LIST, 'plans'));
  }, [user, partnerUid, dateStr]);

  const toggleDone = async (item: any) => {
    hapticFeedback('medium');
    try {
      await updateDoc(doc(db, 'plans', item.id), { done: !item.done });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `plans/${item.id}`); }
  };

  const addPlan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activity.trim() || !time || !user) return;
    try {
      await addDoc(collection(db, 'plans'), {
        time,
        activity,
        userId: user.uid,
        date: dateStr,
        createdAt: serverTimestamp()
      });
      setActivity(''); setTime(''); setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'plans'); }
  };

  const getTimeIcon = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0]);
    if (hour >= 21 || hour < 6) return <Moon size={22} />;
    if (hour < 12) return <Coffee size={22} />;
    if (hour < 18) return <Briefcase size={22} />;
    return <Sun size={22} />;
  };

  const getRelativeDateLabel = (date: Date) => {
    if (isSameDay(date, startOfToday())) return 'Dzisiaj';
    if (isSameDay(date, addDays(startOfToday(), 1))) return 'Jutro';
    if (isSameDay(date, subDays(startOfToday(), 1))) return 'Wczoraj';
    return format(date, 'EEEE', { locale: pl });
  };

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Twój Harmonogram" 
        subtitle="Zoptymalizuj swój dzień dla maksymalnej efektywności."
        action={
          <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 items-center">
            <IconButton icon={ChevronLeft} onClick={() => setSelectedDate(subDays(selectedDate, 1))} />
            <div className="px-6 text-center min-w-[140px]">
               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{getRelativeDateLabel(selectedDate)}</p>
               <p className="font-extrabold text-[#1d1d1f]">{format(selectedDate, 'd MMMM', { locale: pl })}</p>
            </div>
            <IconButton icon={ChevronRight} onClick={() => setSelectedDate(addDays(selectedDate, 1))} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3">
          <div className="relative pl-8 sm:pl-12 border-l-4 border-gray-100 py-4 space-y-12 ml-4">
            <AnimatePresence mode="popLayout">
              {items.length > 0 ? items.map((item, idx) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
                  {/* Timeline Node */}
                  <div className="absolute -left-[44px] sm:-left-[60px] top-4 w-10 h-10 bg-white border-4 border-[#1d1d1f] rounded-full z-10 flex items-center justify-center shadow-2xl group shadow-[#1d1d1f]/10">
                     <div className="w-2 h-2 bg-[#1d1d1f] rounded-full group-hover:scale-150 transition-transform" />
                  </div>
                  
                  <Card className={cn(
                    "flex flex-col md:flex-row md:items-center justify-between p-6 group transition-all duration-300",
                    item.done ? "opacity-60 bg-gray-50" : "hover:border-indigo-100"
                  )}>
                    <div className="flex items-start md:items-center gap-5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleDone(item)}
                        className="shrink-0 mt-1 md:mt-0"
                      >
                        {item.done
                          ? <CheckCircle2 size={24} className="text-emerald-500" />
                          : <Circle size={24} className="text-gray-200 group-hover:text-indigo-300 transition-colors" />
                        }
                      </button>
                      <div className={cn(
                        "p-3.5 rounded-2xl transition-all duration-300 shrink-0",
                        item.done
                          ? "bg-gray-100 text-gray-400"
                          : parseInt(item.time.split(':')[0]) < 12 ? "bg-amber-50 text-amber-500" : "bg-indigo-50 text-indigo-500"
                      )}>
                        {getTimeIcon(item.time)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-black text-gray-400 tracking-widest">{item.time}</span>
                        <h3 className={cn(
                          "font-black text-lg tracking-tight leading-tight mt-0.5",
                          item.done ? "line-through text-gray-400" : "text-[#1d1d1f]"
                        )}>
                          {item.activity}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton
                        icon={Trash2}
                        onClick={() => { hapticFeedback('heavy'); deleteDoc(doc(db, 'plans', item.id)); }}
                        className="text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                      />
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                   <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                      <Clock size={48} />
                   </div>
                   <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Pusty Harmonogram</h4>
                   <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">
                     Nie masz jeszcze żadnych punktów planu na ten dzień. Zacznij planować, aby odzyskać kontrolę nad czasem.
                   </p>
                   <Button variant="primary" onClick={() => setIsAdding(true)} className="mt-10 px-10">
                      Utwórz Plan na ten dzień
                   </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="space-y-12">
          <Card className="p-10 bg-[#1d1d1f] text-white border-none shadow-2xl sticky top-10">
             <div className="flex items-center gap-3 mb-8">
                <Sun className="text-amber-400" size={24} />
                <h3 className="text-xl font-black tracking-tighter leading-none">Smart Assistant</h3>
             </div>
             
             <p className="text-white/60 text-lg leading-relaxed mb-10 italic">
               "{items.length > 0 
                  ? "Twój dzień wygląda na zbalansowany. Pamiętaj o regularnych przerwach między blokami pracy."
                  : "Dzień bez planu to dzień pełen niespodzianek. Spróbuj dodać chociaż 2-3 kluczowe punkty."}"
             </p>

             <div className="space-y-6 pt-10 border-t border-white/10">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-black uppercase text-white/30 tracking-[0.2em]">Obłożenie dnia</span>
                   <span className="text-sm font-bold text-amber-400">{items.length * 10}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${items.length * 10}%` }}
                     className="h-full bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]" 
                   />
                </div>
             </div>
          </Card>
        </aside>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Dodaj do planu">
        <form onSubmit={addPlan} className="space-y-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Godzina rozpoczęcia</label>
            <input 
              type="time" 
              className="w-full bg-gray-50 p-6 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-3xl outline-none transition-all" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Co będziesz robić?</label>
            <textarea 
              placeholder="Np. Trening poranny, Spotkanie z klientem..." 
              className="w-full bg-gray-50 p-6 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-extrabold text-xl outline-none transition-all min-h-[120px] resize-none" 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)} 
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Button variant="ghost" className="py-5" onClick={() => setIsAdding(false)}>Anuluj</Button>
             <Button type="submit" className="py-5">Dodaj Aktywność</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
