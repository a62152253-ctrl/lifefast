/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';

import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import ForgotPassword from './components/ForgotPassword';

import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';

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

// 🔁 Toggle auth (DEV vs PROD)
const DISABLE_AUTH = true;

// 🔐 Route guard
function ProtectedRoutes() {
  const [user, loading] = useAuthState(auth);

  if (DISABLE_AUTH) {
    return <Layout />;
  }

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
  { path: "settings", element: <Settings /> },
];

export default function App() {
  return (
    <DeviceProvider>
      <ThemeProvider>
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
      </ThemeProvider>
    </DeviceProvider>
  );
}