import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { Utensils, Plus, ChefHat, ShoppingCart, Clock, Sparkles, BrainCircuit, X, Loader2, Flame, Target, TrendingUp, BarChart3, Apple, Coffee } from 'lucide-react';
import { Card, Button, PageHeader, Badge, Modal } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import { estimateCalories } from '../services/geminiService';
import { hapticFeedback, cn } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const MEAL_TYPES = ['Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];
const DAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const DAYS_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const CALORIE_GOAL = 2000;

const MEAL_ICONS: Record<string, string> = {
  'Śniadanie': '🌅',
  'Obiad': '☀️',
  'Kolacja': '🌙',
  'Przekąska': '🍎',
};

function getTodayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function MealPlanner() {
  const [user] = useAuthState(auth);
  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayIndex());
  const [meals, setMeals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentType, setCurrentType] = useState('');
  const [mealName, setMealName] = useState('');
  const [kcal, setKcal] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [nutritionGoals, setNutritionGoals] = useState({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showNutrition, setShowNutrition] = useState(false);

  const selectedDay = DAYS_FULL[selectedDayIdx];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'meals'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const openAddMeal = (type: string) => {
    setCurrentType(type);
    setMealName('');
    setKcal('');
    setIsModalOpen(true);
    hapticFeedback('light');
  };

  const estimateWithAI = async () => {
    if (!mealName) return;
    setIsEstimating(true);
    hapticFeedback('light');
    try {
      const estimated = await estimateCalories(mealName);
      setKcal(estimated.toString());
      hapticFeedback('medium');
    } catch {
      // fallback: keep user-entered kcal
    } finally {
      setIsEstimating(false);
    }
  };

  const saveMeal = async () => {
    if (!mealName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'meals'), {
        day: selectedDay,
        type: currentType,
        name: mealName,
        calories: parseInt(kcal) || 0,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      hapticFeedback('medium');
    } catch { /* Firestore error handled by rules */ }
  };

  const deleteMeal = async (id: string) => {
    try {
      hapticFeedback('heavy');
      await deleteDoc(doc(db, 'meals', id));
    } catch { /* ignore */ }
  };

  const dayMeals = meals.filter(m => m.day === selectedDay);
  const totalCalories = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const calorieProgress = Math.min(100, Math.round((totalCalories / CALORIE_GOAL) * 100));

  return (
    <div className="space-y-10 pb-28">
      <PageHeader
        title="Posiłki"
        subtitle="Śledź to co jesz i kontroluj kalorie."
      />

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {DAYS_SHORT.map((day, idx) => (
          <button
            key={day}
            onClick={() => { setSelectedDayIdx(idx); hapticFeedback('light'); }}
            className={cn(
              'flex-1 min-w-[52px] py-3 rounded-2xl font-black text-xs transition-all border',
              selectedDayIdx === idx
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                : idx === getTodayIndex()
                  ? 'bg-white text-indigo-600 border-indigo-200'
                  : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
            )}
          >
            {day}
            {idx === getTodayIndex() && (
              <div className="w-1 h-1 bg-indigo-400 rounded-full mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>

      {/* Calorie ring + stats */}
      <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kalorie na {selectedDay}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-[#1d1d1f] tracking-tight">{totalCalories}</span>
              <span className="text-sm text-gray-400 font-bold">/ {CALORIE_GOAL} kcal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={16} className={totalCalories > CALORIE_GOAL ? 'text-rose-500' : 'text-amber-500'} />
            <span className={cn('text-sm font-black', totalCalories > CALORIE_GOAL ? 'text-rose-500' : 'text-emerald-600')}>
              {totalCalories > CALORIE_GOAL ? `+${totalCalories - CALORIE_GOAL} nadmiar` : `${CALORIE_GOAL - totalCalories} pozostało`}
            </span>
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', calorieProgress > 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500')}
            initial={{ width: 0 }}
            animate={{ width: `${calorieProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-gray-300 font-bold">0</span>
          <span className="text-[10px] text-gray-300 font-bold">Cel: {CALORIE_GOAL} kcal</span>
        </div>
      </div>

      {/* Meal types grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MEAL_TYPES.map(type => {
          const mealSet = dayMeals.filter(m => m.type === type);
          const typeCalories = mealSet.reduce((s, m) => s + (m.calories || 0), 0);

          return (
            <div key={type} className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{MEAL_ICONS[type]}</span>
                  <div>
                    <p className="text-sm font-black text-[#1d1d1f]">{type}</p>
                    {typeCalories > 0 && (
                      <p className="text-[10px] text-indigo-500 font-bold">{typeCalories} kcal</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openAddMeal(type)}
                  className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center text-gray-400 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="px-4 pb-4 space-y-2">
                <AnimatePresence>
                  {mealSet.length === 0 ? (
                    <button
                      onClick={() => openAddMeal(type)}
                      className="w-full py-3 rounded-xl border border-dashed border-gray-200 text-gray-300 text-xs font-bold hover:border-indigo-200 hover:text-indigo-400 transition-colors"
                    >
                      + Dodaj posiłek
                    </button>
                  ) : mealSet.map(meal => (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 group"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#1d1d1f]">{meal.name}</p>
                        {meal.calories > 0 && (
                          <p className="text-[10px] text-indigo-500 font-bold">{meal.calories} kcal</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-300 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add meal modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Dodaj ${currentType}`}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Nazwa posiłku</label>
            <input
              autoFocus
              type="text"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="np. Spaghetti Bolognese..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              onKeyDown={e => e.key === 'Enter' && saveMeal()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kalorie (kcal)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={kcal}
                onChange={e => setKcal(e.target.value)}
                placeholder="0"
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
              <button
                onClick={estimateWithAI}
                disabled={isEstimating || !mealName}
                className="flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs disabled:opacity-40 hover:bg-indigo-100 transition-colors"
              >
                {isEstimating ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                AI
              </button>
            </div>
          </div>

          <Button onClick={saveMeal} className="w-full h-14 rounded-2xl" disabled={!mealName.trim()}>
            Zapisz posiłek
          </Button>
        </div>
      </Modal>
    </div>
  );
}
