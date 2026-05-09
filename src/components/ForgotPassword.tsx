import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      setError('Nie znaleźliśmy konta powiązanego z tym adresem e-mail.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon={sent ? CheckCircle2 : KeyRound}
      eyebrow="Reset hasła"
      title={sent ? 'Link został wysłany' : 'Odzyskaj dostęp'}
      subtitle={
        sent
          ? 'Sprawdź skrzynkę odbiorczą i przejdź przez link resetujący hasło.'
          : 'Podaj swój adres e-mail, a przygotujemy szybki link do ustawienia nowego hasła.'
      }
      showcaseTitle="Bez paniki. Powrót do aplikacji zajmuje chwilę."
      showcaseCopy="Proces resetu został uproszczony, żebyś mógł wrócić do planów, zadań i notatek bez zbędnego błądzenia."
      showcaseStats={[
        { label: 'Reset', value: 'Fast' },
        { label: 'Mail', value: 'Secure' },
        { label: 'Back', value: 'Soon' },
      ]}
      footer={
        <Link to="/login" className="inline-flex items-center gap-2 font-bold text-[var(--color-accent)] hover:underline">
          <ArrowLeft size={16} />
          Wróć do logowania
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-[1.45rem] border border-[rgba(47,158,103,0.16)] bg-[rgba(47,158,103,0.08)] px-5 py-5">
          <p className="text-sm font-semibold leading-6 text-[var(--color-success)]">
            Jeśli konto istnieje, wiadomość resetująca została wysłana na adres <strong>{email}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error ? (
            <div className="rounded-[1.35rem] border border-[rgba(211,91,87,0.18)] bg-[rgba(211,91,87,0.08)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)]">
              {error}
            </div>
          ) : null}

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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[1.35rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-strong))] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(239,99,81,0.24)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Wysyłanie...' : 'Wyślij link resetujący'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
