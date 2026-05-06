/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';

import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import ForgotPassword from './components/ForgotPassword';

import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { CustomNavProvider } from './context/CustomNavContext';

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
const DISABLE_AUTH = true;

// 🔐 Route guard
function ProtectedRoutes() {
  const [user, loading, error] = useAuthState(auth);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Timeout for auth loading (prevents infinite loading)
  useEffect(() => {
    if (!loading) return;
    
    const timer = setTimeout(() => {
      console.warn('⚠️ Auth loading timeout - proceeding with fallback');
      setTimeoutReached(true);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Dev mode bypass
  if (DISABLE_AUTH) {
    console.log('🔓 Auth disabled - dev mode');
    return <Layout />;
  }

  // Handle auth errors
  if (error) {
    console.error('❌ Auth error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Błąd autentykacji</h2>
          <p className="text-gray-600 mb-4">Wystąpił problem z logowaniem. Spróbuj odświeżyć stronę.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Odśwież
          </button>
        </div>
      </div>
    );
  }

  // Loading state with timeout
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Sprawdzanie autentykacji...</p>
        </div>
      </div>
    );
  }

  // Timeout fallback
  if (loading && timeoutReached) {
    console.log('⏰ Auth timeout - showing login');
    return <Navigate to="/login" replace />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated successfully
  console.log('✅ User authenticated:', user.email);
  return <Layout />;
}

// 📦 Wspólna konfiguracja tras
const appRoutes = [
  { path: "", element: <Dashboard /> },
  { path: "tasks", element: <Tasks /> },
  { path: "shopping", element: <Shopping /> },
  { path: "habits", element: <Habits /> },
  { path: "notes", element: <Notes /> },
  { path: "budget", element: <Budget /> },
  { path: "plan", element: <DailyPlan /> },
  { path: "calendar", element: <Calendar /> },
  { path: "meals", element: <MealPlanner /> },
  { path: "mood", element: <MoodTracker /> },
  { path: "chat", element: <Chat /> },
  { path: "goals", element: <Goals /> },
  { path: "settings", element: <Settings /> },
];

export default function App() {
  return (
    <DeviceProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CustomNavProvider>
            <Router>
              <Suspense fallback={<div>Loading...</div>}>
            <Routes>

              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* App routes */}
              <Route path="/" element={<ProtectedRoutes />}>
                {appRoutes.map((route, i) => (
                  <Route key={i} path={route.path} element={route.element} />
                ))}
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </Suspense>
        </Router>
        </CustomNavProvider>
      </LanguageProvider>
      </ThemeProvider>
    </DeviceProvider>
  );
}