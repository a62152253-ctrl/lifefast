import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Zap, Coffee, Settings } from 'lucide-react';
import { Card, Button, ProgressCircle } from './CommonUI';
import { hapticFeedback } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export default function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const timerRef = useRef<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timerRef.current);
      setIsActive(false);
      hapticFeedback('medium');
      const message = mode === 'work' ? 'Czas na przerwę!' : 'Czas wrócić do pracy!';
      showToast({
        type: 'info',
        message,
      });
      toggleMode();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => {
    hapticFeedback('light');
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    hapticFeedback('light');
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const toggleMode = () => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = mode === 'work' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100 
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  return (
    <Card className="flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${mode === 'work' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {mode === 'work' ? <Zap size={18} /> : <Coffee size={18} />}
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest">{mode === 'work' ? 'Focus Session' : 'Short Break'}</h3>
        </div>
        <button className="text-gray-300 hover:text-gray-600 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="relative mb-12">
        <ProgressCircle 
          size={240} 
          progress={progress} 
          strokeWidth={12} 
          color={mode === 'work' ? '#4f46e5' : '#10b981'}
        >
          <div className="text-center">
             <div className="text-6xl font-black text-[#1d1d1f] tabular-nums tracking-tighter">
               {formatTime(timeLeft)}
             </div>
             <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] mt-2">pozostało</p>
          </div>
        </ProgressCircle>
      </div>

      <div className="flex gap-4 w-full">
        <Button 
          variant={isActive ? 'white' : 'primary'} 
          className="flex-1 h-16 rounded-3xl"
          onClick={toggleTimer}
        >
          {isActive ? <Pause size={24} /> : <Play size={24} />}
          {isActive ? 'Wstrzymaj' : 'Start'}
        </Button>
        <Button 
          variant="secondary" 
          className="w-16 h-16 p-0 rounded-3xl"
          onClick={resetTimer}
        >
          <RotateCcw size={20} />
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 w-full">
         <button 
           onClick={() => { hapticFeedback('light'); setMode('work'); setTimeLeft(25 * 60); setIsActive(false); }}
           className={cn(
             "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
             mode === 'work' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
           )}
         >
           Focus (25m)
         </button>
         <button 
           onClick={() => { hapticFeedback('light'); setMode('break'); setTimeLeft(5 * 60); setIsActive(false); }}
           className={cn(
             "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
             mode === 'break' ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
           )}
         >
           Przerwa (5m)
         </button>
      </div>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
