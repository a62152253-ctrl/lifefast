import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  MoreHorizontal,
  Calendar as CalendarIcon,
  Search,
  Bell,
  Sparkles
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card, IconButton, PageHeader, Badge, Modal, FloatingActionButton } from './CommonUI';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';

export default function Calendar() {
  const [user] = useAuthState(auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('12:00');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'planner'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const nextMonth = () => { hapticFeedback('light'); setCurrentDate(addMonths(currentDate, 1)); };
  const prevMonth = () => { hapticFeedback('light'); setCurrentDate(subMonths(currentDate, 1)); };

  const onDateClick = (day: Date) => {
    hapticFeedback('medium');
    setSelectedDate(day);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !user) return;
    
    const eventId = Math.random().toString(36).substring(7);
    try {
      await setDoc(doc(db, 'planner', `event_${eventId}`), {
        title: eventTitle,
        time: eventTime,
        date: format(selectedDate, 'yyyy-MM-dd'),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setEventTitle('');
      setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'planner'); }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: pl });
  const endDate = endOfWeek(monthEnd, { locale: pl });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const selectedDateEvents = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Przestrzeń" 
        subtitle="Twój globalny widok czasu i nadchodzących wydarzeń."
      />

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Calendar Grid */}
        <div className="flex-1">
           <Card className="p-10 bg-white border-none shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-12">
                 <div>
                    <h2 className="text-4xl font-black text-[#1d1d1f] tracking-tighter capitalize">
                      {format(currentDate, 'MMMM', { locale: pl })}
                    </h2>
                    <p className="text-gray-400 font-black text-sm tracking-widest uppercase mt-1">{format(currentDate, 'yyyy')}</p>
                 </div>
                 <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-3xl">
                    <IconButton icon={ChevronLeft} onClick={prevMonth} className="bg-white hover:bg-indigo-50" />
                    <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px]">Dziś</Button>
                    <IconButton icon={ChevronRight} onClick={nextMonth} className="bg-white hover:bg-indigo-50" />
                 </div>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 mb-6">
                 {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day) => (
                   <div key={day} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-4">
                     {day}
                   </div>
                 ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                 {calendarDays.map((day, i) => {
                   const isSelected = isSameDay(day, selectedDate);
                   const isCurrentMonth = isSameMonth(day, monthStart);
                   const dayEvents = events.filter(e => e.date === format(day, 'yyyy-MM-dd'));
                   
                   return (
                     <motion.div 
                        key={day.toString()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "aspect-square relative flex flex-col items-center justify-center rounded-[1.5rem] cursor-pointer transition-all duration-300",
                          !isCurrentMonth && "opacity-10",
                          isSelected ? "bg-[#1d1d1f] text-white shadow-2xl shadow-gray-400 scale-105 z-10" : "hover:bg-gray-50",
                          isToday(day) && !isSelected && "ring-2 ring-indigo-600 ring-offset-4 ring-offset-white"
                        )}
                        onClick={() => onDateClick(day)}
                     >
                        <span className={cn(
                          "text-xl font-black tracking-tighter",
                          isSelected ? "text-white" : "text-[#1d1d1f]"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-3 flex gap-0.5">
                             {dayEvents.slice(0, 3).map((_, idx) => (
                               <div 
                                 key={idx} 
                                 className={cn(
                                   "w-1 h-1 rounded-full",
                                   isSelected ? "bg-white/40" : "bg-indigo-400"
                                 )} 
                               />
                             ))}
                          </div>
                        )}
                     </motion.div>
                   )
                 })}
              </div>
           </Card>
        </div>

        {/* Sidebar: Details for selected day */}
        <div className="w-full lg:w-96 space-y-8">
           <Card className="bg-[#1d1d1f] text-white border-none p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <CalendarIcon size={120} />
              </div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#666] mb-2">Wybrany dzień</p>
                 <h3 className="text-4xl font-black tracking-tighter">{format(selectedDate, 'eeee', { locale: pl })}</h3>
                 <p className="text-indigo-400 font-bold mt-1">{format(selectedDate, 'd MMMM yyyy', { locale: pl })}</p>
              </div>
           </Card>

           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Harmonogram</h4>
                 <Badge variant="primary" className="bg-indigo-100 text-indigo-600">{selectedDateEvents.length}</Badge>
              </div>

              <div className="space-y-4">
                 <AnimatePresence mode="popLayout">
                    {selectedDateEvents.length > 0 ? selectedDateEvents.map((event) => (
                      <motion.div 
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                         <Card className="p-6 bg-white border-none shadow-sm hover:shadow-xl transition-all group cursor-default">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                 <Clock size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-gray-300 uppercase tracking-widest mb-0.5">{event.time}</p>
                                 <h5 className="text-lg font-black text-[#1d1d1f] tracking-tight truncate group-hover:text-indigo-600 transition-colors uppercase">{event.title}</h5>
                              </div>
                              <IconButton 
                                icon={MoreHorizontal} 
                                className="opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => { hapticFeedback('heavy'); deleteDoc(doc(db, 'planner', event.id)); }}
                              />
                           </div>
                         </Card>
                      </motion.div>
                    )) : (
                      <div className="py-12 px-6 text-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-white">
                         <p className="text-gray-300 font-bold italic">Brak zaplanowanych wydarzeń na ten dzień.</p>
                      </div>
                    )}
                 </AnimatePresence>
              </div>

              <Button variant="primary" className="w-full py-6 text-base shadow-indigo-600/20" onClick={() => setIsAdding(true)}>
                 <Plus size={24} className="mr-3" /> Dodaj wydarzenie
              </Button>
           </div>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={() => setIsAdding(true)} />

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowe Wydarzenie">
         <form onSubmit={addEvent} className="space-y-12">
            <div className="space-y-10">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Co planujesz?</label>
                  <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mr-6">
                      <Sparkles size={24} />
                    </div>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Np. Spotkanie z klientem..." 
                      className="w-full text-3xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent leading-none" 
                      value={eventTitle} 
                      onChange={(e) => setEventTitle(e.target.value)} 
                      required
                    />
                 </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Godzina</label>
                  <div className="flex items-center group bg-gray-50 p-6 rounded-[2.5rem] focus-within:ring-4 focus-within:ring-indigo-100 transition-all w-full max-w-[220px]">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm mr-6">
                      <Clock size={20} />
                    </div>
                    <input 
                      type="time" 
                      className="w-full text-3xl font-black border-none focus:ring-0 p-0 placeholder:text-gray-200 text-[#1d1d1f] bg-transparent leading-none" 
                      value={eventTime} 
                      onChange={(e) => setEventTime(e.target.value)} 
                    />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="py-6" onClick={() => setIsAdding(false)}>Anuluj</Button>
              <Button type="submit" className="py-6 shadow-indigo-500/40">Zapisz w kalendarzu</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
