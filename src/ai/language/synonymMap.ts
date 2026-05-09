/**
 * Polish synonym map — canonical Polish commands → list of accepted variants.
 * Allows the assistant to understand natural phrasing without always hitting Gemini.
 */

export interface SynonymEntry {
  canonical: string;
  synonyms: string[];
  action: string;
  entity: string;
}

export const SYNONYM_ENTRIES: SynonymEntry[] = [
  // ── TASK actions ──────────────────────────────────────────────────────────
  {
    canonical: 'dodaj zadanie',
    synonyms: [
      'utwórz zadanie', 'stwórz zadanie', 'nowe zadanie', 'zapisz zadanie',
      'dodaj do listy zadań', 'dodaj task', 'zaplanuj zadanie', 'new task',
      'wpisz zadanie', 'zrób zadanie', 'ustaw zadanie', 'dodaj reminder',
      'przypomnij mi', 'przypomnij o', 'nie zapomnij', 'muszę zrobić',
    ],
    action: 'add_task',
    entity: 'task',
  },
  {
    canonical: 'usuń zadanie',
    synonyms: [
      'skasuj zadanie', 'wymaż zadanie', 'zakończ zadanie', 'usuń task',
      'skasuj task', 'zrobiłem', 'zrobiłam', 'gotowe', 'done', 'ukończone',
      'odznacz zadanie', 'zamknij zadanie', 'oznacz jako zrobione',
    ],
    action: 'complete_task',
    entity: 'task',
  },

  // ── NOTE actions ──────────────────────────────────────────────────────────
  {
    canonical: 'dodaj notatkę',
    synonyms: [
      'utwórz notatkę', 'zapisz notatkę', 'nowa notatka', 'zanotuj',
      'zapamiętaj to', 'zapisz to', 'zapisz że', 'zrób notatkę',
      'zanotuj sobie', 'wpisz notatkę', 'new note', 'add note',
      'zaznacz', 'zapamiętaj', 'stwórz notatkę',
    ],
    action: 'add_note',
    entity: 'note',
  },

  // ── SHOPPING actions ──────────────────────────────────────────────────────
  {
    canonical: 'dodaj do zakupów',
    synonyms: [
      'kup', 'kup mi', 'lista zakupów', 'dodaj do listy', 'potrzebuję kupić',
      'brakuje', 'dokupić', 'dopisz do zakupów', 'dodaj produkt',
      'dołóż do koszyka', 'add to shopping', 'kup to', 'kup tamto',
      'nabądź', 'weź ze sklepu', 'przynieś', 'zrób zakupy',
    ],
    action: 'add_shopping',
    entity: 'shopping',
  },

  // ── EVENT / CALENDAR actions ──────────────────────────────────────────────
  {
    canonical: 'dodaj wydarzenie',
    synonyms: [
      'zaplanuj spotkanie', 'utwórz wydarzenie', 'nowe wydarzenie',
      'dodaj do kalendarza', 'mam spotkanie', 'zapisz w kalendarzu',
      'dodaj termin', 'umów spotkanie', 'zarezerwuj termin', 'dodaj wizytę',
      'wpisz do kalendarza', 'zorganizuj spotkanie', 'add event',
      'schedule meeting', 'nowe spotkanie', 'mam termin',
    ],
    action: 'add_event',
    entity: 'event',
  },

  // ── GOAL actions ──────────────────────────────────────────────────────────
  {
    canonical: 'dodaj cel',
    synonyms: [
      'utwórz cel', 'nowy cel', 'chcę osiągnąć', 'moim celem jest',
      'wyznacz cel', 'zapisz cel', 'cel do osiągnięcia', 'chcę zrobić',
      'planuję', 'mój cel to', 'add goal', 'set goal',
    ],
    action: 'add_goal',
    entity: 'goal',
  },

  // ── BUDGET actions ────────────────────────────────────────────────────────
  {
    canonical: 'dodaj wydatek',
    synonyms: [
      'zapisz wydatek', 'wydałem', 'wydałam', 'kupiłem za', 'kosztowało',
      'zapłaciłem', 'zapłaciłam', 'dodaj do budżetu', 'wpisz wydatek',
      'zapisz koszt', 'add expense', 'expense',
    ],
    action: 'add_expense',
    entity: 'budget',
  },
  {
    canonical: 'dodaj przychód',
    synonyms: [
      'zarobiłem', 'zarobiłam', 'wpływ do budżetu', 'dodaj dochód',
      'mam przychód', 'otrzymałem', 'otrzymałam', 'dostałem wynagrodzenie',
      'add income', 'income', 'przelew', 'dostałem pieniądze',
    ],
    action: 'add_income',
    entity: 'budget',
  },

  // ── QUERY ─────────────────────────────────────────────────────────────────
  {
    canonical: 'pokaż moje zadania',
    synonyms: [
      'jakie mam zadania', 'lista zadań', 'moje zadania', 'co mam do zrobienia',
      'co powinienem zrobić', 'pokaż todo', 'show tasks', 'wyświetl zadania',
    ],
    action: 'list_tasks',
    entity: 'task',
  },
  {
    canonical: 'pokaż mój budżet',
    synonyms: [
      'ile wydałem', 'ile zarobiłem', 'mój budżet', 'podsumowanie finansów',
      'finanse', 'co z budżetem', 'show budget', 'bilans',
    ],
    action: 'show_budget',
    entity: 'budget',
  },
];

// Flat lookup: synonym → canonical action
const SYNONYM_LOOKUP = new Map<string, string>();

for (const entry of SYNONYM_ENTRIES) {
  for (const synonym of entry.synonyms) {
    SYNONYM_LOOKUP.set(synonym.toLowerCase(), entry.action);
  }
  SYNONYM_LOOKUP.set(entry.canonical.toLowerCase(), entry.action);
}

export function resolveAction(text: string): string | null {
  const lower = text.toLowerCase();

  // Exact match first
  if (SYNONYM_LOOKUP.has(lower)) return SYNONYM_LOOKUP.get(lower)!;

  // Substring match (longest wins)
  let bestAction: string | null = null;
  let bestLen = 0;

  for (const [synonym, action] of SYNONYM_LOOKUP.entries()) {
    if (lower.includes(synonym) && synonym.length > bestLen) {
      bestAction = action;
      bestLen = synonym.length;
    }
  }

  return bestAction;
}

export function getEntityForAction(action: string): string | null {
  const entry = SYNONYM_ENTRIES.find((e) => e.action === action);
  return entry?.entity ?? null;
}

export function getAllSynonyms(action: string): string[] {
  const entry = SYNONYM_ENTRIES.find((e) => e.action === action);
  if (!entry) return [];
  return [entry.canonical, ...entry.synonyms];
}
