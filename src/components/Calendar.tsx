import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  collection, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp, orderBy, limit
} from 'firebase/firestore';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Pencil, Check, X, AlignLeft, AlertTriangle
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, isToday,
  differenceInCalendarDays, parseISO
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Button, IconButton, PageHeader, Modal } from './CommonUI';
import { handleFirestoreError, OperationType } from '../lib/db';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  category: string;
  userId: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  // stored as 'time' in Firestore for legacy compatibility
  time?: string;
}

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

function relativeDay(dateStr: string): string {
  const diff = differenceInCalendarDays(parseISO(dateStr), new Date());
  if (diff === 0) return 'Dziś';
  if (diff === 1) return 'Jutro';
  if (diff === 2) return 'Pojutrze';
  if (diff > 0 && diff <= 6) return `Za ${diff} dni`;
  return format(parseISO(dateStr), 'd MMM', { locale: pl });
}

export default function Calendar(): React.ReactElement {
  const [user] = useAuthState(auth);
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isAdding, setIsAdding]         = useState(false);
  const { showToast } = useToast();
  const { isOffline } = useOffline();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [eventTitle, setEventTitle]       = useState('');
  const [eventTime, setEventTime]         = useState('12:00');
  const [eventCategory, setEventCategory] = useState('work');
  const [eventDesc, setEventDesc]         = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [allDay, setAllDay]               = useState(false);

  const handleError = useCallback((err: any, operation: string) => {
    const msg = err?.message || `Wystąpił błąd podczas ${operation}`;
    setError(msg);
    if (!isOffline) showToast({ type: 'error', message: msg });
  }, [showToast, isOffline]);

  useEffect(() => {
    if (!user) { setEvents([]); setLoading(false); setError(null); return; }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'calendarEvents'),
        where('userId', '==', user.uid),
        orderBy('date', 'asc'),
        orderBy('time', 'asc'),
        limit(1000)
      );

      const unsubscribe = onSnapshot(q, snapshot => {
        try {
          const eventsData = snapshot.docs.map(d => {
            const data = d.data();
            if (!data.title || !data.date || !data.userId) return null;
            return {
              id: d.id,
              title: String(data.title).trim(),
              description: data.description ? String(data.description).trim() : undefined,
              date: data.date,
              time: data.time || undefined,
              allDay: data.allDay || false,
              category: data.category || 'other',
              userId: data.userId || user.uid,
              createdAt: data.createdAt || serverTimestamp(),
              updatedAt: data.updatedAt,
              location: data.location,
              isRecurring: data.isRecurring || false,
              recurringPattern: data.recurringPattern,
              priority: data.priority || 'medium',
              tags: data.tags || [],
            } as CalendarEvent;
          }).filter((e): e is CalendarEvent => e !== null);

          setEvents(eventsData);
          setLoading(false);
          setError(null);
        } catch (err) {
          handleError(err, 'processing calendar events');
          setEvents([]);
          setLoading(false);
        }
      }, err => {
        handleError(err, 'fetching calendar events');
        setEvents([]);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'calendarEvents');
      });

      return () => unsubscribe();
    } catch (err) {
      handleError(err, 'setting up calendar listener');
      setEvents([]);
      setLoading(false);
    }
  }, [user, handleError]);

  const nextMonth = useCallback(() => setCurrentDate(d => addMonths(d, 1)), []);
  const prevMonth = useCallback(() => setCurrentDate(d => subMonths(d, 1)), []);

  const openAdd = useCallback(() => {
    setEditingEvent(null);
    setEventTitle('');
    setEventTime('12:00');
    setEventCategory('work');
    setEventDesc('');
    setEventLocation('');
    setAllDay(false);
    setError(null);
    setIsAdding(true);
  }, []);

  const openEdit = useCallback((ev: CalendarEvent) => {
    if (!ev) return;
    setEditingEvent(ev);
    setEventTitle(ev.title);
    setEventTime(ev.startTime || ev.time || '12:00');
    setEventCategory(ev.category || 'work');
    setEventDesc(ev.description || '');
    setEventLocation(ev.location || '');
    setAllDay(ev.allDay || false);
    setError(null);
    setIsAdding(true);
  }, []);

  const saveEvent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle    = eventTitle.trim();
    const trimmedDesc     = eventDesc.trim();
    const trimmedLocation = eventLocation.trim();

    if (!trimmedTitle || !user) {
      if (!trimmedTitle) showToast({ type: 'warning', message: 'Wpisz nazwę wydarzenia' });
      return;
    }
    if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
      showToast({ type: 'warning', message: 'Nazwa musi mieć od 2 do 100 znaków' });
      return;
    }
    if (trimmedDesc && trimmedDesc.length > 500) {
      showToast({ type: 'warning', message: 'Opis nie może przekraczać 500 znaków' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można zapisać wydarzenia w trybie offline' });
      return;
    }
    if (!allDay && eventTime && !/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(eventTime)) {
      showToast({ type: 'warning', message: 'Wpisz poprawną godzinę (HH:MM)' });
      return;
    }

    try {
      const payload = {
        title: trimmedTitle,
        time: allDay ? '' : eventTime,
        allDay,
        category: eventCategory,
        description: trimmedDesc || undefined,
        location: trimmedLocation || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'calendarEvents', editingEvent.id), payload);
        showToast({ type: 'success', message: 'Wydarzenie zaktualizowane' });
      } else {
        const eventId = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'calendarEvents', `event_${eventId}`), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        showToast({ type: 'success', message: 'Wydarzenie dodane' });
      }

      setIsAdding(false);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      handleError(err, 'saving event');
    }
  }, [eventTitle, eventDesc, eventLocation, eventTime, allDay, eventCategory, selectedDate, user, editingEvent, isOffline, showToast, handleError]);

  const deleteEvent = useCallback(async (id: string) => {
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można usunąć wydarzenia w trybie offline' });
      return;
    }
    if (navigator.vibrate) navigator.vibrate(100);
    try {
      await deleteDoc(doc(db, 'calendarEvents', id));
      setDeleteConfirm(null);
      showToast({ type: 'success', message: 'Wydarzenie usunięte' });
    } catch (err) {
      handleError(err, 'deleting event');
    }
  }, [isOffline, showToast, handleError]);

  const monthStart   = startOfMonth(currentDate);
  const monthEnd     = endOfMonth(monthStart);
  const startDate    = startOfWeek(monthStart, { locale: pl });
  const endDate      = endOfWeek(monthEnd, { locale: pl });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDateEvents = events
    .filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const today = format(new Date(), 'yyyy-MM-dd');

  const upcomingEvents = events
    .filter(e => { try { return new Date(e.date) >= new Date(today); } catch { return false; } })
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 7);

  return (
    <div className="space-y-10 pb-28">
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-600" />
            <div>
              <h4 className="font-bold text-rose-900">Błąd</h4>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-800 text-sm font-medium">X</button>
          </div>
        </div>
      )}

      <PageHeader
        title="Kalendarz"
        subtitle="Twój widok czasu i nadchodzących wydarzeń."
        action={
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} className="mr-1" /> Dodaj
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
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

          <div className="grid grid-cols-7 mb-3">
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

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
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(30);
                    setSelectedDate(day);
                  }}
                  className={cn(
                    'aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200',
                    !inMonth && 'opacity-20',
                    isSelected && 'bg-[#1d1d1f] text-white shadow-lg',
                    !isSelected && isCurrentDay && 'ring-2 ring-indigo-400 ring-offset-2',
                    !isSelected && !isCurrentDay && 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn('text-sm font-black', isSelected ? 'text-white' : 'text-[#1d1d1f]')}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => {
                        const cat = getCategory(ev.category || 'other');
                        return <div key={i} className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-white/50' : cat.dot)} />;
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-gray-50">
            {EVENT_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', cat.dot)} />
                <span className="text-[10px] text-gray-400 font-bold">{cat.label}</span>
              </div>
            ))}
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
                  <div key={ev.id} className="group">
                    {deleteConfirm === ev.id ? (
                      <div className="flex items-center gap-2 bg-rose-900/30 rounded-xl px-3 py-2">
                        <p className="text-xs text-rose-300 flex-1">Usunąć?</p>
                        <button onClick={() => deleteEvent(ev.id)} className="p-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600">
                          <Check size={12} />
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded-lg bg-white/10 text-white/50 hover:bg-white/20">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', cat.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{ev.title}</p>
                          <div className="flex items-center gap-2">
                            {ev.allDay ? (
                              <p className="text-[10px] text-white/40">Cały dzień</p>
                            ) : ev.time && (
                              <p className="text-[10px] text-white/40">{ev.time}</p>
                            )}
                            {ev.description && <AlignLeft size={10} className="text-white/30" />}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                          <button
                            onClick={() => openEdit(ev)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-indigo-300 transition-all"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ev.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                    {ev.description && (
                      <p className="text-[11px] text-white/25 mt-1 ml-5 leading-relaxed line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={openAdd}
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
                  const cat  = getCategory(ev.category || 'other');
                  const isEv = ev.date === today;
                  return (
                    <div key={ev.id} className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border', cat.light)}>
                        <Clock size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1d1d1f] truncate">{ev.title}</p>
                        <p className="text-[10px] text-gray-400">
                          <span className={cn(isEv && 'text-indigo-500 font-bold')}>{relativeDay(ev.date)}</span>
                          {!ev.allDay && ev.time && <span> · {ev.time}</span>}
                        </p>
                      </div>
                      <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full border', cat.light)}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit event modal */}
      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title={editingEvent ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}>
        <form onSubmit={saveEvent} className="space-y-5">
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

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Opis (opcjonalnie)</label>
            <textarea
              placeholder="Dodaj opis lub notatki..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none min-h-[80px]"
              value={eventDesc}
              onChange={e => setEventDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Godzina</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer px-1">
                  <div
                    onClick={() => setAllDay(!allDay)}
                    className={cn('w-9 h-5 rounded-full transition-all relative', allDay ? 'bg-indigo-600' : 'bg-gray-200')}
                  >
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', allDay ? 'left-4' : 'left-0.5')} />
                  </div>
                  <span className="text-xs text-gray-500 font-bold">Cały dzień</span>
                </label>
                {!allDay && (
                  <input
                    type="time"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    value={eventTime}
                    onChange={e => setEventTime(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kategoria</label>
              <div className="flex flex-col gap-1.5">
                {EVENT_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEventCategory(c.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                      eventCategory === c.id ? c.light + ' border-current' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full', c.dot)} />
                    {c.label}
                  </button>
                ))}
              </div>
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
            <Button type="submit">{editingEvent ? 'Zapisz zmiany' : 'Zapisz'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
