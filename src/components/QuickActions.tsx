import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, NotebookPen, ListTodo, ShoppingBag, Wallet, X, Sparkles, Wand2 } from 'lucide-react';
import { hapticFeedback } from '../lib/utils';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use direct routes when on /direct paths
  const isDirectRoute = location.pathname.startsWith('/direct');
  const prefix = isDirectRoute ? '/direct' : '';

  const actions = [
    { icon: ListTodo, color: 'bg-amber-500', label: 'Zadanie', path: `${prefix}/tasks` },
    { icon: ShoppingBag, color: 'bg-indigo-500', label: 'Zakupy', path: `${prefix}/shopping` },
    { icon: NotebookPen, color: 'bg-emerald-500', label: 'Notatka', path: `${prefix}/notes` },
    { icon: Wallet, color: 'bg-rose-500', label: 'Wydatek', path: `${prefix}/budget` },
  ];

  return (
    <div className="fixed bottom-32 right-6 md:bottom-10 md:right-10 z-[250]">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-center mb-6 gap-4">
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="group relative flex items-center gap-4"
              >
                <div className="bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                  {action.label}
                </div>
                <button
                  onClick={() => { hapticFeedback('light'); setIsOpen(false); navigate(action.path); }}
                  className={`${action.color} text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none border-4 border-white`}
                >
                  <action.icon size={22} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => { hapticFeedback('medium'); setIsOpen(!isOpen); }}
        className={`w-18 h-18 rounded-[2.2rem] shadow-2xl flex items-center justify-center transition-all duration-500 active:scale-90 z-10 relative overflow-hidden ${isOpen ? 'bg-gray-900 rotate-45' : 'bg-indigo-600'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        <Plus size={32} className={`text-white transition-transform duration-500 ${isOpen ? 'scale-90' : ''}`} />
        
        {!isOpen && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full scale-125 pointer-events-none"
          />
        )}
      </button>
      
      {/* AI Quick Button */}
      {!isOpen && (
        <motion.button 
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="absolute -top-12 -left-12 w-12 h-12 bg-white border border-gray-100 text-indigo-600 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all font-black text-xs"
        >
          <Sparkles size={18} fill="currentColor" />
        </motion.button>
      )}
    </div>
  );
}
