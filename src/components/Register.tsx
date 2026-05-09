import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Monitor, Smartphone, User as UserIcon, UserPlus } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useDevice } from '../context/DeviceContext';
import AuthShell from './AuthShell';

export default function Register() {
  const [user, loading] = useAuthState(auth);
  const { deviceType, setDeviceType } = useDevice();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="bg-gradient-page flex min-h-screen items-center justify-center p-6">
        <div className="glass-card flex flex-col items-center rounded-[2rem] px-8 py-9">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[rgba(239,99,81,0.18)] border-t-[var(--color-accent)]" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });
    } catch {
      setError('Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon={UserPlus}
      eyebrow="Rejestracja"
      title="Zbuduj własny system"
      subtitle="Załóż konto, wybierz preferowany tryb korzystania i od razu zacznij porządkować dzień po swojemu."
      showcaseTitle="Mniej improwizacji, więcej klarownych decyzji każdego dnia."
      showcaseCopy="LifeFlow łączy listy, nawyki, budżet i plan dnia w jedną przestrzeń, która nie męczy wzroku i pozwala szybciej działać."
      showcaseStats={[
        { label: 'Tasks', value: 'Clear' },
        { label: 'Setup', value: '2 min' },
        { label: 'View', value: 'Flex' },
      ]}
      footer={
        <p>
          Masz już konto?{' '}
          <Link to="/login" className="font-bold text-[var(--color-accent)] hover:underline">
            Zaloguj się
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="rounded-[1.35rem] border border-[rgba(211,91,87,0.18)] bg-[rgba(211,91,87,0.08)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setDeviceType('desktop')}
          className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
            deviceType === 'desktop'
              ? 'border-[rgba(239,99,81,0.3)] bg-[rgba(239,99,81,0.08)] shadow-[0_18px_32px_rgba(239,99,81,0.12)]'
              : 'border-[var(--color-line)] bg-white/70 hover:bg-white'
          }`}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[var(--color-accent)] shadow-sm">
            <Monitor size={20} />
          </div>
          <p className="text-sm font-bold text-[var(--color-ink)]">Komputer</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Klasyczny widok aplikacji</p>
        </button>

        <button
          type="button"
          onClick={() => setDeviceType('mobile')}
          className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
            deviceType === 'mobile'
              ? 'border-[rgba(40,148,156,0.3)] bg-[rgba(40,148,156,0.08)] shadow-[0_18px_32px_rgba(40,148,156,0.12)]'
              : 'border-[var(--color-line)] bg-white/70 hover:bg-white'
          }`}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[var(--color-calm)] shadow-sm">
            <Smartphone size={20} />
          </div>
          <p className="text-sm font-bold text-[var(--color-ink)]">Telefon</p>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Symulacja mobilnego UI</p>
        </button>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-overline">Twoje imię</span>
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
            <input
              type="text"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Jan Kowalski"
              className="input-base pl-12 pr-4"
              disabled={submitting}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-overline">Adres e-mail</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="twoj@email.com"
              className="input-base pl-12 pr-4"
              disabled={submitting}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-overline">Hasło</span>
          <div className="relative">
            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 znaków"
              className="input-base pl-12 pr-12"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[1.35rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(239,99,81,0.24)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Tworzenie konta...' : 'Stwórz konto'}
        </button>
      </form>
    </AuthShell>
  );
}
