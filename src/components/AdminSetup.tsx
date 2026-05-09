import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link, Navigate } from 'react-router-dom';
import { Shield, CheckCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useAdmin } from '../hooks/useAdmin';

// Admin Firebase Auth email (mapped from nickname)
const ADMIN_EMAIL = 'k@lifefast.admin';
const ADMIN_NICKNAME = 'Admin';
const ADMIN_PASSWORD = 'JSS7D2D#@@$@#@#DA2-/*';

export default function AdminSetup() {
  const { isAdmin } = useAdmin();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSetup = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);

      await updateProfile(credential.user, { displayName: ADMIN_NICKNAME });

      await setDoc(doc(db, 'userProfiles', credential.user.uid), {
        uid: credential.user.uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_NICKNAME,
        role: 'admin',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      setStatus('done');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Konto admina już istnieje. Możesz się zalogować.');
      } else {
        setErrorMsg(err.message || 'Wystąpił błąd.');
      }
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Shield size={24} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Setup konta admina</h1>
            <p className="text-sm text-gray-500">Jednorazowa konfiguracja</p>
          </div>
        </div>

        {status === 'done' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 text-green-700 rounded-xl p-4">
              <CheckCircle size={20} />
              <span className="font-semibold">Konto admina zostało utworzone!</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p><span className="font-semibold">Email:</span> {ADMIN_EMAIL}</p>
              <p><span className="font-semibold">Nickname:</span> {ADMIN_NICKNAME}</p>
            </div>
            <Link
              to="/admin"
              className="block text-center bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700 transition"
            >
              Przejdź do panelu admina
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Ta strona tworzy konto administratora. Uruchom ją tylko raz.
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1 text-gray-700">
              <p><span className="font-semibold">Email Firebase:</span> {ADMIN_EMAIL}</p>
              <p><span className="font-semibold">Nickname:</span> {ADMIN_NICKNAME}</p>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleSetup}
              disabled={status === 'loading'}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {status === 'loading' ? 'Tworzenie konta...' : 'Utwórz konto administratora'}
            </button>

            {status === 'error' && (
              <Link
                to="/login"
                className="block text-center text-indigo-600 font-semibold text-sm hover:underline"
              >
                Zaloguj się
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
