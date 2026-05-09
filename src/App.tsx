import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseInitialized } from './lib/firebase';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import ForgotPassword from './components/ForgotPassword';
import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { OfflineProvider } from './context/OfflineContext';
import { useAdmin } from './hooks/useAdmin';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Tasks = lazy(() => import('./components/Tasks'));
const Shopping = lazy(() => import('./components/Shopping'));
const Habits = lazy(() => import('./components/Habits'));
const Notes = lazy(() => import('./components/Notes'));
const Budget = lazy(() => import('./components/Budget'));
const DailyPlan = lazy(() => import('./components/DailyPlan'));
const Calendar = lazy(() => import('./components/Calendar'));
const MealPlanner = lazy(() => import('./components/MealPlanner'));
const MoodTracker = lazy(() => import('./components/MoodTracker'));
const Settings = lazy(() => import('./components/Settings'));
const Goals = lazy(() => import('./components/Goals'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminSetup = lazy(() => import('./components/AdminSetup'));

const DISABLE_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';

type ScreenStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
};

function ScreenState({
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: ScreenStateProps) {
  return (
    <div className="bg-gradient-page flex min-h-screen items-center justify-center p-6">
      <div className="glass-card noise relative max-w-md overflow-hidden rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-brand text-2xl font-display font-bold text-white shadow-[0_18px_34px_rgba(239,99,81,0.24)]">
          LF
        </div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.06em] text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(239,99,81,0.22)] transition-transform hover:-translate-y-0.5"
            >
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-full border border-[var(--color-line-strong)] bg-white/75 px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition-colors hover:bg-white"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner({ message = 'Ładowanie...' }: { message?: string }) {
  return (
    <div className="bg-gradient-page flex min-h-screen items-center justify-center p-6">
      <div className="glass-card flex min-w-[19rem] flex-col items-center rounded-[2rem] px-8 py-9 text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-[rgba(239,99,81,0.18)] border-t-[var(--color-accent)]" />
        <p className="font-display text-2xl font-bold tracking-[-0.05em] text-[var(--color-ink)]">
          LifeFlow
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{message}</p>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const [user, loading, error] = useAuthState(auth);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimeoutReached(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleRetry = useCallback(() => {
    setTimeoutReached(false);
    window.location.reload();
  }, []);

  if (!isFirebaseInitialized && !DISABLE_AUTH) {
    return (
      <ScreenState
        title="Błąd połączenia"
        message="Nie udało się połączyć z usługą Firebase."
        actionLabel="Odśwież"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (DISABLE_AUTH) {
    return <Layout />;
  }

  if (error) {
    return (
      <ScreenState
        title="Nie udało się zalogować"
        message={error.message || 'Wystąpił problem z autentykacją. Spróbuj ponownie za chwilę.'}
        actionLabel="Spróbuj ponownie"
        onAction={handleRetry}
        secondaryLabel="Odśwież stronę"
        onSecondaryAction={() => window.location.reload()}
      />
    );
  }

  if (loading && !timeoutReached) {
    return <LoadingSpinner message="Sprawdzanie sesji i przygotowanie aplikacji..." />;
  }

  if (loading && timeoutReached) {
    return (
      <ScreenState
        title="To trwa trochę za długo"
        message="Sesja nie zdążyła się przywrócić. Najczęściej pomaga odświeżenie strony albo ponowna próba logowania."
        actionLabel="Odśwież"
        onAction={() => window.location.reload()}
        secondaryLabel="Spróbuj ponownie"
        onSecondaryAction={handleRetry}
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

// Guard: tylko zalogowany admin może wejść na /admin
function AdminRoute() {
  const { isAdmin, loading } = useAdmin();
  const [user, authLoading] = useAuthState(auth);

  if (authLoading || loading) {
    return <LoadingSpinner message="Sprawdzanie uprawnień..." />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminDashboard />;
}

const appRoutes = [
  { path: '/', element: <Dashboard /> },
  { path: '/tasks', element: <Tasks /> },
  { path: '/shopping', element: <Shopping /> },
  { path: '/habits', element: <Habits /> },
  { path: '/notes', element: <Notes /> },
  { path: '/budget', element: <Budget /> },
  { path: '/plan', element: <DailyPlan /> },
  { path: '/calendar', element: <Calendar /> },
  { path: '/meals', element: <MealPlanner /> },
  { path: '/mood', element: <MoodTracker /> },
  { path: '/chat', element: <Chat /> },
  { path: '/goals', element: <Goals /> },
  { path: '/settings', element: <Settings /> },
];

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'pl';
  }, []);

  return (
    <DeviceProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <OfflineProvider>
              <Router>
                <Suspense fallback={<LoadingSpinner message="Ładowanie modułów aplikacji..." />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/admin-setup" element={<AdminSetup />} />
                    <Route path="/admin" element={<AdminRoute />} />

                    <Route path="/" element={<ProtectedRoutes />}>
                      {appRoutes.map((route) => (
                        <Route key={route.path} path={route.path} element={route.element} />
                      ))}
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Router>
            </OfflineProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </DeviceProvider>
  );
}
