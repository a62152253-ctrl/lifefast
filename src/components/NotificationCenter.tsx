import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Clock, AlertTriangle, Zap, ShoppingCart } from 'lucide-react';
import { IconButton, Badge } from './CommonUI';

const NOTIFICATIONS = [
  { id: '1', title: 'Zadanie na dziś', message: 'Dokończyć raport kwartalny', time: '10 min temu', type: 'task', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: '2', title: 'Lista zakupów', message: 'Anna dodała "Mleko owsiane"', time: '1 godz temu', type: 'shopping', icon: ShoppingCart, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: '3', title: 'Przypomnienie', message: 'Czas na trening!', time: '2 godz temu', type: 'habit', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(NOTIFICATIONS);

  const removeNotification = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="relative">
      <div className="relative">
        <IconButton 
          icon={Bell} 
          onClick={() => setIsOpen(!isOpen)} 
          className={cn("bg-gray-50", isOpen ? "bg-indigo-600 text-white" : "")} 
        />
        {items.length > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[140]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 md:w-96 bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border border-gray-100 z-[150] overflow-hidden"
            >
              <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-800 tracking-tight">Powiadomienia</h3>
                  <Badge variant="primary">{items.length}</Badge>
                </div>
                <button onClick={() => setItems([])} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Wyczyść</button>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                    <Bell size={40} className="mb-4 opacity-20" />
                    <p className="font-bold text-sm">Brak nowych powiadomień</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="relative group p-4 rounded-3xl bg-gray-50/50 hover:bg-white hover:shadow-xl hover:shadow-gray-100 transition-all border border-transparent hover:border-gray-100">
                       <div className="flex gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.bg, item.color)}>
                             <item.icon size={18} />
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <p className="text-sm font-black text-gray-800 tracking-tight">{item.title}</p>
                                <span className="text-[9px] font-bold text-gray-400">{item.time}</span>
                             </div>
                             <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => removeNotification(item.id)}
                         className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                       >
                         <Check size={12} />
                       </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-gray-50/50">
                 <button className="w-full py-4 text-xs font-black uppercase tracking-widest text-center text-gray-400 hover:text-indigo-600 transition-colors">Wszystkie powiadomienia</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
