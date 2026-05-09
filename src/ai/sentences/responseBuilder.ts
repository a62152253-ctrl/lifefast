/**
 * Response builder — generates natural Polish responses for common assistant outcomes
 * so the AI sounds human even for simple confirmations, without calling Gemini.
 */

export type ResponseScenario =
  | 'task_added'
  | 'task_completed'
  | 'task_deleted'
  | 'task_rescheduled'
  | 'task_updated'
  | 'note_added'
  | 'note_deleted'
  | 'shopping_added'
  | 'shopping_completed'
  | 'event_added'
  | 'event_cancelled'
  | 'goal_added'
  | 'goal_achieved'
  | 'budget_added'
  | 'budget_exceeded'
  | 'multi_added'
  | 'bulk_action_completed'
  | 'nothing_found'
  | 'error_generic'
  | 'error_network'
  | 'error_permission'
  | 'offline'
  | 'greeting'
  | 'help'
  | 'unknown_command'
  | 'clarification_needed'
  | 'search_results'
  | 'analytics_summary'
  | 'reminder_set'
  | 'export_ready';

interface ResponseContext {
  entityName?: string;
  count?: number;
  amount?: string;
  date?: string;
  userName?: string;
}

// Multiple variants per scenario for variety
const RESPONSE_TEMPLATES: Record<ResponseScenario, string[]> = {
  task_added: [
    'Zadanie "{name}" zostało dodane. ✓',
    'Dodałem zadanie "{name}" do Twojej listy.',
    'Gotowe — "{name}" jest na liście zadań.',
  ],
  task_completed: [
    '"{name}" oznaczono jako ukończone. Świetna robota!',
    'Zadanie "{name}" zaliczone. Tak trzymaj!',
    'Zrobione! "{name}" zdjęte z listy.',
  ],
  task_deleted: [
    'Zadanie "{name}" zostało usunięte.',
    'Usunąłem "{name}" z listy zadań.',
  ],
  note_added: [
    'Notatka "{name}" została zapisana.',
    'Zanotowałem. "{name}" — gotowe.',
    'Zapisałem notatkę "{name}".',
  ],
  shopping_added: [
    '"{name}" dodano do listy zakupów.',
    'Dodałem "{name}" do zakupów.',
    'Nie zapomnisz — "{name}" jest na liście zakupów.',
  ],
  event_added: [
    'Wydarzenie "{name}" zostało dodane do kalendarza{date}.',
    'Zaplanowałem "{name}"{date} w kalendarzu.',
    '"{name}" pojawi się w Twoim kalendarzu{date}.',
  ],
  goal_added: [
    'Cel "{name}" został zapisany. Powodzenia!',
    'Dodałem cel "{name}". Dasz radę!',
    'Twój nowy cel: "{name}". Trzymam kciuki!',
  ],
  budget_added: [
    'Wpis budżetowy "{name}" ({amount}) został zapisany.',
    'Dodałem {amount} do budżetu jako "{name}".',
    'Zaktualizowałem budżet — "{name}" ({amount}).',
  ],
  multi_added: [
    'Gotowe! Dodałem {count} pozycji naraz.',
    'Zrobiłem to — {count} rzeczy zostało dodanych.',
    'Dodałem {count} pozycji. Wszystko zapisane!',
  ],
  nothing_found: [
    'Nie znalazłem żadnych pasujących elementów.',
    'Brak wyników dla tego zapytania.',
    'Nic tu nie pasuje — spróbuj inaczej.',
  ],
  error_generic: [
    'Coś poszło nie tak. Spróbuj jeszcze raz.',
    'Wystąpił błąd. Przepraszam — możesz powtórzyć polecenie?',
    'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.',
  ],
  offline: [
    'Jesteś offline. Niektóre funkcje AI są niedostępne, ale mogę wykonać podstawowe operacje.',
    'Brak połączenia z internetem. Działam w trybie offline — ograniczone możliwości.',
  ],
  greeting: [
    'Cześć{name}! W czym mogę pomóc?',
    'Hej{name}! Jestem gotowy do działania.',
    'Dzień dobry{name}! Jak mogę pomóc?',
  ],
  help: [
    'Potrafię zarządzać Twoimi zadaniami, notatkami, zakupami, kalendarzem, celami i budżetem. Powiedz mi co chcesz zrobić!',
    'Możesz mi powiedzieć np.: "dodaj zadanie na jutro", "kup mleko", "spotkanie w piątek o 15". Co Cię interesuje?',
  ],
  unknown_command: [
    'Nie rozumiem tego polecenia. Możesz powiedzieć inaczej?',
    'Hmm, nie wiem jak to wykonać. Spróbuj bardziej szczegółowo.',
    'To polecenie jest dla mnie niejasne. Możesz podać więcej szczegółów?',
  ],
  clarification_needed: [
    'Możesz podać więcej szczegółów? Nie jestem pewien co dokładnie chcesz zrobić.',
    'Coś mi umknęło — o co dokładnie chodzi?',
    'Potrzebuję trochę więcej informacji. Co masz na myśli?',
  ],
  task_rescheduled: [
    'Przesunąłem zadanie "{name}" na {date}.',
    'Zmieniam termin "{name}" na {date}.',
    'Zadanie "{name}" zaplanowane na {date}.',
  ],
  task_updated: [
    'Zaktualizowałem zadanie "{name}".',
    'Zmieniam szczegóły zadania "{name}".',
    'Zadanie "{name}" zostało zmienione.',
  ],
  note_deleted: [
    'Notatka "{name}" została usunięta.',
    'Usunąłem notatkę "{name}".',
  ],
  shopping_completed: [
    '"{name}" zaznaczono jako kupione.',
    'Świetnie! "{name}" już masz.',
  ],
  event_cancelled: [
    'Anulowałem wydarzenie "{name}".',
    'Usunąłem "{name}" z kalendarza.',
  ],
  goal_achieved: [
    'Gratulacje! Osiągnąłeś cel "{name}"! 🎉',
    'Wspaniale! Cel "{name}" został zrealizowany!',
  ],
  budget_exceeded: [
    'Uwaga: Przekroczyłeś budżet dla "{name}".',
    'Budżet "{name}" został przekroczony.',
  ],
  bulk_action_completed: [
    'Gotowe! Wykonałem operację na {count} pozycjach.',
    'Zrobiłem to — {count} elementów zostało zaktualizowanych.',
  ],
  error_network: [
    'Problem z połączeniem. Sprawdź internet i spróbuj ponownie.',
    'Nie mogę się połączyć. Czy masz dostęp do internetu?',
  ],
  error_permission: [
    'Nie masz uprawnień do tej operacji.',
    'Brak dostępu — ta akcja jest niedostępna.',
  ],
  search_results: [
    'Znalazłem {count} wyników dla "{name}".',
    'Oto {count} pasujących elementów.',
  ],
  analytics_summary: [
    'W tym tygodniu wykonałeś {count} zadań. Świetnie!',
    'Twoja produktywność: {count} zadań ukończonych.',
  ],
  reminder_set: [
    'Ustawiłem przypomnienie na {date} o {time}.',
    'Przypomnę Ci o "{name}" {date}.',
  ],
  export_ready: [
    'Twoje dane są gotowe do pobrania.',
    'Eksport zakończony — możesz pobrać plik.',
  ],
};

let lastVariantIndex: Partial<Record<ResponseScenario, number>> = {};

function pickVariant(scenario: ResponseScenario): string {
  const variants = RESPONSE_TEMPLATES[scenario];
  const lastIdx = lastVariantIndex[scenario] ?? -1;
  const nextIdx = (lastIdx + 1) % variants.length;
  lastVariantIndex[scenario] = nextIdx;
  return variants[nextIdx];
}

function fillTemplate(template: string, ctx: ResponseContext): string {
  return template
    .replace('{name}', ctx.entityName ?? '')
    .replace('{count}', String(ctx.count ?? 0))
    .replace('{amount}', ctx.amount ?? '')
    .replace('{date}', ctx.date ? ` na ${ctx.date}` : '')
    .replace('{name}', ctx.userName ? ` ${ctx.userName}` : '');
}

export function buildResponse(scenario: ResponseScenario, ctx: ResponseContext = {}): string {
  const template = pickVariant(scenario);
  return fillTemplate(template, ctx);
}

export function buildMultiActionSummary(actions: { type: string; name: string }[]): string {
  if (actions.length === 0) return buildResponse('nothing_found');
  if (actions.length === 1) {
    const a = actions[0];
    const scenarioMap: Record<string, ResponseScenario> = {
      task: 'task_added',
      note: 'note_added',
      shopping: 'shopping_added',
      event: 'event_added',
      goal: 'goal_added',
      budget: 'budget_added',
    };
    const scenario = scenarioMap[a.type] ?? 'task_added';
    return buildResponse(scenario, { entityName: a.name });
  }

  const lines = actions.map((a) => {
    const emoji: Record<string, string> = {
      task: '✓',
      note: '📝',
      shopping: '🛒',
      event: '📅',
      goal: '🎯',
      budget: '💰',
    };
    return `${emoji[a.type] ?? '•'} ${a.name}`;
  });

  return `Gotowe! Dodałem ${actions.length} pozycji:\n${lines.join('\n')}`;
}

export function buildErrorResponse(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('quota') || error.message.includes('429')) {
      return 'Przekroczono limit API. Spróbuj za chwilę.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return buildResponse('offline');
    }
    if (error.message.includes('permission') || error.message.includes('403')) {
      return 'Brak uprawnień do wykonania tej operacji.';
    }
  }
  return buildResponse('error_generic');
}
