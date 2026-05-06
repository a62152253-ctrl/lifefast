/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useState } from 'react';
import { auth } from './lib/firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Shopping from './components/Shopping';
import Habits from './components/Habits';
import Notes from './components/Notes';
import Budget from './components/Budget';
import DailyPlan from './components/DailyPlan';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';

import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';

import MealPlanner from './components/MealPlanner';
import MoodTracker from './components/MoodTracker';

function ProtectedRoutes() {
  // Bypass authentication entirely for now
  return (
    <Layout />
  );
}

export default function App() {
  return (
    <DeviceProvider>
      <ThemeProvider>
        <Router>
          <Routes>
          
          {/* Public authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Direct dashboard access without login */}
          <Route path="/direct" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="habits" element={<Habits />} />
            <Route path="notes" element={<Notes />} />
            <Route path="budget" element={<Budget />} />
            <Route path="plan" element={<DailyPlan />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="meals" element={<MealPlanner />} />
            <Route path="mood" element={<MoodTracker />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Protected routes - require authentication */}
          <Route 
            path="/" 
            element={<ProtectedRoutes />}
          >
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="habits" element={<Habits />} />
            <Route path="notes" element={<Notes />} />
            <Route path="budget" element={<Budget />} />
            <Route path="plan" element={<DailyPlan />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="meals" element={<MealPlanner />} />
            <Route path="mood" element={<MoodTracker />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </ThemeProvider>
    </DeviceProvider>
  );
}

