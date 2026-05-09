/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseInitialized, firebaseInitError } from './lib/firebase';

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

// 🔥 Lazy loaded pages (lepsza wydajność)
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
const Goals    = lazy(() => import('./components/Goals'));

// 🔁 Toggle auth (DEV vs PROD)
const DISABLE_AUTH = process.env.REACT_APP_DISABLE_AUTH === 'true' || false;

// Enhanced loading component with better UX
const LoadingSpinner = ({ message = 'Ładowanie...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

// Firebase initialization error component
const FirebaseError = ({ error, onRetry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8 max-w-md">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Błąd inicjalizacji Firebase</h2>
      <p className="text-gray-600 mb-4 text-sm">{error?.message || 'Nie udało się połączyć z Firebase'}</p>
      <button 
        onClick={onRetry} 
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mr-2"
      >
        Ponów
      </button>
      <button 
        onClick={() => window.location.reload()} 
        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Odśwież stronę
      </button>
    </div>
  </div>
);
// 🔐 Enhanced route guard with better error handling
function ProtectedRoutes() {
  const [user, loading, error] = useAuthState(auth);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Check Firebase initialization
  if (!isFirebaseInitialized && !DISABLE_AUTH) {
    return <FirebaseError error={firebaseInitError} onRetry={() => window.location.reload()} />;
  }

  // Timeout for auth loading (prevents infinite loading)
  useEffect(() => {
    if (!loading) return;
    
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  // Retry function
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    setRetryCount(prev => prev + 1);
    setTimeoutReached(false);
    
    // Wait a moment before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRetrying(false);
  }, []);

  // Dev mode bypass
  if (DISABLE_AUTH) {
    return <Layout />;
  }

  // Handle auth errors
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Błąd autentykacji</h2>
          <p className="text-gray-600 mb-4 text-sm">{error.message || 'Wystąpił problem z logowaniem. Spróbuj odświeżyć stronę.'}</p>
          <div className="space-x-2">
            <button 
              onClick={handleRetry} 
              disabled={retrying}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {retrying ? 'Ponawianie...' : 'Ponów'}
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Odśwież
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state with timeout
  if (loading && !timeoutReached) {
    return <LoadingSpinner message="Sprawdzanie autentykacji..." />;
  }

  // Timeout fallback
  if (loading && timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏰</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Przekroczono czas oczekiwania</h2>
          <p className="text-gray-600 mb-4">Logowanie trwa zbyt długo. Spróbuj ponownie.</p>
          <div className="space-x-2">
            <button 
              onClick={handleRetry} 
              disabled={retrying}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {retrying ? 'Ponawianie...' : 'Ponów'}
            </button>
            <Navigate to="/login" replace />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

// 📦 Wspólna konfiguracja tras
const appRoutes = [
  { path: "/", element: <Dashboard /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/shopping", element: <Shopping /> },
  { path: "/habits", element: <Habits /> },
  { path: "/notes", element: <Notes /> },
  { path: "/budget", element: <Budget /> },
  { path: "/plan", element: <DailyPlan /> },
  { path: "/calendar", element: <Calendar /> },
  { path: "/meals", element: <MealPlanner /> },
  { path: "/mood", element: <MoodTracker /> },
  { path: "/chat", element: <Chat /> },
  { path: "/goals", element: <Goals /> },
  { path: "/settings", element: <Settings /> },
];

export default function App() {
  // Check Firebase initialization on app start
  useEffect(() => {
    // Firebase initialization check is handled by ProtectedRoutes
  }, []);

  return (
    <DeviceProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <OfflineProvider>
                <Router>
                  <Suspense fallback={<LoadingSpinner message="Ładowanie aplikacji..." />}>
                    <Routes>

                      {/* Public routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />

                      {/* App routes */}
                      <Route path="/" element={<ProtectedRoutes />}>
                        {appRoutes.map((route) => {
                          const RouteComp = Route as any;
                          return <RouteComp key={route.path} path={route.path} element={route.element} />;
                        })}
                      </Route>

                      {/* Fallback */}
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