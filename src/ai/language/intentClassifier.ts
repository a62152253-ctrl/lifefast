/**
 * Intent classifier — determines whether a user message is an action command
 * (create/delete/update something) or a conversational/informational message.
 */

export type IntentCategory =
  | 'CREATE_TASK'
  | 'DELETE_TASK'
  | 'UPDATE_TASK'
  | 'CREATE_NOTE'
  | 'CREATE_SHOPPING'
  | 'CREATE_EVENT'
  | 'CREATE_GOAL'
  | 'CREATE_BUDGET'
  | 'QUERY_DATA'
  | 'CHITCHAT'
  | 'HELP'
  | 'COMPLETE_TASK'
  | 'RESCHEDULE_TASK'
  | 'SEARCH_TASKS'
  | 'BULK_ACTION'
  | 'ANALYTICS'
  | 'SETTINGS'
  | 'EXPORT_DATA'
  | 'UNKNOWN';

export interface IntentResult {
  category: IntentCategory;
  confidence: number; // 0–1
  isActionable: boolean;
  keywords: string[];
}

// Keyword sets mapped to intent categories (Polish + common forms)
const INTENT_PATTERNS: Record<IntentCategory, string[]> = {
  CREATE_TASK: [
    'dodaj zadanie', 'utwórz zadanie', 'stwórz zadanie', 'nowe zadanie',
    'dodaj todo', 'muszę zrobić', 'powinienem zrobić', 'zaplanuj zadanie',
    'przypomnij mi o', 'dodaj do listy zadań', 'zapisz zadanie',
    'mam do zrobienia', 'dodaj task', 'nowy task',
  ],
  DELETE_TASK: [
    'usuń zadanie', 'skasuj zadanie', 'wymaż zadanie', 'zakończ zadanie',
    'oznacz jako zrobione', 'zrobiłem', 'zrobiłam', 'gotowe', 'ukończone',
    'odznacz zadanie', 'usuń task', 'skasuj task',
  ],
  UPDATE_TASK: [
    'zmień zadanie', 'edytuj zadanie', 'zaktualizuj zadanie', 'przesuń zadanie',
    'zmień termin', 'zmień priorytet', 'przenieś zadanie',
  ],
  CREATE_NOTE: [
    'dodaj notatkę', 'utwórz notatkę', 'zapisz notatkę', 'nowa notatka',
    'zanotuj', 'zapamiętaj', 'zapisz to', 'zapisz że', 'notatka',
    'dodaj wpis', 'zanotuj sobie',
  ],
  CREATE_SHOPPING: [
    'dodaj do zakupów', 'kup', 'kup mi', 'lista zakupów', 'dodaj do listy',
    'potrzebuję kupić', 'brakuje', 'dokupić', 'zakupy', 'shopping',
    'dodaj produkt', 'dopisz do zakupów', 'dołóż do koszyka',
  ],
  CREATE_EVENT: [
    'dodaj wydarzenie', 'zaplanuj spotkanie', 'utwórz wydarzenie', 'nowe wydarzenie',
    'dodaj do kalendarza', 'mam spotkanie', 'zapisz w kalendarzu',
    'dodaj termin', 'umów spotkanie', 'zarezerwuj termin', 'dodaj wizytę',
  ],
  CREATE_GOAL: [
    'dodaj cel', 'utwórz cel', 'nowy cel', 'chcę osiągnąć', 'moim celem jest',
    'wyznacz cel', 'zapisz cel', 'cel do osiągnięcia',
  ],
  CREATE_BUDGET: [
    'dodaj wydatek', 'zapisz wydatek', 'wydałem', 'wydałam', 'kupiłem za',
    'kosztowało', 'zapłaciłem', 'zapłaciłam', 'dodaj do budżetu',
    'dodaj przychód', 'zarobiłem', 'wpływ do budżetu', 'wydatek budżetowy',
  ],
  QUERY_DATA: [
    'pokaż', 'wyświetl', 'co mam', 'ile mam', 'jakie mam', 'sprawdź',
    'lista zadań', 'moje zadania', 'moje zakupy', 'mój budżet',
    'co jest zaplanowane', 'co mam do zrobienia', 'podsumuj', 'raport',
    'ile wydałem', 'ile zarobiłem', 'moje cele', 'moje notatki',
  ],
  CHITCHAT: [
    'cześć', 'hej', 'hey', 'siema', 'dzień dobry', 'dobry wieczór', 'jak się masz',
    'co słychać', 'dziękuję', 'dzięki', 'ok', 'okej', 'super', 'świetnie',
    'fajnie', 'cool', 'wow', 'nie rozumiem', 'pomoc', 'co potrafisz',
    'kim jesteś', 'co umiesz', 'powiedz mi o sobie', 'do widzenia', 'pa',
    'hi', 'hello', 'yo', 'elo', 'witam', 'jak leci', 'co tam', 'co u ciebie',
    'w porządku', 'wszystko ok', 'działa', 'git', 'spoko', 'dobra', 'ok',
    'thx', 'thanks', 'dzieki', 'dziekuję', 'thx', 'tx',
  ],
  HELP: [
    'pomoc', 'help', 'co możesz zrobić', 'jak cię używać', 'instrukcja',
    'co potrafisz', 'jakie masz możliwości', 'jak działa', 'pokaż przykłady',
    'jak dodać', 'jak usunąć', 'jak zmienić',
  ],
  COMPLETE_TASK: [
    'oznacz jako gotowe', 'ukończ zadanie', 'zrobiłem to', 'zrobiłam to',
    'skończyłem', 'skończyłam', 'wykonane', 'załatwione', 'done',
  ],
  RESCHEDULE_TASK: [
    'przesuń na', 'zmień datę', 'przełóż na', 'zmień termin na',
    'zaplanuj na', 'przesunąć na', 'zmień harmonogram',
  ],
  SEARCH_TASKS: [
    'szukaj', 'wyszukaj', 'znajdź', 'szukam', 'gdzie jest',
    'pokaż mi', 'filtruj', 'sortuj', 'pokaż zadania z',
  ],
  BULK_ACTION: [
    'zaznacz wszystkie', 'usuń wszystkie', 'oznacz wszystkie',
    'wyczyść listę', 'archiwizuj wszystkie', 'duplikuj',
  ],
  ANALYTICS: [
    'statystyki', 'raport', 'podsumowanie', 'analiza', 'wykresy',
    'postęp', 'produktywność', 'ile zrobiłem', 'ile czasu',
  ],
  SETTINGS: [
    'ustawienia', 'preferencje', 'konfiguracja', 'zmień ustawienia',
    'powiadomienia', 'motyw', 'język', 'profil',
  ],
  EXPORT_DATA: [
    'eksportuj', 'pobierz', 'wyeksportuj', 'zapisz dane',
    'backup', 'kopia zapasowa', 'wyślij', 'udostępnij',
  ],
  UNKNOWN: [],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) =>
      ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' } as Record<string, string>)[c] ?? c,
    )
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyIntent(message: string): IntentResult {
  const normalized = normalize(message);
  const words = normalized.split(' ');

  const scores: Partial<Record<IntentCategory, number>> = {};

  for (const [category, patterns] of Object.entries(INTENT_PATTERNS) as [IntentCategory, string[]][]) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const pattern of patterns) {
      const normalizedPattern = normalize(pattern);
      if (normalized.includes(normalizedPattern)) {
        score += normalizedPattern.split(' ').length; // longer match = higher score
        matchedKeywords.push(pattern);
      }
    }

    // Also check individual words for partial matches
    for (const word of words) {
      for (const pattern of patterns) {
        const patternWords = normalize(pattern).split(' ');
        if (patternWords.length === 1 && patternWords[0] === word) {
          score += 0.5;
        }
      }
    }

    if (score > 0) {
      scores[category] = score;
    }
  }

  if (Object.keys(scores).length === 0) {
    return { category: 'UNKNOWN', confidence: 0.1, isActionable: false, keywords: [] };
  }

  const sorted = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const [topCategory, topScore] = sorted[0] as [IntentCategory, number];
  const totalScore = sorted.reduce((sum, [, s]) => sum + (s as number), 0);
  const confidence = Math.min(topScore / Math.max(totalScore, 1), 1);

  const actionableCategories: IntentCategory[] = [
    'CREATE_TASK', 'DELETE_TASK', 'UPDATE_TASK', 'CREATE_NOTE',
    'CREATE_SHOPPING', 'CREATE_EVENT', 'CREATE_GOAL', 'CREATE_BUDGET',
  ];

  const matchedKeywords = INTENT_PATTERNS[topCategory].filter((p) =>
    normalized.includes(normalize(p)),
  );

  return {
    category: topCategory,
    confidence,
    isActionable: actionableCategories.includes(topCategory),
    keywords: matchedKeywords,
  };
}

export function isActionCommand(message: string): boolean {
  const result = classifyIntent(message);
  return result.isActionable && result.confidence > 0.2;
}

export function getPrimaryAction(message: string): string {
  const { category } = classifyIntent(message);
  const actionMap: Record<IntentCategory, string> = {
    CREATE_TASK: 'add_task',
    DELETE_TASK: 'complete_task',
    UPDATE_TASK: 'update_task',
    CREATE_NOTE: 'add_note',
    CREATE_SHOPPING: 'add_shopping',
    CREATE_EVENT: 'add_event',
    CREATE_GOAL: 'add_goal',
    CREATE_BUDGET: 'add_budget',
    QUERY_DATA: 'query',
    CHITCHAT: 'chat',
    HELP: 'help',
    COMPLETE_TASK: 'complete_task',
    RESCHEDULE_TASK: 'update_task',
    SEARCH_TASKS: 'search',
    BULK_ACTION: 'bulk_action',
    ANALYTICS: 'analytics',
    SETTINGS: 'settings',
    EXPORT_DATA: 'export',
    UNKNOWN: 'unknown',
  };
  return actionMap[category] ?? 'unknown';
}
