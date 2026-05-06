import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      setError('Nie znaleźliśmy konta z tym e-mailem.');
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
          {sent ? <CheckCircle2 size={32} className="text-emerald-500" /> : <KeyRound size={32} />}
        </div>
        
        {sent ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Wysłano!</h1>
            <p className="text-gray-500 mb-8 text-sm">Sprawdź swoją skrzynkę e-mail i postępuj zgodnie z instrukcją.</p>
            <Link 
              to="/login"
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95"
            >
              <span>Wróć do logowania</span>
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Odzyskaj hasło</h1>
            <p className="text-gray-500 mb-8 text-sm">Masz problem z pamięcią? To nic, wyślemy Ci link do resetu.</p>
            
            <form onSubmit={handleReset} className="space-y-4 mb-6 text-left">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
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

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200"
              >
                Wyślij link
              </button>
            </form>

            <Link to="/login" className="flex items-center justify-center space-x-2 text-sm text-gray-400 font-bold hover:text-indigo-600 transition-colors">
              <ArrowLeft size={16} />
              <span>Wróć do logowania</span>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
