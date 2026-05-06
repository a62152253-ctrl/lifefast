import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore';
import { Smile, Frown, Meh, SmilePlus, Angry, Heart, MessageSquare, ChevronRight, TrendingUp } from 'lucide-react';
import { Card, Button, Badge, PageHeader } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import { hapticFeedback, cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const MOODS = [
  { id: 'great', icon: SmilePlus, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Świetnie', score: 5 },
  { id: 'good',  icon: Smile,    color: 'text-indigo-500',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  label: 'Dobrze',   score: 4 },
  { id: 'okay',  icon: Meh,      color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Tak sobie',score: 3 },
  { id: 'bad',   icon: Frown,    color: 'text-rose-500',    bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'Słabo',    score: 2 },
  { id: 'angry', icon: Angry,    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Złość',    score: 1 },
];

function getMoodById(id: string) {
  return MOODS.find(m => m.id === id);
}

function formatTs(ts: any) {
  if (!ts) return '';
  try {
    return format(ts.toDate(), 'd MMM, HH:mm', { locale: pl });
  } catch {
    return '';
  }
}

export default function MoodTracker({ isMini = false }: { isMini?: boolean }) {
  const [user] = useAuthState(auth);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'moods'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const saveMood = async () => {
    if (!selectedMood || !user) return;
    setIsSaving(true);
    hapticFeedback('medium');
    try {
      await addDoc(collection(db, 'moods'), {
        mood: selectedMood,
        note: note.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setSelectedMood(null);
      setNote('');
      hapticFeedback('heavy');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── mini mode (used in dashboard) ───────────────── */
  if (isMini) {
    const latest = history[0];
    const latestMood = latest ? getMoodById(latest.mood) : null;

    return (
      <div className="flex flex-col h-full justify-between !p-0">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <Heart size={24} fill="currentColor" />
          </div>
          <Badge variant="secondary">Nastrój</Badge>
        </div>
        {latestMood ? (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ostatni wpis</p>
            <div className="flex items-center gap-3">
              <latestMood.icon size={28} className={latestMood.color} fill="currentColor" />
              <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">{latestMood.label}</h4>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Brak wpisów</p>
        )}
        <Link to="/mood" className="mt-8">
          <Button variant="secondary" className="w-full !rounded-[1.5rem] !py-3 !px-4 !text-[9px]">
            Dziennik nastroju <ChevronRight size={12} className="ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  /* ── average score for last 7 entries ─────────────── */
  const avgScore = history.length > 0
    ? (history.slice(0, 7).reduce((s, h) => s + (getMoodById(h.mood)?.score ?? 3), 0) / Math.min(history.length, 7)).toFixed(1)
    : null;

  return (
    <div className="space-y-10 pb-28">
      <PageHeader title="Nastrój" subtitle="Śledź swoje emocje i buduj samoświadomość." />

      {/* Today's mood picker */}
      <div className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-[#1d1d1f] tracking-tight">Jak się dziś czujesz?</h3>
          {avgScore && (
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl">
              <TrendingUp size={13} className="text-indigo-500" />
              <span className="text-xs font-black text-indigo-600">Śr. {avgScore}/5</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {MOODS.map(mood => {
            const isActive = selectedMood === mood.id;
            return (
              <motion.button
                key={mood.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => { hapticFeedback('light'); setSelectedMood(mood.id); }}
                className={cn(
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all duration-300 border-2',
                  isActive
                    ? `${mood.bg} ${mood.color} ${mood.border} shadow-lg`
                    : 'bg-white border-gray-100 text-gray-300 hover:border-gray-200'
                )}
              >
                <mood.icon size={28} fill={isActive ? 'currentColor' : 'none'} />
                <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center">
                  {mood.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-5 space-y-4">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Kilka słów o tym co czujesz... (opcjonalnie)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-rose-100 outline-none resize-none h-28 leading-relaxed transition-all"
                />
                <Button onClick={saveMood} disabled={isSaving} className="w-full h-12 rounded-2xl">
                  {isSaving ? 'Zapisuję...' : 'Zapisz w dzienniku'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mood trend (last 7) */}
      {history.length >= 2 && (
        <div className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-5">Trend ostatnich wpisów</p>
          <div className="flex items-end gap-2 h-16">
            {history.slice(0, 7).reverse().map((item, i) => {
              const mood = getMoodById(item.mood);
              const h = mood ? (mood.score / 5) * 100 : 50;
              return (
                <div key={item.id} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className={cn('w-full rounded-lg', mood?.bg ?? 'bg-gray-100')}
                    style={{ minHeight: 6 }}
                  />
                  <span className="text-[8px] text-gray-300">{mood?.label.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-5 px-1">Historia emocji</p>
        <div className="space-y-3">
          <AnimatePresence>
            {history.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-[2rem] border border-gray-100">
                <Heart size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-bold text-sm">Jeszcze brak wpisów.</p>
                <p className="text-gray-300 text-xs mt-1">Zaznacz swój nastrój powyżej.</p>
              </div>
            ) : history.map(item => {
              const mood = getMoodById(item.mood);
              if (!mood) return null;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-white rounded-[1.75rem] border border-gray-100 p-5 flex items-center gap-5"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', mood.bg, mood.color)}>
                    <mood.icon size={24} fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-[#1d1d1f]">{mood.label}</p>
                      <span className="text-[10px] font-bold text-gray-300">{formatTs(item.createdAt)}</span>
                    </div>
                    {item.note && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{item.note}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
