/**
 * Prompt builder — constructs focused, well-scoped system instructions and
 * few-shot examples for Gemini so that responses are consistent and structured.
 */

export interface PromptConfig {
  userContext: string;
  conversationSummary?: string;
  mode: 'action' | 'chat' | 'query' | 'planning';
  language?: 'pl' | 'en';
  userName?: string;
  currentDate?: string;
}

export interface BuiltPrompt {
  systemInstruction: string;
  fewShotExamples: string;
  responseFormat: string;
}

// ─── Action schema description (JSON format the model must return) ────────────

const ACTION_SCHEMA = `
Zwróć TYLKO JSON w tym formacie (bez markdown, bez backticks):
{
  "reply": "Krótka odpowiedź po polsku dla użytkownika",
  "actions": [
    {
      "type": "add_task | add_note | add_shopping | add_event | add_goal | add_expense | add_income | complete_task | delete_task | no_action",
      "title": "Tytuł/nazwa",
      "description": "Opis (opcjonalne)",
      "dueDate": "YYYY-MM-DD (opcjonalne)",
      "dueTime": "HH:MM (opcjonalne)",
      "priority": "low | medium | high | urgent (opcjonalne)",
      "category": "kategoria (opcjonalne)",
      "amount": 0,
      "currency": "PLN"
    }
  ]
}
Jeśli wiadomość jest pytaniem lub pogawędką — zwróć actions: [] i odpowiedz w "reply".
`;

// ─── Few-shot examples ────────────────────────────────────────────────────────

const FEW_SHOT_EXAMPLES = `
PRZYKŁADY:

User: "dodaj zadanie kupić prezent dla mamy na jutro"
AI: {"reply":"Dodałem zadanie 'Kupić prezent dla mamy' na jutro.","actions":[{"type":"add_task","title":"Kupić prezent dla mamy","dueDate":"JUTRO","priority":"medium"}]}

User: "kup mleko i chleb"
AI: {"reply":"Dodałem mleko i chleb do listy zakupów.","actions":[{"type":"add_shopping","title":"Mleko"},{"type":"add_shopping","title":"Chleb"}]}

User: "spotkanie z klientem w piątek o 14:00"
AI: {"reply":"Dodałem spotkanie z klientem na piątek o 14:00.","actions":[{"type":"add_event","title":"Spotkanie z klientem","dueDate":"PIĄTEK","dueTime":"14:00"}]}

User: "wydałem 150 zł na paliwo"
AI: {"reply":"Zapisałem wydatek 150 PLN na paliwo.","actions":[{"type":"add_expense","title":"Paliwo","amount":150,"currency":"PLN"}]}

User: "jak się masz?"
AI: {"reply":"Dziękuję, gotowy do działania! W czym mogę pomóc?","actions":[]}

User: "dodaj zadanie zadzwonić do lekarza, zanotuj że mam wizytę 15 maja, i kup leki"
AI: {"reply":"Gotowe! Dodałem 3 rzeczy naraz: zadanie, notatkę i zakupy.","actions":[{"type":"add_task","title":"Zadzwonić do lekarza","priority":"high"},{"type":"add_note","title":"Wizyta u lekarza 15 maja"},{"type":"add_shopping","title":"Leki"}]}

User: "przesunąć projekt na następny tydzień"
AI: {"reply":"Przesunąłem projekt na następny tydzień.","actions":[{"type":"update_task","title":"Projekt","dueDate":"NASTĘPNY_TYDZIEŃ"}]}

User: "dodaj cel: przeczytać 3 książki do końca roku"
AI: {"reply":"Dodałem cel 'Przeczytać 3 książki do końca roku'. Powodzenia!","actions":[{"type":"add_goal","title":"Przeczytać 3 książki do końca roku"}]}

User: "zanotuj: spotkanie z zespołem w środę o 10:00"
AI: {"reply":"Zanotowałem spotkanie z zespołem w środę o 10:00.","actions":[{"type":"add_note","title":"Spotkanie z zespołem w środę o 10:00"}]}

User: "ile wydałem w tym miesiącu?"
AI: {"reply":"Nie mogę tego obliczyć bez dostępu do Twoich danych. Sprawdź sekcję Budżet w aplikacji.","actions":[]}

User: "zrobiłem zadanie 'Przygotować prezentację'"
AI: {"reply":"Świetnie! Zadanie 'Przygotować prezentację' zostało oznaczone jako ukończone.","actions":[{"type":"complete_task","title":"Przygotować prezentację"}]}

User: "dodaj wydatek 45.50 zł na kawę"
AI: {"reply":"Zapisałem wydatek 45.50 PLN na kawę.","actions":[{"type":"add_expense","title":"Kawa","amount":45.50,"currency":"PLN"}]}

User: "zaplanuj trening na jutro o 18:00"
AI: {"reply":"Dodałem trening na jutro o 18:00.","actions":[{"type":"add_event","title":"Trening","dueDate":"JUTRO","dueTime":"18:00","category":"health"}]}
`;

// ─── Mode-specific instructions ───────────────────────────────────────────────

const MODE_INSTRUCTIONS: Record<PromptConfig['mode'], string> = {
  action: `Twoim zadaniem jest WYKONYWANIE akcji w aplikacji LifeFast.
Zawsze zwróć JSON z akcjami. Jeden komunikat może zawierać wiele akcji naraz.
Jeśli polecenie jest niejasne, wykonaj najbardziej prawdopodobną interpretację i wspomnij o tym w "reply".
Priorytetyzuj bezpieczeństwo: jeśli użytkownik nie podał wymaganych informacji (np. datę dla zadania), poproś o wyjaśnienie.
Obsługuj błędy gracefully — jeśli akcja nie jest możliwa, wyjaśnij dlaczego w "reply".`,

  chat: `Jesteś pomocnym asystentem LifeFast.
Rozmawiasz po polsku w naturalny, przyjazny sposób.
NIE zwracaj JSON — odpowiadaj zwykłym tekstem.
Bądź zwięzły (max 3 zdania), ciepły i konkretny.
Jeśli użytkownik pyta o funkcje, które wymagają akcji, zasugeruj jak ich użyć.
Pamiętaj: Twoja rola to być wspierającym partnerem, nie tylko narzędziem.`,

  query: `Użytkownik pyta o swoje dane w aplikacji LifeFast.
Odpowiedz na pytanie używając danych z kontekstu użytkownika.
Zwróć JSON z "reply" (odpowiedź) i "actions": [] (brak akcji do wykonania).
Jeśli nie masz dostępu do danych, wyjaśnij to w "reply" i zasugeruj gdzie znaleźć informacje.
Bądź precyzyjny w liczbach i datach.`,

  planning: `Twoim zadaniem jest zaplanowanie złożonej sekwencji działań.
Rozbij polecenie użytkownika na mniejsze kroki i wykonaj je kolejno.
Wyjaśnij swój plan w "reply" i zwróć wszystkie akcje w tablicy "actions".
Jeśli kroki są zależne od siebie, wyjaśnij tę zależność.
Maksymalnie 5-7 akcji na raz — jeśli więcej, zasugeruj podzielenie na etapy.`,
};

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildSystemInstruction(config: PromptConfig): string {
  const date = config.currentDate ?? new Date().toISOString().split('T')[0];
  const name = config.userName ? `, imię użytkownika: ${config.userName}` : '';

  const sections: string[] = [
    `Jesteś LifeFast Operator — inteligentnym asystentem produktywności (data: ${date}${name}).`,
    `Zawsze komunikuj się po polsku.`,
    '',
    '=== TRYB ===',
    MODE_INSTRUCTIONS[config.mode],
    '',
    '=== DANE UŻYTKOWNIKA ===',
    config.userContext || 'Brak danych użytkownika.',
  ];

  if (config.conversationSummary) {
    sections.push('', '=== KONTEKST ROZMOWY ===', config.conversationSummary);
  }

  if (config.mode === 'action' || config.mode === 'planning' || config.mode === 'query') {
    sections.push('', '=== FORMAT ODPOWIEDZI ===', ACTION_SCHEMA);
  }

  return sections.join('\n');
}

export function buildFewShotBlock(mode: PromptConfig['mode']): string {
  if (mode === 'chat') return '';
  return FEW_SHOT_EXAMPLES;
}

export function buildFullPrompt(config: PromptConfig): BuiltPrompt {
  return {
    systemInstruction: buildSystemInstruction(config),
    fewShotExamples: buildFewShotBlock(config.mode),
    responseFormat: config.mode === 'chat' ? 'text' : 'json',
  };
}

// ─── Helper: detect which mode to use ────────────────────────────────────────

export function detectPromptMode(
  message: string,
  isActionCommand: boolean,
): PromptConfig['mode'] {
  const lower = message.toLowerCase();

  // Planning mode for complex multi-step messages
  const multiActionSignals = [' i ', ' oraz ', ' a także ', ' też ', ' jeszcze '];
  const actionCount = multiActionSignals.filter((s) => lower.includes(s)).length;
  if (isActionCommand && actionCount >= 2) return 'planning';

  // Query mode
  const querySignals = ['pokaż', 'ile', 'jakie', 'co mam', 'sprawdź', 'lista'];
  if (querySignals.some((s) => lower.includes(s))) return 'query';

  // Chat mode for greetings and questions
  const chatSignals = ['jak się', 'co słychać', 'cześć', 'hej', 'dziękuj', 'kim jesteś'];
  if (chatSignals.some((s) => lower.includes(s))) return 'chat';

  return isActionCommand ? 'action' : 'chat';
}
