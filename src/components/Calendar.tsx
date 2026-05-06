import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  collection, onSnapshot, query, where, doc, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Calendar as CalendarIcon, Sparkles, Tag
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, isToday
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Button, IconButton, PageHeader, Modal } from './CommonUI';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';

const EVENT_CATEGORIES = [
  { id: 'work',     label: 'Praca',     color: 'bg-indigo-500', dot: 'bg-indigo-400', light: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'health',   label: 'Zdrowie',   color: 'bg-emerald-500', dot: 'bg-emerald-400', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'social',   label: 'Spotkanie', color: 'bg-amber-500',   dot: 'bg-amber-400',   light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'personal', label: 'Osobiste',  color: 'bg-violet-500',  dot: 'bg-violet-400',  light: 'bg-violet-50 text-violet-700 border-violet-100' },
  { id: 'other',    label: 'Inne',      color: 'bg-gray-400',    dot: 'bg-gray-300',    light: 'bg-gray-50 text-gray-600 border-gray-100' },
];

function getCategory(id: string) {
  return EVENT_CATEGORIES.find(c => c.id === id) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
}

export default function Calendar() {
  const [user] = useAuthState(auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('12:00');
  const [eventCategory, setEventCategory] = useState('work');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'planner'), where('userId', '==', user.uid));
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const nextMonth = () => { hapticFeedback('light'); setCurrentDate(addMonths(currentDate, 1)); };
  const prevMonth = () => { hapticFeedback('light'); setCurrentDate(subMonths(currentDate, 1)); };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !user) return;
    const eventId = Math.random().toString(36).substring(7);
    try {
      await setDoc(doc(db, 'planner', `event_${eventId}`), {
        title: eventTitle,
        time: eventTime,
        category: eventCategory,
        date: format(selectedDate, 'yyyy-MM-dd'),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setEventTitle(''); setIsAdding(false);
      hapticFeedback('medium');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'planner'); }
  };

  const deleteEvent = async (id: string) => {
    hapticFeedback('heavy');
    try { await deleteDoc(doc(db, 'planner', id)); } catch (err) { console.error(err); }
  };

  const monthStart   = startOfMonth(currentDate);
  const monthEnd     = endOfMonth(monthStart);
  const startDate    = startOfWeek(monthStart, { locale: pl });
  const endDate      = endOfWeek(monthEnd, { locale: pl });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDateEvents = events
    .filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const upcomingEvents = events
    .filter(e => {
      try { return new Date(e.date) >= new Date(format(new Date(), 'yyyy-MM-dd')); } catch { return false; }
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  return (
    <div className="space-y-10 pb-28">
      <PageHeader
        title="Kalendarz"
        subtitle="Twój widok czasu i nadchodzących wydarzeń."
        action={
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <Plus size={16} className="mr-1" /> Dodaj
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-[#1d1d1f] tracking-tighter capitalize">
                {format(currentDate, 'LLLL', { locale: pl })}
              </h2>
              <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-0.5">
                {format(currentDate, 'yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <IconButton icon={ChevronLeft} onClick={prevMonth} className="bg-gray-50 hover:bg-indigo-50" />
              <button
                onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                Dziś
              </button>
              <IconButton icon={ChevronRight} onClick={nextMonth} className="bg-gray-50 hover:bg-indigo-50" />
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-3">
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const isSelected   = isSameDay(day, selectedDate);
              const inMonth      = isSameMonth(day, monthStart);
              const dayEvents    = events.filter(e => e.date === format(day, 'yyyy-MM-dd'));
              const isCurrentDay = isToday(day);

              return (
                <motion.button
                  key={day.toString()}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { hapticFeedback('light'); setSelectedDate(day); }}
                  className={cn(
                    'aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200',
                    !inMonth && 'opacity-20',
                    isSelected && 'bg-[#1d1d1f] text-white shadow-lg',
                    !isSelected && isCurrentDay && 'ring-2 ring-indigo-400 ring-offset-2',
                    !isSelected && !isCurrentDay && 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn(
                    'text-sm font-black',
                    isSelected ? 'text-white' : 'text-[#1d1d1f]'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => {
                        const cat = getCategory(ev.category || 'other');
                        return (
                          <div key={i} className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/50' : cat.dot)} />
                        );
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Selected day card */}
          <div className="bg-[#1d1d1f] text-white rounded-[2rem] p-7">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Wybrany dzień</p>
            <h3 className="text-2xl font-black tracking-tighter capitalize">
              {format(selectedDate, 'EEEE', { locale: pl })}
            </h3>
            <p className="text-indigo-400 font-bold text-sm mt-0.5">
              {format(selectedDate, 'd MMMM yyyy', { locale: pl })}
            </p>

            <div className="mt-5 space-y-3">
              {selectedDateEvents.length === 0 ? (
                <p className="text-white/30 text-sm italic">Brak wydarzeń</p>
              ) : selectedDateEvents.map(ev => {
                const cat = getCategory(ev.category || 'other');
                return (
                  <div key={ev.id} className="flex items-center gap-3 group">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', cat.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{ev.title}</p>
                      <p className="text-[10px] text-white/40">{ev.time}</p>
                    </div>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsAdding(true)}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 border border-white/20 rounded-2xl text-white/60 hover:text-white hover:border-white/40 transition-all text-xs font-black uppercase tracking-widest"
            >
              <Plus size={14} /> Dodaj wydarzenie
            </button>
          </div>

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Nadchodzące</p>
              <div className="space-y-3">
                {upcomingEvents.map(ev => {
                  const cat = getCategory(ev.category || 'other');
                  return (
                    <div key={ev.id} className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border', cat.light)}>
                        <Clock size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1d1d1f] truncate">{ev.title}</p>
                        <p className="text-[10px] text-gray-400">{ev.date} · {ev.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add event modal */}
      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Nowe wydarzenie">
        <form onSubmit={addEvent} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Nazwa</label>
            <input
              autoFocus
              type="text"
              placeholder="np. Spotkanie z klientem..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Godzina</label>
              <input
                type="time"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kategoria</label>
              <select
                value={eventCategory}
                onChange={e => setEventCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                {EVENT_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-1 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Data</label>
            <div className="px-5 py-3.5 bg-gray-50 rounded-2xl text-sm font-bold text-[#1d1d1f] border border-gray-100">
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: pl })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Anuluj</Button>
            <Button type="submit">Zapisz</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
