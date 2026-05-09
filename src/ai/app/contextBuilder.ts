/**
 * Context builder — fetches live user data from Firestore and formats it
 * into a concise text block to inject into AI prompts.
 */

import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface UserContextData {
  tasks: TaskSummary[];
  habits: HabitSummary[];
  budgetBalance: number;
  budgetCurrency: string;
  shoppingItems: ShoppingSummary[];
  goals: GoalSummary[];
  upcomingEvents: EventSummary[];
}

interface TaskSummary {
  id: string;
  title: string;
  dueDate?: string;
  priority?: string;
  completed: boolean;
  overdue: boolean;
}

interface HabitSummary {
  id: string;
  name: string;
  streak: number;
}

interface BudgetEntry {
  amount: number;
  type: 'income' | 'expense';
  currency?: string;
}

interface ShoppingSummary {
  id: string;
  name: string;
  purchased: boolean;
}

interface GoalSummary {
  id: string;
  title: string;
  progress?: number;
}

interface EventSummary {
  id: string;
  title: string;
  date: string;
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < TODAY;
}

// ─── Firestore fetchers ───────────────────────────────────────────────────────

async function fetchTasks(userId: string): Promise<TaskSummary[]> {
  try {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('completed', '==', false),
      orderBy('dueDate', 'asc'),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? 'Bez tytułu',
        dueDate: data.dueDate ?? undefined,
        priority: data.priority ?? 'medium',
        completed: false,
        overdue: isOverdue(data.dueDate),
      };
    });
  } catch {
    return [];
  }
}

async function fetchHabits(userId: string): Promise<HabitSummary[]> {
  try {
    const q = query(collection(db, 'habits'), where('userId', '==', userId), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name ?? 'Nawyk', streak: data.streak ?? 0 };
    });
  } catch {
    return [];
  }
}

async function fetchBudgetBalance(userId: string): Promise<{ balance: number; currency: string }> {
  try {
    const q = query(collection(db, 'budgetEntries'), where('userId', '==', userId), limit(100));
    const snap = await getDocs(q);
    let balance = 0;
    let currency = 'PLN';
    snap.docs.forEach((d) => {
      const data = d.data() as BudgetEntry;
      if (data.currency) currency = data.currency;
      balance += data.type === 'income' ? (data.amount ?? 0) : -(data.amount ?? 0);
    });
    return { balance, currency };
  } catch {
    return { balance: 0, currency: 'PLN' };
  }
}

async function fetchShoppingItems(userId: string): Promise<ShoppingSummary[]> {
  try {
    const q = query(
      collection(db, 'shoppingItems'),
      where('userId', '==', userId),
      where('purchased', '==', false),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name ?? 'Produkt', purchased: false };
    });
  } catch {
    return [];
  }
}

async function fetchGoals(userId: string): Promise<GoalSummary[]> {
  try {
    const q = query(collection(db, 'goals'), where('userId', '==', userId), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, title: data.title ?? 'Cel', progress: data.progress ?? 0 };
    });
  } catch {
    return [];
  }
}

async function fetchUpcomingEvents(userId: string): Promise<EventSummary[]> {
  try {
    const todayStr = TODAY.toISOString().split('T')[0];
    const q = query(
      collection(db, 'events'),
      where('userId', '==', userId),
      where('date', '>=', todayStr),
      orderBy('date', 'asc'),
      limit(5),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, title: data.title ?? 'Wydarzenie', date: data.date ?? '' };
    });
  } catch {
    return [];
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function buildUserContextData(userId: string): Promise<UserContextData> {
  const [tasks, habits, budget, shoppingItems, goals, upcomingEvents] = await Promise.all([
    fetchTasks(userId),
    fetchHabits(userId),
    fetchBudgetBalance(userId),
    fetchShoppingItems(userId),
    fetchGoals(userId),
    fetchUpcomingEvents(userId),
  ]);

  return {
    tasks,
    habits,
    budgetBalance: budget.balance,
    budgetCurrency: budget.currency,
    shoppingItems,
    goals,
    upcomingEvents,
  };
}

export function formatContextForPrompt(data: UserContextData, dateStr: string): string {
  const overdueCount = data.tasks.filter((t) => t.overdue).length;
  const taskNames = data.tasks
    .slice(0, 5)
    .map((t) => `"${t.title}"${t.overdue ? ' [PO TERMINIE]' : ''}`)
    .join(', ');

  const lines: string[] = [
    `[DANE UŻYTKOWNIKA — ${dateStr}]`,
    `Otwarte zadania: ${data.tasks.length}${overdueCount > 0 ? ` (${overdueCount} po terminie)` : ''}`,
    data.tasks.length > 0 ? `  Zadania: ${taskNames}` : '',
    `Nawyki: ${data.habits.length}${data.habits.length > 0 ? ' — ' + data.habits.slice(0, 3).map((h) => `"${h.name}" (seria: ${h.streak}d)`).join(', ') : ''}`,
    `Cele: ${data.goals.length} aktywnych${data.goals.length > 0 ? ' — ' + data.goals.map((g) => `"${g.title}"`).join(', ') : ''}`,
    `Zakupy do kupienia: ${data.shoppingItems.length}${data.shoppingItems.length > 0 ? ' — ' + data.shoppingItems.slice(0, 4).map((s) => `"${s.name}"`).join(', ') : ''}`,
    `Bilans budżetu: ${data.budgetBalance >= 0 ? '+' : ''}${data.budgetBalance.toFixed(2)} ${data.budgetCurrency}`,
    data.upcomingEvents.length > 0
      ? `Nadchodzące wydarzenia: ${data.upcomingEvents.map((e) => `"${e.title}" (${e.date})`).join(', ')}`
      : '',
  ];

  return lines.filter(Boolean).join('\n');
}
