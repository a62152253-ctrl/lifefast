import React, { useState } from 'react';
import { Smile, Frown, Meh, SmilePlus, Angry, Heart, Sparkles, MessageSquare, ChevronRight } from 'lucide-react';
import { Card, Button, Badge } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import { hapticFeedback, cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const MOODS = [
  { id: 'great', icon: SmilePlus, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Świetnie' },
  { id: 'good', icon: Smile, color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Dobrze' },
  { id: 'okay', icon: Meh, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Tak sobie' },
  { id: 'bad', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Słabo' },
  { id: 'angry', icon: Angry, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Złość' },
];

export default function MoodTracker({ isMini = false }: { isMini?: boolean }) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<any[]>([
    { id: 1, mood: 'great', note: 'Bardzo udany dzień!', date: 'Dziś, 08:30' },
    { id: 2, mood: 'good', note: 'Praca idzie do przodu.', date: 'Wczoraj, 18:20' }
  ]);

  const saveMood = () => {
    if (!selectedMood) return;
    hapticFeedback('medium');
    setHistory([{
      id: Date.now(),
      mood: selectedMood,
      note: note,
      date: 'Dziś, teraz'
    }, ...history]);
    setSelectedMood(null);
    setNote('');
  };

  if (isMini) {
    const latest = history[0];
    const latestMood = MOODS.find(m => m.id === latest.mood);

    return (
      <div className="flex flex-col h-full justify-between !p-0">
        <div className="flex justify-between items-start mb-6">
           <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
              <Heart size={24} fill="currentColor" />
           </div>
           <Badge variant="secondary">Status</Badge>
        </div>
        
        {latestMood && (
          <div className="space-y-2">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ostatni Nastrój</p>
             <div className="flex items-center gap-3">
                <latestMood.icon size={28} className={latestMood.color} fill="currentColor" />
                <h4 className="text-3xl font-black text-[#1d1d1f] tracking-tighter">{latestMood.label}</h4>
             </div>
          </div>
        )}

        <Link to="/mood" className="mt-8">
           <Button variant="secondary" className="w-full !rounded-[1.5rem] !py-3 !px-4 !text-[9px]">
             Dziennik nastroju <ChevronRight size={12} className="ml-1" />
           </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Card className="p-10 border-none shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
           <Heart size={120} />
         </div>
         
         <div className="relative z-10">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                    <Heart size={28} fill="currentColor" />
                 </div>
                 <h3 className="text-3xl font-display font-black text-[#1d1d1f] tracking-tighter leading-none">Jak się dziś czujesz?</h3>
              </div>
              <Badge variant="primary">LifeFlow Pulse</Badge>
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
              {MOODS.map(mood => {
                const isActive = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => { hapticFeedback('light'); setSelectedMood(mood.id); }}
                    className={cn(
                      "flex flex-col items-center gap-4 p-6 rounded-[2rem] transition-all duration-500 border-2",
                      isActive 
                        ? `${mood.bg} ${mood.color} border-current shadow-2xl shadow-indigo-100 scale-105` 
                        : "bg-white border-gray-50 text-gray-300 hover:border-gray-100 hover:text-gray-400"
                    )}
                  >
                    <mood.icon size={32} fill={isActive ? "currentColor" : "none"} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{mood.label}</span>
                  </button>
                );
              })}
           </div>

           <AnimatePresence>
             {selectedMood && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="space-y-6 pt-4"
               >
                  <div className="relative">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Napisz kilka słów o swoim nastroju... (Opcjonalnie)"
                      className="w-full bg-gray-50 border-none rounded-[2.5rem] p-8 text-lg font-medium focus:ring-4 focus:ring-rose-100 transition-all resize-none h-40 leading-relaxed"
                    />
                    <MessageSquare size={24} className="absolute right-8 bottom-8 text-gray-200" />
                  </div>
                  <Button onClick={saveMood} className="w-full h-16 rounded-[2rem] shadow-rose-200 shadow-xl">Zapisz w dzienniku</Button>
               </motion.div>
             )}
           </AnimatePresence>
         </div>
      </Card>

      <div className="space-y-6">
         <h3 className="text-2xl font-black text-[#1d1d1f] tracking-tighter px-4">Historia emocji</h3>
         <div className="grid gap-4">
            {history.map(item => {
              const mood = MOODS.find(m => m.id === item.mood);
              if (!mood) return null;
              return (
                <Card key={item.id} className="p-8 hover:border-[#1d1d1f] transition-all group">
                   <div className="flex items-center gap-8">
                      <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110", mood.bg, mood.color)}>
                         <mood.icon size={32} fill="currentColor" />
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start mb-1">
                            <h4 className="text-2xl font-black text-[#1d1d1f] tracking-tighter">{mood.label}</h4>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">{item.date}</span>
                         </div>
                         {item.note && <p className="text-gray-500 font-medium leading-relaxed">{item.note}</p>}
                      </div>
                   </div>
                </Card>
              );
            })}
         </div>
      </div>
    </div>
  );
}
