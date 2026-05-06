import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, loginWithGoogle } from '../lib/firebase';
import { Navigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Monitor, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useDevice } from '../context/DeviceContext';

export default function Login() {
  const [user, loading] = useAuthState(auth);
  const { deviceType, setDeviceType } = useDevice();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600">
      <div className="text-white text-xl font-bold animate-pulse">Ładowanie...</div>
    </div>
  );
  
  if (user) return <Navigate to="/" />;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Błędny email lub hasło.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup zablokowany przez przeglądarkę.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore user cancellation
      } else {
        setError('Wystąpił błąd podczas logowania przez Google.');
      }
    } finally {
      setGoogleLoading(false);
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
          <LogIn size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">LifeFlow</h1>
        <p className="text-gray-500 mb-6 text-sm">Zorganizuj swój dzień w prosty sposób.</p>
        
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
            <Monitor size={24} className={deviceType === 'desktop' ? 'animate-pulse' : ''} />
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
            <Smartphone size={24} className={deviceType === 'mobile' ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">Telefon</span>
          </button>
        </div>
        
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6 text-left">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center mb-4">
              {error}
            </div>
          )}
          
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
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Hasło</label>
              <Link to="/forgot-password" text-size={10} className="text-xs text-indigo-600 font-bold hover:underline">Zapomniałeś?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200 cursor-pointer"
          >
            Zaloguj się
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-white px-4 text-gray-300 font-black">Lub</span></div>
        </div>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-100 py-3 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 mb-4 disabled:opacity-50 cursor-pointer"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className={`w-5 h-5 grayscale opacity-70 ${googleLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm">{googleLoading ? 'Logowanie...' : 'Kontynuuj przez Google'}</span>
        </button>

        <p className="text-sm text-gray-500">
          Nie masz konta? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Zarejestruj się</Link>
        </p>
      </motion.div>
    </div>
  );
}
