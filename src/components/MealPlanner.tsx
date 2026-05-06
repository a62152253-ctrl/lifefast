import React, { useState } from 'react';
import { Utensils, Plus, ChefHat, ShoppingCart, Calendar, Clock, Sparkles, BrainCircuit, X, Loader2 } from 'lucide-react';
import { Card, Button, PageHeader, Badge, IconButton, Modal } from './CommonUI';
import { motion, AnimatePresence } from 'motion/react';
import { estimateCalories } from '../services/geminiService';
import { hapticFeedback } from '../lib/utils';

const MEAL_TYPES = ['Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];
const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export default function MealPlanner() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [meals, setMeals] = useState<any[]>([
    { id: '1', day: 'Poniedziałek', type: 'Śniadanie', name: 'Owsianka z borówkami', calories: 450 },
    { id: '2', day: 'Poniedziałek', type: 'Obiad', name: 'Kurczak z ryżem i brokułami', calories: 650 },
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentType, setCurrentType] = useState('');
  const [mealName, setMealName] = useState('');
  const [kcal, setKcal] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);

  const openAddMeal = (type: string) => {
    setCurrentType(type);
    setMealName('');
    setKcal('');
    setIsModalOpen(true);
  };

  const AIAssistCalories = async () => {
    if (!mealName) return;
    setIsEstimating(true);
    hapticFeedback('light');
    try {
      const estimated = await estimateCalories(mealName);
      setKcal(estimated.toString());
      hapticFeedback('medium');
    } catch (e) {
      console.error(e);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSaveMeal = () => {
    if (!mealName) return;
    
    setMeals([...meals, {
      id: Date.now().toString(),
      day: selectedDay,
      type: currentType,
      name: mealName,
      calories: parseInt(kcal) || 0
    }]);
    setIsModalOpen(false);
    hapticFeedback('medium');
  };

  const totalCalories = meals
    .filter(m => m.day === selectedDay)
    .reduce((sum, m) => sum + (m.calories || 0), 0);

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Meal Planner" 
        subtitle="Zaplanuj swoje posiłki i wygeneruj listę zakupów."
        action={
          <Button variant="white" className="gap-3">
            <ShoppingCart size={18} /> Wyślij do zakupy
          </Button>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-1">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={cn(
              "px-8 py-4 rounded-[1.5rem] font-black text-sm whitespace-nowrap transition-all border shrink-0",
              selectedDay === day 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100" 
                : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-[#1d1d1f] tracking-tight">Posiłki na {selectedDay}</h3>
            <Badge variant="success">Wszystkie dane OK</Badge>
          </div>

          <div className="grid gap-4">
             {MEAL_TYPES.map(type => {
               const mealSet = meals.filter(m => m.day === selectedDay && m.type === type);
               return (
                 <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{type}</p>
                       <IconButton icon={Plus} size="sm" onClick={() => openAddMeal(type)} className="bg-gray-50 hover:bg-indigo-50" />
                    </div>
                    {mealSet.length === 0 ? (
                      <Card className="p-6 border-dashed border-gray-200 bg-gray-50/30 flex items-center justify-center text-gray-300 italic text-sm">
                        Brak zaplanowanych posiłków
                      </Card>
                    ) : (
                      mealSet.map(meal => (
                        <Card key={meal.id} className="group hover:border-indigo-100 p-6 flex items-center justify-between bg-white">
                          <div className="flex items-center gap-5">
                             <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                               <Utensils size={20} />
                             </div>
                             <div>
                               <p className="text-lg font-bold text-gray-800">{meal.name}</p>
                               <p className="text-xs font-bold text-indigo-500">{meal.calories} kcal</p>
                             </div>
                          </div>
                          
                          <IconButton icon={X} className="text-gray-300 hover:text-red-500" onClick={() => setMeals(meals.filter(m => m.id !== meal.id))} />
                        </Card>
                      ))
                    )}
                 </div>
               );
             })}
          </div>
        </div>

        <div className="space-y-8">
           <Card className="bg-indigo-600 border-none text-white overflow-hidden relative">
              <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                 <ChefHat size={200} />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                   <Sparkles size={20} className="text-amber-300" />
                   <h3 className="text-lg font-black tracking-tight">Propozycja od AI</h3>
                 </div>
                 <p className="text-indigo-50 font-medium leading-relaxed italic mb-8">
                   "Na podstawie Twoich ostatnich zakupów sugeruję dzisiaj lekką sałatkę Cezar z grillowanym kurczakiem. Jest szybka w przygotowaniu i idealna na aktywny dzień."
                 </p>
                 <Button variant="white" className="w-full text-indigo-600 h-14">
                    Wygeneruj cały tydzień z AI
                 </Button>
              </div>
           </Card>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center">
                 <Clock className="text-indigo-600 mb-3" />
                 <p className="text-2xl font-black">1.5h</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Czas gotowania dzisiaj</p>
              </div>
              <div className="p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center">
                 <ChefHat className="text-rose-500 mb-3" />
                 <p className="text-2xl font-black">{totalCalories}</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suma kalorii dzisiaj</p>
              </div>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Dodaj ${currentType}`}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Nazwa posiłku</label>
            <input 
              type="text" 
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="np. Spaghetti Bolognese"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Kalorie (kcal)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                placeholder="0"
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
              <Button 
                variant="secondary" 
                onClick={AIAssistCalories} 
                disabled={isEstimating || !mealName}
                className="px-6 rounded-2xl gap-2"
              >
                {isEstimating ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                <span className="hidden sm:inline">Oszacuj AI</span>
              </Button>
            </div>
          </div>

          <div className="pt-4">
             <Button onClick={handleSaveMeal} className="w-full h-14 rounded-2xl" disabled={!mealName}>
                Zapisz posiłek
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
