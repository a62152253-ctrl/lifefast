/**
 * Action validator — checks that AI-generated action payloads are safe and complete
 * before they are written to Firestore. Sanitizes, fills defaults, rejects invalid data.
 */

export type ActionType =
  | 'add_task'
  | 'add_note'
  | 'add_shopping'
  | 'add_event'
  | 'add_goal'
  | 'add_expense'
  | 'add_income'
  | 'complete_task'
  | 'delete_task'
  | 'no_action';

export interface RawAction {
  type: string;
  title?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: string;
  category?: string;
  amount?: number | string;
  currency?: string;
  targetId?: string;
}

export interface ValidatedAction {
  type: ActionType;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  amount: number;
  currency: string;
  targetId: string | null;
}

export interface ValidationResult {
  valid: ValidatedAction[];
  rejected: { action: RawAction; reason: string }[];
}

const KNOWN_TYPES = new Set<ActionType>([
  'add_task', 'add_note', 'add_shopping', 'add_event', 'add_goal',
  'add_expense', 'add_income', 'complete_task', 'delete_task', 'no_action',
]);

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const VALID_CURRENCIES = new Set(['PLN', 'EUR', 'USD', 'GBP']);

// ISO date YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// HH:MM
const TIME_REGEX = /^\d{2}:\d{2}$/;

function sanitizeString(value: unknown, maxLength = 300): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength).replace(/<[^>]*>/g, ''); // strip HTML tags
}

function resolveRelativeDate(raw: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalized = raw.trim().toUpperCase();
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  const weekdays: Record<string, number> = {
    PONIEDZIAŁEK: 1, WTOREK: 2, ŚRODA: 3, CZWARTEK: 4, PIĄTEK: 5, SOBOTA: 6, NIEDZIELA: 0,
  };

  if (normalized === 'DZISIAJ' || normalized === 'DZIŚ') return addDays(0);
  if (normalized === 'JUTRO') return addDays(1);
  if (normalized === 'POJUTRZE') return addDays(2);
  if (normalized === 'ZA TYDZIEŃ') return addDays(7);

  for (const [name, dayNum] of Object.entries(weekdays)) {
    if (normalized === name) {
      const current = today.getDay();
      let diff = dayNum - current;
      if (diff <= 0) diff += 7;
      return addDays(diff);
    }
  }

  if (DATE_REGEX.test(raw)) return raw;
  return null;
}

function validateAction(raw: RawAction): { action: ValidatedAction } | { error: string } {
  const type = (raw.type ?? '').trim() as ActionType;

  if (!KNOWN_TYPES.has(type)) {
    return { error: `Unknown action type: "${type}"` };
  }

  if (type === 'no_action') {
    return {
      action: {
        type,
        title: '', description: '', dueDate: null, dueTime: null,
        priority: 'medium', category: '', amount: 0, currency: 'PLN', targetId: null,
      },
    };
  }

  const title = sanitizeString(raw.title);
  if (!title) {
    return { error: `Action type "${type}" is missing a title` };
  }

  const dueDate = raw.dueDate ? resolveRelativeDate(raw.dueDate) : null;

  const dueTimeRaw = sanitizeString(raw.dueTime, 5);
  const dueTime = TIME_REGEX.test(dueTimeRaw) ? dueTimeRaw : null;

  const priorityRaw = sanitizeString(raw.priority).toLowerCase();
  const priority = VALID_PRIORITIES.has(priorityRaw)
    ? (priorityRaw as ValidatedAction['priority'])
    : 'medium';

  const currencyRaw = sanitizeString(raw.currency, 3).toUpperCase();
  const currency = VALID_CURRENCIES.has(currencyRaw) ? currencyRaw : 'PLN';

  const amountRaw = typeof raw.amount === 'number' ? raw.amount : parseFloat(String(raw.amount ?? '0'));
  const amount = Number.isFinite(amountRaw) && amountRaw >= 0 ? amountRaw : 0;

  if ((type === 'add_expense' || type === 'add_income') && amount === 0) {
    // Allow zero amounts but warn (caller handles logging)
  }

  return {
    action: {
      type,
      title,
      description: sanitizeString(raw.description, 1000),
      dueDate,
      dueTime,
      priority,
      category: sanitizeString(raw.category, 50),
      amount,
      currency,
      targetId: sanitizeString(raw.targetId) || null,
    },
  };
}

export function validateActions(rawActions: unknown[]): ValidationResult {
  const valid: ValidatedAction[] = [];
  const rejected: { action: RawAction; reason: string }[] = [];

  if (!Array.isArray(rawActions)) {
    return { valid: [], rejected: [] };
  }

  for (const raw of rawActions) {
    if (typeof raw !== 'object' || raw === null) {
      rejected.push({ action: raw as RawAction, reason: 'Not an object' });
      continue;
    }

    const result = validateAction(raw as RawAction);
    if ('error' in result) {
      rejected.push({ action: raw as RawAction, reason: result.error });
    } else {
      valid.push(result.action);
    }
  }

  return { valid, rejected };
}

export function parseGeminiResponse(raw: string): {
  reply: string;
  actions: ValidatedAction[];
  parseError?: string;
} {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(trimmed) as { reply?: unknown; actions?: unknown[] };
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    const { valid } = validateActions(parsed.actions ?? []);
    return { reply, actions: valid };
  } catch {
    // Model returned plain text — treat as conversational reply
    return { reply: trimmed, actions: [], parseError: 'Non-JSON response treated as chat' };
  }
}
