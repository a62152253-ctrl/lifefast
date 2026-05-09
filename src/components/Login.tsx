import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react';
import { auth, loginWithGoogle, signInWithEmail } from '../lib/firebase';
import AuthShell from './AuthShell';

const ADMIN_EMAIL = 'k@lifefast.admin';

function translateFirebaseError(code?: string) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Nieprawidłowy e-mail lub hasło.';
    case 'auth/invalid-email':
      return 'Adres e-mail ma niepoprawny format.';
    case 'auth/too-many-requests':
      return 'Za dużo prób. Spróbuj ponownie za chwilę.';
    case 'auth/user-disabled':
      return 'To konto zostało zablokowane.';
    case 'auth/popup-blocked':
      return 'Przeglądarka zablokowała okno logowania Google.';
    case 'auth/network-request-failed':
      return 'Brak połączenia z internetem.';
    default:
      return 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
  }
}

export default function Login() {
  const [user, loading] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    const dest = user.email?.toLowerCase() === ADMIN_EMAIL ? '/admin' : '/';
    return <Navigate to={dest} replace />;
  }

  const isBusy = emailLoading || googleLoading;

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setEmailLoading(true);

    try {
      await signInWithEmail(email.trim(), password);
      // redirect obsługuje `if (user)` wyżej — na podstawie user.email
    } catch (err) {
      const firebaseError = err as { code?: string };
      setError(translateFirebaseError(firebaseError.code));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (err) {
      const firebaseError = err as { code?: string };
      setError(translateFirebaseError(firebaseError.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      icon={LogIn}
      eyebrow="Logowanie"
      title="Wróć do swojego rytmu"
      subtitle="Zaloguj się, żeby zobaczyć zadania, nawyki i plan dnia w nowej, spokojniejszej odsłonie."
      showcaseTitle="Codzienność działa lepiej, kiedy wszystko ma swoje miejsce."
      showcaseCopy="Nowy interfejs LifeFlow stawia na czytelne priorytety, szybszą orientację i mniej wizualnego chaosu."
      showcaseStats={[
        { label: 'Sprint', value: 'Today' },
        { label: 'Focus', value: 'Flow' },
        { label: 'Mood', value: 'Calm' },
      ]}
      footer={
        <p>
          Nie masz konta?{' '}
          <Link to="/register" className="font-bold text-[var(--color-accent)] hover:underline">
            Załóż je teraz
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="rounded-[1.35rem] border border-[rgba(211,91,87,0.18)] bg-[rgba(211,91,87,0.08)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isBusy}
        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-[var(--color-line)] bg-white/82 px-4 py-4 text-sm font-bold text-[var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(32,26,23,0.18)] border-t-[var(--color-accent)]" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span>{googleLoading ? 'Łączenie z Google...' : 'Kontynuuj przez Google'}</span>
      </button>

      <div className="relative py-1">
        <div className="divider" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,252,248,0.98)] px-4 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-muted)]">
          albo e-mail
        </span>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
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
              disabled={isBusy}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-overline">Hasło</span>
            <Link to="/forgot-password" className="text-xs font-bold text-[var(--color-accent)] hover:underline">
              Nie pamiętasz?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 znaków"
              className="input-base pl-12 pr-12"
              disabled={isBusy}
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
          disabled={isBusy}
          className="w-full rounded-[1.35rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(239,99,81,0.24)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emailLoading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>
    </AuthShell>
  );
}
