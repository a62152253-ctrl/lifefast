import { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection, query, where, onSnapshot, orderBy, limit, Timestamp, QuerySnapshot, DocumentData
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { format, isToday, isPast, isTomorrow, startOfDay, differenceInDays } from 'date-fns';

export type NotifType = 'task' | 'budget' | 'habit' | 'goal' | 'shopping' | 'meal' | 'mood' | 'calendar';

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  severity: 'info' | 'warning' | 'error';
  time: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function useCollection<T>(
  collectionName: string,
  userId: string | undefined,
  extraConstraints: any[] = [],
  mapper: (id: string, data: DocumentData) => T | null,
  ownerField = 'userId'
): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!userId) { setItems([]); return; }

    const q = query(
      collection(db, collectionName),
      where(ownerField, '==', userId),
      ...extraConstraints
    );

    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const data = snap.docs
        .map((d: any) => mapper(d.id, d.data()))
        .filter((x: T | null): x is T => x !== null);
      setItems(data);
    }, () => {});

    return unsub;
  }, [userId, collectionName, ownerField]); // eslint-disable-line

  return items;
}

// ─── main hook ───────────────────────────────────────────────────────────────

export function useSmartNotifications() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  // ── tasks ──────────────────────────────────────────────────────────────────
  const tasks = useCollection(
    'tasks', uid,
    [orderBy('createdAt', 'desc'), limit(200)],
    (id, d) => d.title ? {
      id,
      title: String(d.title),
      completed: Boolean(d.completed),
      dueDate: d.dueDate as string | undefined,
      priority: d.priority as string | undefined,
    } : null
  );

  // ── budget ─────────────────────────────────────────────────────────────────
  const transactions = useCollection(
    'budget', uid,
    [orderBy('date', 'desc'), limit(300)],
    (id, d) => typeof d.amount === 'number' && d.type ? {
      id,
      amount: Number(d.amount),
      type: d.type as 'income' | 'expense',
      category: String(d.category || 'Inne'),
    } : null
  );

  // ── habits ─────────────────────────────────────────────────────────────────
  const habits = useCollection(
    'habits', uid,
    [orderBy('createdAt', 'desc')],
    (id, d) => d.name ? {
      id,
      name: String(d.name),
      streak: Number(d.streak || 0),
      completions: (d.completions || {}) as Record<string, boolean>,
    } : null
  );

  // ── goals ──────────────────────────────────────────────────────────────────
  const goals = useCollection(
    'goals', uid,
    [orderBy('createdAt', 'desc')],
    (id, d) => d.title ? {
      id,
      title: String(d.title),
      progress: Number(d.progress || 0),
      completed: Boolean(d.completed),
      targetDate: d.targetDate as string | undefined,
    } : null
  );

  // ── shopping ───────────────────────────────────────────────────────────────
  const shoppingItems = useCollection(
    'shoppingItems', uid,
    [limit(200)],
    (id, d) => d.name ? {
      id,
      name: String(d.name),
      checked: Boolean(d.checked),
    } : null,
    'addedBy'
  );

  // ── meals ──────────────────────────────────────────────────────────────────
  const meals = useCollection(
    'mealPlans', uid,
    [limit(100)],
    (id, d) => d.name ? {
      id,
      name: String(d.name),
      day: String(d.day || ''),
      calories: Number(d.calories || 0),
    } : null
  );

  // ── moods ──────────────────────────────────────────────────────────────────
  const moods = useCollection(
    'moodEntries', uid,
    [orderBy('createdAt', 'desc'), limit(7)],
    (id, d) => d.mood ? {
      id,
      mood: String(d.mood),
      createdAt: toDate(d.createdAt),
    } : null
  );

  // ── calendar events ────────────────────────────────────────────────────────
  const calendarEvents = useCollection(
    'calendarEvents', uid,
    [orderBy('date', 'asc')],
    (id, d) => d.title && d.date ? {
      id,
      title: String(d.title),
      date: String(d.date),
    } : null
  );

  // ── build notifications ────────────────────────────────────────────────────
  const notifications = useMemo<SmartNotification[]>(() => {
    const result: SmartNotification[] = [];
    const currentHour = now.getHours();

    // ── BUDGET ────────────────────────────────────────────────────────────────
    const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpenses;

    if (totalIncome > 0 || totalExpenses > 0) {
      if (balance < 0) {
        result.push({
          id: 'budget-negative',
          title: 'Budżet na minusie',
          message: `Bilans: ${balance.toFixed(2)} zł. Wydatki przekraczają przychody o ${Math.abs(balance).toFixed(2)} zł.`,
          type: 'budget', severity: 'error', time: 'teraz',
        });
      } else if (totalIncome > 0 && balance < totalIncome * 0.1) {
        result.push({
          id: 'budget-low',
          title: 'Niski budżet',
          message: `Pozostało tylko ${balance.toFixed(2)} zł (${Math.round((balance / totalIncome) * 100)}% przychodów).`,
          type: 'budget', severity: 'warning', time: 'teraz',
        });
      }

      // Top spending category > 50%
      const catTotals: Record<string, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      });
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
      if (topCat && totalExpenses > 0 && (topCat[1] / totalExpenses) > 0.5) {
        result.push({
          id: `budget-cat-${topCat[0]}`,
          title: 'Duże wydatki w kategorii',
          message: `"${topCat[0]}" to ${Math.round((topCat[1] / totalExpenses) * 100)}% wydatków (${topCat[1].toFixed(2)} zł).`,
          type: 'budget', severity: 'warning', time: 'teraz',
        });
      }
    }

    // ── TASKS ─────────────────────────────────────────────────────────────────
    const overdue = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const d = toDate(t.dueDate);
      return d && isPast(startOfDay(d)) && !isToday(d);
    });
    if (overdue.length > 0) {
      result.push({
        id: 'tasks-overdue',
        title: `${overdue.length} przeterminowanych zadań`,
        message: overdue.length === 1
          ? `"${overdue[0].title}" jest po terminie.`
          : `"${overdue[0].title}" i ${overdue.length - 1} innych jest po terminie.`,
        type: 'task', severity: 'error', time: 'teraz',
      });
    }

    const dueToday = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const d = toDate(t.dueDate);
      return d && isToday(d);
    });
    if (dueToday.length > 0) {
      result.push({
        id: 'tasks-today',
        title: `${dueToday.length} zadań na dziś`,
        message: dueToday.length === 1
          ? `Do zrobienia: "${dueToday[0].title}".`
          : `"${dueToday[0].title}" i ${dueToday.length - 1} innych.`,
        type: 'task', severity: 'info', time: 'dziś',
      });
    }

    const dueTomorrow = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const d = toDate(t.dueDate);
      return d && isTomorrow(d);
    });
    if (dueTomorrow.length > 0) {
      result.push({
        id: 'tasks-tomorrow',
        title: `${dueTomorrow.length} zadań na jutro`,
        message: `"${dueTomorrow[0].title}"${dueTomorrow.length > 1 ? ` i ${dueTomorrow.length - 1} innych` : ''}.`,
        type: 'task', severity: 'info', time: 'jutro',
      });
    }

    const highPending = tasks.filter(t => !t.completed && t.priority === 'high');
    if (highPending.length > 0) {
      result.push({
        id: 'tasks-high',
        title: 'Zadania wysokiego priorytetu',
        message: `${highPending.length} nieukończonych zadań wymaga uwagi.`,
        type: 'task', severity: 'warning', time: 'teraz',
      });
    }

    // ── HABITS ────────────────────────────────────────────────────────────────
    const missedToday = habits.filter(h => !h.completions[todayStr]);
    if (missedToday.length > 0 && currentHour >= 18) {
      result.push({
        id: 'habits-missed',
        title: `${missedToday.length} nawyków do zrobienia`,
        message: missedToday.length === 1
          ? `Nie zrobiłeś jeszcze: "${missedToday[0].name}".`
          : `"${missedToday[0].name}" i ${missedToday.length - 1} innych.`,
        type: 'habit', severity: 'warning', time: 'dziś',
      });
    }

    const streakAtRisk = habits.filter(h => h.streak >= 3 && !h.completions[todayStr]);
    if (streakAtRisk.length > 0) {
      result.push({
        id: 'habits-streak',
        title: 'Seria zagrożona!',
        message: `"${streakAtRisk[0].name}" — seria ${streakAtRisk[0].streak} dni. Nie przerywaj!`,
        type: 'habit', severity: 'warning', time: 'dziś',
      });
    }

    // ── GOALS ─────────────────────────────────────────────────────────────────
    const overdueGoals = goals.filter(g => {
      if (g.completed || !g.targetDate) return false;
      return isPast(new Date(g.targetDate)) && !isToday(new Date(g.targetDate));
    });
    if (overdueGoals.length > 0) {
      result.push({
        id: 'goals-overdue',
        title: `${overdueGoals.length} celów po terminie`,
        message: `"${overdueGoals[0].title}" przekroczył datę docelową.`,
        type: 'goal', severity: 'error', time: 'teraz',
      });
    }

    const stuckGoals = goals.filter(g => !g.completed && g.progress < 10 && g.targetDate);
    if (stuckGoals.length > 0) {
      result.push({
        id: 'goals-stuck',
        title: 'Cele bez postępu',
        message: `"${stuckGoals[0].title}" ma tylko ${stuckGoals[0].progress}% postępu.`,
        type: 'goal', severity: 'info', time: 'teraz',
      });
    }

    const nearGoals = goals.filter(g => {
      if (g.completed || !g.targetDate) return false;
      const days = differenceInDays(new Date(g.targetDate), now);
      return days >= 0 && days <= 7;
    });
    if (nearGoals.length > 0) {
      const days = differenceInDays(new Date(nearGoals[0].targetDate!), now);
      result.push({
        id: 'goals-near',
        title: 'Cel zbliża się do terminu',
        message: `"${nearGoals[0].title}" — ${days === 0 ? 'dziś!' : `${days} dni`}, postęp: ${nearGoals[0].progress}%.`,
        type: 'goal', severity: days <= 2 ? 'warning' : 'info', time: `${days === 0 ? 'dziś' : days + 'd'}`,
      });
    }

    // ── SHOPPING ──────────────────────────────────────────────────────────────
    const unchecked = shoppingItems.filter(i => !i.checked);
    if (unchecked.length >= 10) {
      result.push({
        id: 'shopping-many',
        title: 'Długa lista zakupów',
        message: `Masz ${unchecked.length} produktów do kupienia.`,
        type: 'shopping', severity: 'info', time: 'teraz',
      });
    }

    // ── MEALS ─────────────────────────────────────────────────────────────────
    const DAYS_FULL = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
    const todayName = DAYS_FULL[now.getDay()];
    const todayMeals = meals.filter(m => m.day === todayName);
    const totalKcal = todayMeals.reduce((s, m) => s + m.calories, 0);
    const CALORIE_GOAL = 2000;

    if (todayMeals.length > 0 && totalKcal > CALORIE_GOAL * 1.15) {
      result.push({
        id: 'meals-over',
        title: 'Przekroczono limit kalorii',
        message: `Dziś spożyłeś ${totalKcal} kcal (cel: ${CALORIE_GOAL} kcal).`,
        type: 'meal', severity: 'warning', time: 'dziś',
      });
    }

    if (currentHour >= 12 && todayMeals.length === 0) {
      result.push({
        id: 'meals-empty',
        title: 'Brak posiłków na dziś',
        message: 'Nie zaplanowałeś żadnych posiłków na dziś.',
        type: 'meal', severity: 'info', time: 'dziś',
      });
    }

    // ── MOOD ──────────────────────────────────────────────────────────────────
    const MOOD_SCORES: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, angry: 1 };
    const recentMoods = moods.slice(0, 5);
    const avgMood = recentMoods.length > 0
      ? recentMoods.reduce((s, m) => s + (MOOD_SCORES[m.mood] || 3), 0) / recentMoods.length
      : null;

    if (avgMood !== null && avgMood < 2.5) {
      result.push({
        id: 'mood-low',
        title: 'Niski nastrój ostatnio',
        message: 'Twój nastrój w ostatnich dniach jest poniżej średniej. Zadbaj o siebie.',
        type: 'mood', severity: 'warning', time: 'ostatnio',
      });
    }

    const todayMood = moods.find(m => m.createdAt && isToday(m.createdAt));
    if (!todayMood && currentHour >= 20) {
      result.push({
        id: 'mood-missing',
        title: 'Brak wpisu nastroju',
        message: 'Nie zapisałeś dziś swojego nastroju.',
        type: 'mood', severity: 'info', time: 'dziś',
      });
    }

    // ── CALENDAR ──────────────────────────────────────────────────────────────
    const todayEvents = calendarEvents.filter(e => e.date === todayStr);
    if (todayEvents.length > 0) {
      result.push({
        id: 'calendar-today',
        title: `${todayEvents.length} wydarzeń dziś`,
        message: todayEvents.length === 1
          ? `"${todayEvents[0].title}" zaplanowane na dziś.`
          : `"${todayEvents[0].title}" i ${todayEvents.length - 1} innych.`,
        type: 'calendar', severity: 'info', time: 'dziś',
      });
    }

    const tomorrowStr = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');
    const tomorrowEvents = calendarEvents.filter(e => e.date === tomorrowStr);
    if (tomorrowEvents.length > 0) {
      result.push({
        id: 'calendar-tomorrow',
        title: `${tomorrowEvents.length} wydarzeń jutro`,
        message: `"${tomorrowEvents[0].title}"${tomorrowEvents.length > 1 ? ` i ${tomorrowEvents.length - 1} innych` : ''}.`,
        type: 'calendar', severity: 'info', time: 'jutro',
      });
    }

    // Sort: error first, then warning, then info
    const order = { error: 0, warning: 1, info: 2 };
    return result.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [tasks, transactions, habits, goals, shoppingItems, meals, moods, calendarEvents, todayStr]);

  return { notifications, count: notifications.length };
}
