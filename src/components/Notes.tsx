import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc,
  serverTimestamp, orderBy, Timestamp, limit
} from 'firebase/firestore';
import {
  Plus, Trash2, FileText, Search, BookOpen, Clock, Sparkles, BrainCircuit,
  Loader2, Pin, PinOff, X, SortAsc, SortDesc, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { summarizeNote } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

export interface Note {
  id: string;
  title?: string;
  content: string;
  color: string;
  tags: string[];
  pinned: boolean;
  userId: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  wordCount: number;
  charCount: number;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

const NOTE_COLORS = [
  { id: 'white',  bg: 'bg-white',      border: 'border-gray-100',    label: 'Biały' },
  { id: 'yellow', bg: 'bg-amber-50',   border: 'border-amber-100',   label: 'Żółty' },
  { id: 'blue',   bg: 'bg-blue-50',    border: 'border-blue-100',    label: 'Niebieski' },
  { id: 'green',  bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Zielony' },
  { id: 'pink',   bg: 'bg-rose-50',    border: 'border-rose-100',    label: 'Różowy' },
  { id: 'purple', bg: 'bg-violet-50',  border: 'border-violet-100',  label: 'Fioletowy' },
  { id: 'orange', bg: 'bg-orange-50',  border: 'border-orange-100',  label: 'Pomarańczowy' },
  { id: 'teal',   bg: 'bg-teal-50',    border: 'border-teal-100',    label: 'Morski' },
];

const NOTE_TAGS = [
  'Praca', 'Osobiste', 'Pomysł', 'Cel', 'Ważne', 'Do zrobienia',
  'Projekt', 'Idea', 'Spotkanie', 'Badanie', 'Plan', 'Notatka',
];

const NOTE_CATEGORIES = [
  { id: 'general',   label: 'Ogólne',    color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'work',      label: 'Praca',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'personal',  label: 'Osobiste',  color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'ideas',     label: 'Pomysły',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'projects',  label: 'Projekty',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'research',  label: 'Badania',   color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'meeting',   label: 'Spotkania', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'plans',     label: 'Plany',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'learning',  label: 'Nauka',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'diary',     label: 'Dziennik',  color: 'bg-violet-100 text-violet-700 border-violet-200' },
];

const TAG_COLORS: Record<string, string> = {
  Praca:        'bg-indigo-100 text-indigo-700',
  Osobiste:     'bg-pink-100 text-pink-700',
  Pomysł:       'bg-amber-100 text-amber-700',
  Cel:          'bg-green-100 text-green-700',
  Ważne:        'bg-red-100 text-red-700',
  'Do zrobienia': 'bg-orange-100 text-orange-700',
  Projekt:      'bg-blue-100 text-blue-700',
  Idea:         'bg-violet-100 text-violet-700',
  Spotkanie:    'bg-teal-100 text-teal-700',
  Badanie:      'bg-purple-100 text-purple-700',
  Plan:         'bg-cyan-100 text-cyan-700',
  Notatka:      'bg-gray-100 text-gray-700',
};

function getNoteColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

function getCategoryColor(id: string) {
  return NOTE_CATEGORIES.find(c => c.id === id)?.color ?? 'bg-gray-100 text-gray-700';
}

type SortMode = 'newest' | 'oldest' | 'az';

export default function Notes() {
  const [user] = useAuthState(auth);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('white');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteCategory, setNoteCategory] = useState('general');
  const [notePriority, setNotePriority] = useState<'low' | 'medium' | 'high'>('medium');

  // List state
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { showToast } = useToast();
  const { isOffline } = useOffline();

  const handleError = useCallback((err: unknown, operation: string) => {
    const msg = (err as any)?.message || `Wystąpił błąd podczas ${operation}`;
    setError(msg);
    if (!isOffline) showToast({ type: 'error', message: msg });
  }, [showToast, isOffline]);

  // Firestore listener
  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'notes'),
        where('userId', '==', user.uid),
        orderBy('pinned', 'desc'),
        orderBy('updatedAt', 'desc'),
        limit(500)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const notesData = snapshot.docs.map(d => {
            const data = d.data();
            if (!data.content || typeof data.content !== 'string') return null;
            const c = String(data.content).trim();
            return {
              id: d.id,
              title: data.title ? String(data.title).trim() : undefined,
              content: c,
              color: data.color || 'white',
              tags: data.tags || [],
              pinned: data.pinned || false,
              userId: data.userId || user.uid,
              createdAt: data.createdAt || serverTimestamp(),
              updatedAt: data.updatedAt || serverTimestamp(),
              wordCount: c.split(/\s+/).length,
              charCount: c.length,
              category: data.category || 'general',
              priority: data.priority || 'medium',
            } as Note;
          }).filter((n): n is Note => n !== null);

          setNotes(notesData);
          setLoading(false);
          setError(null);
        } catch (e) {
          handleError(e, 'przetwarzania notatek');
          setNotes([]);
          setLoading(false);
        }
      }, (err) => {
        handleError(err, 'pobierania notatek');
        setNotes([]);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'notes');
      });

      return () => unsubscribe();
    } catch (e) {
      handleError(e, 'konfiguracji nasłuchiwania');
      setNotes([]);
      setLoading(false);
    }
  }, [user, handleError]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteColor('white');
    setNoteTags([]);
    setNoteCategory('general');
    setNotePriority('medium');
  }, []);

  const saveNote = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedContent || !user) {
      if (!trimmedContent) showToast({ type: 'warning', message: 'Treść notatki jest wymagana' });
      return;
    }
    if (trimmedContent.length < 10) {
      showToast({ type: 'warning', message: 'Treść musi mieć co najmniej 10 znaków' });
      return;
    }
    if (trimmedContent.length > 10000) {
      showToast({ type: 'warning', message: 'Tresc nie moze przekraczac 10 000 znakow' });
      return;
      showToast({ type: 'warning', message: 'Treść nie może przekraczać 50 000 znaków' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można zapisać notatki w trybie offline' });
      return;
    }

    try {
      const noteData = {
        title: trimmedTitle || undefined,
        content: trimmedContent,
        color: noteColor,
        tags: noteTags,
        category: noteCategory,
        priority: notePriority,
        pinned: editingNote?.pinned ?? false,
        userId: user.uid,
        wordCount: trimmedContent.split(/\s+/).length,
        charCount: trimmedContent.length,
        updatedAt: serverTimestamp(),
      };

      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), noteData);
        showToast({ type: 'success', message: 'Notatka zaktualizowana' });
      } else {
        await addDoc(collection(db, 'notes'), { ...noteData, createdAt: serverTimestamp() });
        showToast({ type: 'success', message: 'Notatka dodana' });
      }

      hapticFeedback('medium');
      closeModal();
    } catch (e) {
      handleError(e, 'zapisywania notatki');
      showToast({ type: 'error', message: 'Nie udało się zapisać notatki' });
    }
  }, [title, content, noteColor, noteTags, noteCategory, notePriority, editingNote, user, isOffline, showToast, handleError, closeModal]);

  const togglePin = useCallback(async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można zaktualizować przypięcia w trybie offline' });
      return;
    }
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: !note.pinned } : n));
    hapticFeedback('light');
    try {
      await updateDoc(doc(db, 'notes', note.id), { pinned: !note.pinned, updatedAt: serverTimestamp() });
      showToast({ type: 'success', message: note.pinned ? 'Odpięto' : 'Przypięto' });
    } catch (e) {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: note.pinned } : n));
      handleError(e, 'zmiany przypięcia');
    }
  }, [isOffline, showToast, handleError]);

  const deleteNote = useCallback(async (id: string) => {
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można usunąć notatki w trybie offline' });
      return;
    }
    const noteToDelete = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    hapticFeedback('heavy');
    setDeleteConfirm(null);
    try {
      await deleteDoc(doc(db, 'notes', id));
      showToast({ type: 'success', message: 'Notatka usunięta' });
    } catch (e) {
      if (noteToDelete) setNotes(prev => [...prev, noteToDelete]);
      handleError(e, 'usuwania notatki');
    }
  }, [isOffline, showToast, handleError, notes]);

  const openNewNote = () => {
    setEditingNote(null);
    setTitle(''); setContent(''); setNoteColor('white'); setNoteTags([]);
    setNoteCategory('general'); setNotePriority('medium');
    setIsModalOpen(true);
    hapticFeedback('light');
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title || '');
    setContent(note.content);
    setNoteColor(note.color || 'white');
    setNoteTags(note.tags || []);
    setNoteCategory(note.category || 'general');
    setNotePriority(note.priority || 'medium');
    setIsModalOpen(true);
    hapticFeedback('light');
  };

  const handleAiSummarize = useCallback(async () => {
    if (content.length < 50) {
      showToast({ type: 'warning', message: 'Treść musi mieć co najmniej 50 znaków do podsumowania' });
      return;
    }
    if (isOffline) {
      showToast({ type: 'offline', message: 'Nie można użyć AI w trybie offline' });
      return;
    }
    setIsSummarizing(true);
    hapticFeedback('medium');
    try {
      const summary = await summarizeNote(content);
      if (!title) {
        setTitle(`Streszczenie: ${summary}`);
      } else {
        setContent(prev => `${prev}\n\n📝 Streszczenie AI:\n${summary}`);
      }
      hapticFeedback('heavy');
      showToast({ type: 'success', message: 'Streszczenie wygenerowane' });
    } catch (e) {
      handleError(e, 'generowania streszczenia AI');
    } finally {
      setIsSummarizing(false);
    }
  }, [content, title, isOffline, showToast, handleError]);

  const toggleTag = (tag: string) => {
    setNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = !search ||
        (note.title?.toLowerCase().includes(search.toLowerCase())) ||
        note.content.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !filterTag || note.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [notes, search, filterTag]);

  const sortedNotes = useMemo(() => {
    const sorted = [...filteredNotes];
    if (sortMode === 'az') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pl'));
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => {
        const dA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
        const dB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
        return dA.getTime() - dB.getTime();
      });
    } else {
      sorted.sort((a, b) => {
        const dA = a.updatedAt instanceof Timestamp ? a.updatedAt.toDate() : new Date(a.updatedAt);
        const dB = b.updatedAt instanceof Timestamp ? b.updatedAt.toDate() : new Date(b.updatedAt);
        return dB.getTime() - dA.getTime();
      });
    }
    return sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [filteredNotes, sortMode]);

  const totalNotes = notes.length;
  const pinnedNotes = notes.filter(n => n.pinned).length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="space-y-12 pb-40">
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-600" />
            <div>
              <h4 className="font-bold text-rose-900">Błąd</h4>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-800 text-sm font-medium">
              X
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Archiwum"
        subtitle="Miejsce na Twoje myśli, wizje i plany."
        action={
          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Aktywne</p>
              <p className="text-lg font-bold text-indigo-600">{totalNotes}</p>
            </div>
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Przypięte</p>
              <p className="text-lg font-bold text-rose-600">{pinnedNotes}</p>
            </div>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Szukaj w notatkach..."
              className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none font-extrabold text-lg transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Card className="bg-[#1d1d1f] text-white border-none p-8 relative overflow-hidden">
            <Sparkles size={80} className="absolute -top-5 -right-5 opacity-10" />
            <div className="relative z-10">
              <h4 className="text-4xl font-black tracking-tighter mb-1">{totalNotes}</h4>
              <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Wszystkich wpisów</p>
              {pinnedNotes > 0 && (
                <p className="text-indigo-400 text-xs font-bold mt-2">📌 {pinnedNotes} przypięte</p>
              )}
            </div>
          </Card>

          {/* Sort */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Sortowanie</p>
            <div className="flex flex-col gap-1">
              {([['newest', 'Najnowsze'], ['oldest', 'Najstarsze'], ['az', 'A → Z']] as [SortMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left',
                    sortMode === mode ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {mode === 'newest' ? <SortDesc size={13} /> : <SortAsc size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Filtruj po tagu</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTag(null)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-all',
                  !filterTag ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                Wszystkie
              </button>
              {NOTE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold transition-all',
                    filterTag === tag ? TAG_COLORS[tag] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" className="w-full py-6 text-base" onClick={openNewNote}>
            <Plus size={24} className="mr-3" /> Nowa notatka
          </Button>
        </div>

        {/* Notes grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {sortedNotes.length > 0 ? sortedNotes.map((note, idx) => {
                  const col = getNoteColor(note.color || 'white');
                  return (
                    <motion.div
                      layout
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Card
                        className={cn(
                          'p-7 h-full flex flex-col group cursor-pointer hover:border-gray-200 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-xl relative',
                          col.bg, col.border
                        )}
                        onClick={() => openEditNote(note)}
                      >
                        {note.pinned && (
                          <div className="absolute top-3 right-3 text-indigo-500">
                            <Pin size={14} className="fill-indigo-400" />
                          </div>
                        )}
                        {note.priority === 'high' && (
                          <div className="absolute top-3 left-3">
                            <div className="w-2 h-2 bg-rose-500 rounded-full" />
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-5">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                            <FileText size={20} />
                          </div>
                          <div className="flex gap-1">
                            <IconButton
                              icon={note.pinned ? PinOff : Pin}
                              onClick={(e) => togglePin(note, e)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 p-2 bg-white/80 transition-all"
                            />
                            {deleteConfirm === note.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button type="button" title="Usuń" onClick={() => deleteNote(note.id)} className="p-1.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600">
                                  <X size={12} />
                                </button>
                                <button type="button" title="Anuluj" onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300">
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <IconButton
                                icon={Trash2}
                                onClick={e => { e.stopPropagation(); hapticFeedback('heavy'); setDeleteConfirm(note.id); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-600 p-2 bg-white/80 transition-all"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 space-y-2 mb-4">
                          {note.title && (
                            <h3 className={cn(
                              'text-xl font-black text-[#1d1d1f] tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors',
                              note.priority === 'high' && 'text-rose-600'
                            )}>
                              {note.title}
                            </h3>
                          )}
                          <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed font-medium">
                            {note.content}
                          </p>
                        </div>

                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {note.tags.map(tag => (
                              <span key={tag} className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', TAG_COLORS[tag] || 'bg-gray-100 text-gray-600')}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {note.category && note.category !== 'general' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getCategoryColor(note.category))}>
                              {NOTE_CATEGORIES.find(c => c.id === note.category)?.label || note.category}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            <Clock size={11} />
                            <span>{format(note.updatedAt instanceof Timestamp ? note.updatedAt.toDate() : new Date(note.updatedAt), 'd MMM yyyy', { locale: pl })}</span>
                          </div>
                          <span className="text-[10px] text-gray-300 font-medium">
                            {note.wordCount} słów
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-full bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                      <BookOpen size={48} />
                    </div>
                    <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Pusto tu...</h4>
                    <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Twoje archiwum czeka na pierwsze wpisy.</p>
                    <Button variant="secondary" className="mt-10" onClick={openNewNote}>Zacznij pisać</Button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={openNewNote} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingNote ? 'Edytuj wpis' : 'Nowa notatka'}>
        <form onSubmit={saveNote} className="space-y-7">
          {/* Color picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kolor notatki</label>
            <div className="flex gap-2 flex-wrap">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setNoteColor(c.id)}
                  className={cn(
                    'w-8 h-8 rounded-xl border-2 transition-all',
                    c.bg,
                    noteColor === c.id ? 'border-indigo-500 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {noteColor === c.id && <span className="flex items-center justify-center text-indigo-600 text-xs font-black">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setNoteCategory(category.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                    noteCategory === category.id
                      ? category.color + ' border-current'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Priorytet</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(priority => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setNotePriority(priority)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                    notePriority === priority
                      ? priority === 'high' ? 'bg-rose-500 text-white border-rose-500'
                        : priority === 'medium' ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                  )}
                >
                  {priority === 'low' ? 'Niski' : priority === 'medium' ? 'Średni' : 'Wysoki'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Tagi</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                    noteTags.includes(tag)
                      ? (TAG_COLORS[tag] || 'bg-gray-200 text-gray-700') + ' border-current'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Tytuł (opcjonalnie)</label>
            <input
              type="text"
              placeholder="Nadaj tytuł..."
              className="w-full bg-transparent p-4 rounded-2xl border-none focus:ring-0 font-black text-3xl outline-none placeholder:text-gray-200 text-[#1d1d1f]"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Treść</label>
            <textarea
              autoFocus
              placeholder="Zacznij pisać swoją historię..."
              className="w-full bg-gray-50/50 p-7 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-medium text-lg outline-none transition-all min-h-[250px] resize-none leading-relaxed text-gray-700"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
            <div className="flex items-center justify-between px-2 mt-1">
              <span className="text-[10px] text-gray-300 font-medium">{wordCount} słów · {charCount} znaków</span>
              <button
                type="button"
                onClick={handleAiSummarize}
                disabled={isSummarizing || charCount < 50}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  isSummarizing || charCount < 50
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                {isSummarizing ? <Loader2 size={13} className="animate-spin" /> : <BrainCircuit size={13} />}
                AI Streszczenie
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="ghost" className="py-5" onClick={closeModal}>Anuluj</Button>
            <Button type="submit" className="py-5">Zapisz w archiwum</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
