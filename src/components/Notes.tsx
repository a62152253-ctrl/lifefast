import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, FileText, Search, BookOpen, Clock, Sparkles, BrainCircuit, Loader2, Pin, PinOff, Tag, X, SortAsc, SortDesc } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { summarizeNote } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';

const NOTE_COLORS = [
  { id: 'white',  bg: 'bg-white',        border: 'border-gray-100' },
  { id: 'yellow', bg: 'bg-amber-50',     border: 'border-amber-100' },
  { id: 'blue',   bg: 'bg-blue-50',      border: 'border-blue-100' },
  { id: 'green',  bg: 'bg-emerald-50',   border: 'border-emerald-100' },
  { id: 'pink',   bg: 'bg-rose-50',      border: 'border-rose-100' },
  { id: 'purple', bg: 'bg-violet-50',    border: 'border-violet-100' },
];

const NOTE_TAGS = ['Praca', 'Osobiste', 'Pomysł', 'Cel', 'Ważne', 'Do zrobienia'];

const TAG_COLORS: Record<string, string> = {
  Praca:        'bg-indigo-100 text-indigo-700',
  Osobiste:     'bg-pink-100 text-pink-700',
  Pomysł:       'bg-amber-100 text-amber-700',
  Cel:          'bg-emerald-100 text-emerald-700',
  Ważne:        'bg-rose-100 text-rose-700',
  'Do zrobienia': 'bg-violet-100 text-violet-700',
};

function getNoteColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

type SortMode = 'newest' | 'oldest' | 'az';

export default function Notes() {
  const [user] = useAuthState(auth);
  const [notes, setNotes] = useState<any[]>([]);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('white');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('pinned', 'desc'),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => handleFirestoreError(err, OperationType.LIST, 'notes'));
  }, [user]);

  const saveNote = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!content.trim() || !user) {
      if (!content.trim()) {
        showToast({
          type: 'warning',
          message: 'Wpisz treść notatki',
        });
      }
      return;
    }
    
    if (isOffline) {
      showToast({
        type: 'offline',
        message: 'Nie można zapisać notatki w trybie offline',
      });
      return;
    }
    
    try {
      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), {
          title, content, color: noteColor, tags: noteTags, updatedAt: serverTimestamp()
        });
        showToast({
          type: 'success',
          message: 'Notatka zaktualizowana',
        });
      } else {
        await addDoc(collection(db, 'notes'), {
          title, content, color: noteColor, tags: noteTags,
          userId: user.uid, pinned: false,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        showToast({
          type: 'success',
          message: 'Notatka dodana',
        });
      }
      hapticFeedback('medium');
      closeModal();
    } catch (err) { 
      console.error('Error saving note:', err);
      handleFirestoreError(err, OperationType.WRITE, 'notes');
      showToast({
        type: 'error',
        message: 'Nie udało się zapisać notatki',
      });
    }
  };

  const togglePin = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback('light');
    try {
      await updateDoc(doc(db, 'notes', note.id), { pinned: !note.pinned, updatedAt: serverTimestamp() });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'notes'); }
  };

  const deleteNote = async (id: string) => {
    hapticFeedback('heavy');
    try { await deleteDoc(doc(db, 'notes', id)); setDeleteConfirm(null); } catch (err) { console.error(err); }
  };

  const openNewNote = () => {
    setEditingNote(null); setTitle(''); setContent(''); setNoteColor('white'); setNoteTags([]);
    setIsModalOpen(true); hapticFeedback('light');
  };

  const openEditNote = (note: any) => {
    setEditingNote(note);
    setTitle(note.title || '');
    setContent(note.content);
    setNoteColor(note.color || 'white');
    setNoteTags(note.tags || []);
    setIsModalOpen(true); hapticFeedback('light');
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingNote(null);
    setTitle(''); setContent(''); setNoteColor('white'); setNoteTags([]);
  };

  const handleAiSummarize = async () => {
    if (!content || content.length < 50) return;
    setIsSummarizing(true);
    hapticFeedback('medium');
    try {
      const summary = await summarizeNote(content);
      // Replace content with summary appended, set title if empty
      if (!title) setTitle(summary);
      else setContent(prev => `${prev}\n\n📝 Streszczenie AI:\n${summary}`);
      hapticFeedback('heavy');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const toggleTag = (tag: string) => {
    setNoteTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => {
      const matchSearch = !search ||
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase());
      const matchTag = !filterTag || (n.tags || []).includes(filterTag);
      return matchSearch && matchTag;
    });

    if (sortMode === 'oldest') {
      result = [...result].sort((a, b) =>
        (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
      );
    } else if (sortMode === 'az') {
      result = [...result].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pl'));
    }
    // 'newest' is default from Firestore query (pinned desc, updatedAt desc)

    return result;
  }, [notes, search, filterTag, sortMode]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="space-y-12 pb-40">
      <PageHeader
        title="Archiwum"
        subtitle="Miejsce na Twoje myśli, wizje i plany."
      />

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left sidebar */}
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

          {/* Stats */}
          <Card className="bg-[#1d1d1f] text-white border-none p-8 relative overflow-hidden">
            <Sparkles size={80} className="absolute -top-5 -right-5 opacity-10" />
            <div className="relative z-10">
              <h4 className="text-4xl font-black tracking-tighter mb-1">{notes.length}</h4>
              <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Wszystkich wpisów</p>
              {notes.filter(n => n.pinned).length > 0 && (
                <p className="text-indigo-400 text-xs font-bold mt-2">
                  📌 {notes.filter(n => n.pinned).length} przypięte
                </p>
              )}
            </div>
          </Card>

          {/* Sort */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Sortowanie</p>
            <div className="flex flex-col gap-1">
              {([['newest', 'Najnowsze'], ['oldest', 'Najstarsze'], ['az', 'A → Z']] as [SortMode, string][]).map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left',
                    sortMode === mode ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {mode === 'az' ? <SortAsc size={13} /> : mode === 'newest' ? <SortDesc size={13} /> : <SortAsc size={13} />}
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
                  type="button"
                  key={tag}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredNotes.length > 0 ? filteredNotes.map((note, idx) => {
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
                      {/* Pin badge */}
                      {note.pinned && (
                        <div className="absolute top-3 right-3 text-indigo-500">
                          <Pin size={14} className="fill-indigo-400" />
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
                              <button type="button" title="Usuń notatkę" onClick={() => deleteNote(note.id)} className="p-1.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600">
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
                          <h3 className="text-xl font-black text-[#1d1d1f] tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                            {note.title}
                          </h3>
                        )}
                        <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed font-medium">
                          {note.content}
                        </p>
                      </div>

                      {/* Tags */}
                      {(note.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(note.tags as string[]).map(tag => (
                            <span key={tag} className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', TAG_COLORS[tag] || 'bg-gray-100 text-gray-600')}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          <Clock size={11} />
                          <span>{format(note.updatedAt?.toDate?.() || new Date(), 'd MMM yyyy', { locale: pl })}</span>
                        </div>
                        <span className="text-[10px] text-gray-300 font-medium">
                          {note.content?.trim().split(/\s+/).length || 0} słów
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
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={openNewNote} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingNote ? 'Edytuj wpis' : 'Nowa notatka'}>
        <form onSubmit={saveNote} className="space-y-7">
          {/* Color picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kolor notatki</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
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
                      ? TAG_COLORS[tag] + ' border-current'
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
