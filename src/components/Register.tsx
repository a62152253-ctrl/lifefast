import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { Navigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User as UserIcon, Monitor, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDevice } from '../context/DeviceContext';

export default function Register() {
  const [user, loading] = useAuthState(auth);
  const { deviceType, setDeviceType } = useDevice();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600">
      <div className="text-white text-xl font-bold animate-pulse">Ładowanie...</div>
    </div>
  );
  
  if (user) return <Navigate to="/" />;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
    } catch (err: any) {
      setError('Błąd podczas rejestracji. Spróbuj inny email.');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 bg-gradient-to-br from-indigo-600 to-violet-700">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <UserPlus size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Dołącz do LifeFlow</h1>
        <p className="text-gray-500 mb-6 text-sm">Zacznij organizować swój czas lepiej.</p>
        
        {/* Device Selection */}
        <div className="flex gap-3 mb-8">
          <button 
            type="button"
            onClick={() => setDeviceType('desktop')}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
              deviceType === 'desktop' 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm' 
                : 'border-gray-100 bg-gray-50 text-gray-400 grayscale hover:grayscale-0 hover:border-gray-200'
            }`}
          >
            <Monitor size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Komputer</span>
          </button>
          <button 
            type="button"
            onClick={() => setDeviceType('mobile')}
            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
              deviceType === 'mobile' 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm' 
                : 'border-gray-100 bg-gray-50 text-gray-400 grayscale hover:grayscale-0 hover:border-gray-200'
            }`}
          >
            <Smartphone size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Telefon</span>
          </button>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4 mb-6 text-left">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Twoje Imię</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                required
                placeholder="Jan Kowalski"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required
                placeholder="twoj@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Hasło</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required
                placeholder="Min. 6 znaków"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200"
          >
            Stwórz konto
          </button>
        </form>

        <p className="text-sm text-gray-500">
          Masz już konto? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Zaloguj się</Link>
        </p>
      </motion.div>
    </div>
  );
}
