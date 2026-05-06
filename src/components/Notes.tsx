import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Badge, Modal } from './CommonUI';
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
import { Plus, Edit2, Trash2, FileText, Search, BookOpen, Clock, Sparkles, X, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/db';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { summarizeNote } from '../services/geminiService';

const NOTE_COLORS = [
  { id: 'white',  bg: 'bg-white',        label: '⬜' },
  { id: 'yellow', bg: 'bg-amber-50',     label: '🟡' },
  { id: 'blue',   bg: 'bg-blue-50',      label: '🔵' },
  { id: 'green',  bg: 'bg-emerald-50',   label: '🟢' },
  { id: 'pink',   bg: 'bg-rose-50',      label: '🔴' },
  { id: 'purple', bg: 'bg-violet-50',    label: '🟣' },
];
function getNoteColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

export default function Notes() {
  const [user] = useAuthState(auth);
  const [notes, setNotes] = useState<any[]>([]);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('white');
  const [search, setSearch] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'), 
      where('userId', '==', user.uid), 
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => handleFirestoreError(err, OperationType.LIST, 'notes'));
  }, [user]);

  const saveNote = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || !user) return;
    try {
      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), { title, content, color: noteColor, updatedAt: serverTimestamp() });
        hapticFeedback('medium');
      } else {
        await addDoc(collection(db, 'notes'), { title, content, color: noteColor, userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        hapticFeedback('medium');
      }
      closeModal();
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'notes'); }
  };

  const openNewNote = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteColor('white');
    setIsModalOpen(true);
    hapticFeedback('light');
  };

  const openEditNote = (note: any) => {
    setEditingNote(note);
    setTitle(note.title || '');
    setContent(note.content);
    setNoteColor(note.color || 'white');
    setIsModalOpen(true);
    hapticFeedback('light');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteColor('white');
  };

  const handleAiSummarize = async () => {
    if (!content || content.length < 50) {
      alert("Twoja notatka jest zbyt krótka, by ją streścić.");
      return;
    }
    setIsSummarizing(true);
    hapticFeedback('medium');
    try {
      const summary = await summarizeNote(content);
      if (title) {
        setTitle(`${title} (Suma: ${summary})`);
      } else {
        setTitle(summary);
      }
      hapticFeedback('heavy');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title?.toLowerCase().includes(search.toLowerCase()) || 
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-40">
      <PageHeader 
        title="Archiwum" 
        subtitle="Miejsce na Twoje myśli, wizje i plany, które wymagają opisania."
      />

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Navigation / Filters Column */}
        <div className="w-full lg:w-80 space-y-8">
           <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Szukaj w notatkach..." 
                className="w-full pl-14 pr-6 py-5 bg-white rounded-[2rem] border-none shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none font-extrabold text-lg transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>

           <Card className="bg-[#1d1d1f] text-white border-none p-10 relative overflow-hidden">
              <Sparkles size={80} className="absolute -top-5 -right-5 opacity-10" />
              <div className="relative z-10">
                 <h4 className="text-4xl font-black tracking-tighter mb-1">{notes.length}</h4>
                 <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest leading-none">Wszystkich wpisów</p>
              </div>
           </Card>

           <Button variant="primary" className="w-full py-6 text-base" onClick={openNewNote}>
             <Plus size={24} className="mr-3" /> Nowa notatka
           </Button>
        </div>

        <div className="flex-1">
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredNotes.length > 0 ? filteredNotes.map((note, idx) => (
                <motion.div
                  layout
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={cn("p-8 h-full flex flex-col group cursor-pointer hover:border-gray-200 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-xl relative", getNoteColor(note.color || 'white').bg)}
                    onClick={() => openEditNote(note)}
                  >
                    <div className="flex items-start justify-between mb-6">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          <FileText size={24} />
                       </div>
                       <IconButton 
                         icon={Trash2} 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           hapticFeedback('heavy');
                           deleteDoc(doc(db, 'notes', note.id)); 
                         }} 
                         className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-600 p-3 bg-gray-50 transition-all duration-300" 
                       />
                    </div>
                    
                    <div className="flex-1 space-y-3 mb-6">
                      {note.title && (
                         <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tighter leading-none group-hover:text-indigo-600 transition-colors">
                           {note.title}
                         </h3>
                      )}
                      <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed font-medium">
                        {note.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-auto">
                       <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          <Clock size={12} />
                          <span>{format(note.updatedAt?.toDate?.() || new Date(), 'd MMM yyyy', { locale: pl })}</span>
                       </div>
                       <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1d1d1f] transition-transform duration-500 group-hover:translate-x-1" />
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="col-span-full bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                   <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-[2.5rem] flex items-center justify-center mb-8">
                      <BookOpen size={48} />
                   </div>
                   <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">Pusto tu...</h4>
                   <p className="text-gray-400 mt-3 max-w-sm mx-auto text-lg font-medium">Twoje archiwum czeka na pierwsze wpisy. Odważysz się przelać myśli na papier?</p>
                   <Button variant="secondary" className="mt-10" onClick={openNewNote}>Zacznij pisać</Button>
                </div>
              )}
            </AnimatePresence>
           </div>
        </div>
      </div>

      <FloatingActionButton icon={Plus} onClick={openNewNote} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingNote ? 'Edytuj wpis' : 'Nowa notatka'}
      >
        <form onSubmit={saveNote} className="space-y-10">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kolor notatki</label>
              <div className="flex gap-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNoteColor(c.id)}
                    className={cn(
                      'w-9 h-9 rounded-xl border-2 transition-all text-sm',
                      c.bg,
                      noteColor === c.id ? 'border-indigo-400 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {noteColor === c.id ? '✓' : ''}
                  </button>
                ))}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Tytuł (opcjonalnie)</label>
              <input
                type="text"
                placeholder="Nadaj tytuł..."
                className="w-full bg-transparent p-4 rounded-2xl border-none focus:ring-0 font-black text-4xl outline-none transition-all placeholder:text-gray-100 text-[#1d1d1f]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
           </div>

           <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase text-gray-300 tracking-widest px-4 block">Treść notatki</label>
              <textarea 
                autoFocus
                placeholder="Zacznij pisać swoją historię..." 
                className="w-full bg-gray-50/50 p-8 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-medium text-xl outline-none transition-all min-h-[300px] resize-none leading-relaxed text-gray-700" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                required
              />
              <button
                type="button"
                onClick={handleAiSummarize}
                disabled={isSummarizing || content.length < 50}
                className={cn(
                  "absolute bottom-6 right-6 p-4 rounded-2xl flex items-center gap-2 transition-all shadow-lg",
                  isSummarizing || content.length < 50 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:scale-105 active:scale-95"
                )}
              >
                {isSummarizing ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                <span className="text-xs font-black uppercase tracking-widest">AI Streszczenie</span>
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="py-6" onClick={closeModal}>Anuluj</Button>
              <Button type="submit" className="py-6 shadow-indigo-500/40">Zapisz w archiwum</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
