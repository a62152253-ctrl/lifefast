import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, ChevronRight, Target, Lightbulb, TrendingUp, X } from 'lucide-react';
import { Card, Button, GlassCard } from './CommonUI';
import { getDashboardInsight } from '../services/geminiService';

export default function AIInsights({ tasks, habits, user }: { tasks: any[], habits: any[], user: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generateDeepInsight = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const result = await getDashboardInsight(tasks, habits, user?.displayName || 'Użytkowniku');
      setInsight(result);
    } catch (e) {
      setInsight("Wystąpił problem z analizą. Spróbuj ponownie później.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-indigo-200/50 relative overflow-hidden group cursor-pointer" onClick={generateDeepInsight}>
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
          <Brain size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-black tracking-tight">LifeFlow AI Insights</h3>
          </div>
          
          <p className="text-indigo-100 font-medium mb-8 leading-relaxed max-w-[80%]">
            Pozwól AI przeanalizować Twoje postępy i zaproponować optymalną strategię na dzisiaj.
          </p>
          
          <div className="flex items-center text-sm font-black uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
            Generuj raport <ChevronRight size={16} />
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl"
            >
              <GlassCard className="p-0 overflow-hidden border-white/20 bg-white/90">
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Sparkles size={24} />
                    <h2 className="text-2xl font-black tracking-tighter">Twój Osobisty Strateg AI</h2>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 md:p-12">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-100 rounded-full" />
                        <div className="w-20 h-20 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0" />
                        <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-gray-800 animate-pulse">Analizuję Twoje dane...</p>
                        <p className="text-sm text-gray-400 mt-1">Przeszukuję zadania, nawyki i cele...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start gap-4">
                             <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                                <Target size={20} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Główny Cel</p>
                               <p className="text-sm font-bold text-gray-800 mt-1">Skupienie na liście zadań wysokiego priorytetu.</p>
                             </div>
                          </div>
                          <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                             <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                                <TrendingUp size={20} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nawyk dnia</p>
                               <p className="text-sm font-bold text-gray-800 mt-1">Dziś Twoja szansa na 7-dniowy streak!</p>
                             </div>
                          </div>
                       </div>

                       <div className="bg-gray-50 rounded-[2rem] p-8 relative">
                          <Lightbulb className="absolute -top-3 -left-3 text-amber-500 bg-white p-2 rounded-xl shadow-lg border border-amber-100" size={40} />
                          <p className="text-gray-700 leading-relaxed font-medium italic">
                            "{insight}"
                          </p>
                       </div>

                       <Button onClick={() => setIsOpen(false)} className="w-full h-16 rounded-[1.5rem]">
                          Dzięki, biorę się do roboty!
                       </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
