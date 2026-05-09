import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { addDays, format } from 'date-fns';
import { db } from '../lib/firebase';
import { contextualize } from '../ai/language/contextualizer';
import { classifyIntent } from '../ai/language/intentClassifier';
import { extractEntities } from '../ai/language/entityExtractor';
import { buildMultiActionSummary, buildErrorResponse } from '../ai/sentences/responseBuilder';
import { conversationMemory } from '../ai/memory/conversationMemory';
import { patternLearner } from '../ai/learning/patternLearner';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type NotePriority = 'low' | 'medium' | 'high';
type BudgetType = 'income' | 'expense';

type AssistantAction =
  | {
      type: 'create_note';
      title?: string;
      content: string;
      category?: string;
      tags?: string[];
      priority?: NotePriority;
    }
  | { type: 'pin_note'; reference: string }
  | { type: 'delete_note'; reference: string }
  | {
      type: 'create_task';
      title: string;
      category?: string;
      priority?: TaskPriority;
      dueDate?: string;
      notes?: string;
    }
  | { type: 'complete_task'; reference: string }
  | { type: 'reopen_task'; reference: string }
  | { type: 'delete_task'; reference: string }
  | {
      type: 'create_habit';
      name: string;
      category?: string;
      emoji?: string;
      target?: number;
    }
  | {
      type: 'create_shopping_item';
      name: string;
      quantity?: string;
      category?: string;
    }
  | { type: 'check_shopping_item'; reference: string }
  | { type: 'uncheck_shopping_item'; reference: string }
  | {
      type: 'create_goal';
      title: string;
      category?: string;
      targetDate?: string;
      description?: string;
      progress?: number;
    }
  | { type: 'update_goal_progress'; reference: string; progress: number }
  | {
      type: 'create_calendar_event';
      title: string;
      date?: string;
      time?: string;
      category?: string;
      description?: string;
      location?: string;
      allDay?: boolean;
    }
  | { type: 'create_plan_item'; activity: string; date?: string; time?: string }
  | {
      type: 'create_budget_entry';
      description: string;
      amount: number;
      entryType: BudgetType;
      category?: string;
    }
  | { type: 'show_summary'; scope?: 'today' | 'general' };

interface AssistantPlan {
  reply: string;
  actions: AssistantAction[];
}

interface AssistantResult {
  reply: string;
  performedActions: string[];
  usedAdvancedPlanning: boolean;
}

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

interface NoteRecord {
  id: string;
  title?: string;
  content?: string;
  pinned?: boolean;
}

interface TaskRecord {
  id: string;
  title?: string;
  completed?: boolean;
}

interface HabitRecord {
  id: string;
  name?: string;
}

interface ShoppingRecord {
  id: string;
  name?: string;
  checked?: boolean;
}

interface GoalRecord {
  id: string;
  title?: string;
  completed?: boolean;
}

interface CalendarEventRecord {
  id: string;
  date?: string;
}

interface PlanRecord {
  id: string;
  date?: string;
}

interface BudgetRecord {
  id: string;
  amount?: number;
  type?: string;
}

const TASK_CATEGORIES = new Set([
  'work',
  'home',
  'health',
  'finance',
  'personal',
  'education',
  'shopping',
  'travel',
  'fitness',
  'social',
  'hobby',
  'creative',
  'volunteer',
  'spiritual',
  'other',
]);

const NOTE_CATEGORIES = new Set([
  'general',
  'work',
  'personal',
  'ideas',
  'projects',
  'research',
  'meeting',
  'plans',
  'learning',
  'diary',
]);

const HABIT_CATEGORIES = new Set(['health', 'work', 'sport', 'mind', 'finance', 'other']);
const SHOPPING_CATEGORIES = new Set([
  'warzywa',
  'nabial',
  'mieso',
  'piekarnia',
  'napoje',
  'dom',
  'mrozonki',
  'konservy',
  'slodycze',
  'przyprawy',
  'alkohole',
  'higiena',
  'papier',
  'zwierzeta',
  'elektronika',
  'odziez',
  'inne',
]);
const GOAL_CATEGORIES = new Set([
  'health',
  'work',
  'personal',
  'finance',
  'learning',
  'social',
  'adventure',
  'creative',
  'spiritual',
  'family',
]);
const EVENT_CATEGORIES = new Set(['work', 'health', 'social', 'personal', 'other']);
const NOTE_PRIORITIES = new Set(['low', 'medium', 'high']);
const TASK_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export const ASSISTANT_PROMPTS = [
  'Dodaj zadanie oddac paczke jutro',
  'Dodaj notatke pomysl na landing page',
  'Dodaj zakupy: mleko, chleb, banany',
  'Ustaw wydarzenie jutro 15:30 dentysta',
  'Dodaj wydatek 42.90 na kawa i ciasto',
  'Pokaz podsumowanie dnia',
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s:-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
        .slice(0, 8)
    : [];
}

function toBooleanValue(value: unknown) {
  return value === true;
}

function toNumberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampProgress(value: unknown) {
  const numberValue = toNumberValue(value);
  if (numberValue === null) return 0;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function sanitizeSetValue(value: unknown, allowedValues: Set<string>, fallback: string) {
  const normalizedValue = normalizeText(toStringValue(value));
  return allowedValues.has(normalizedValue) ? normalizedValue : fallback;
}

function sanitizeTaskPriority(value: unknown): TaskPriority {
  const normalizedValue = normalizeText(toStringValue(value));
  return TASK_PRIORITIES.has(normalizedValue)
    ? (normalizedValue as TaskPriority)
    : 'medium';
}

function sanitizeNotePriority(value: unknown): NotePriority {
  const normalizedValue = normalizeText(toStringValue(value));
  return NOTE_PRIORITIES.has(normalizedValue)
    ? (normalizedValue as NotePriority)
    : 'medium';
}

function sanitizeDate(value: unknown) {
  const rawValue = normalizeText(toStringValue(value));

  if (!rawValue) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue;
  if (rawValue === 'today' || rawValue === 'dzis' || rawValue === 'dzisiaj') {
    return format(new Date(), 'yyyy-MM-dd');
  }
  if (rawValue === 'tomorrow' || rawValue === 'jutro') {
    return format(addDays(new Date(), 1), 'yyyy-MM-dd');
  }
  if (rawValue === 'pojutrze' || rawValue === 'day after tomorrow') {
    return format(addDays(new Date(), 2), 'yyyy-MM-dd');
  }

  return undefined;
}

function sanitizeTime(value: unknown) {
  const rawValue = toStringValue(value).replace('.', ':');
  const match = rawValue.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function sanitizeBudgetType(value: unknown): BudgetType {
  const normalizedValue = normalizeText(toStringValue(value));
  return normalizedValue === 'income' || normalizedValue === 'przychod' ? 'income' : 'expense';
}

function extractJsonObject(text: string) {
  const normalizedText = text.replace(/```json|```/gi, '').trim();
  const startIndex = normalizedText.indexOf('{');
  const endIndex = normalizedText.lastIndexOf('}');
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;
  return normalizedText.slice(startIndex, endIndex + 1);
}

function sanitizeAction(rawAction: any): AssistantAction | null {
  const type = toStringValue(rawAction?.type).toLowerCase().replace(/\s+/g, '_').trim();

  switch (type) {
    case 'create_note': {
      const content = toStringValue(rawAction?.content);
      if (!content) return null;
      return {
        type: 'create_note',
        title: toStringValue(rawAction?.title) || undefined,
        content: content.slice(0, 10000),
        category: sanitizeSetValue(rawAction?.category, NOTE_CATEGORIES, 'general'),
        tags: toStringArray(rawAction?.tags),
        priority: sanitizeNotePriority(rawAction?.priority),
      };
    }
    case 'pin_note':
    case 'delete_note': {
      const reference = toStringValue(rawAction?.reference || rawAction?.title || rawAction?.name);
      if (!reference) return null;
      return { type, reference };
    }
    case 'complete_task':
    case 'reopen_task':
    case 'delete_task': {
      const reference = toStringValue(rawAction?.reference || rawAction?.title || rawAction?.name);
      if (!reference) return null;
      return { type, reference };
    }
    case 'check_shopping_item':
    case 'uncheck_shopping_item': {
      const reference = toStringValue(rawAction?.reference || rawAction?.title || rawAction?.name);
      if (!reference) return null;
      return { type, reference };
    }
    case 'create_task': {
      const title = toStringValue(rawAction?.title);
      if (!title) return null;
      return {
        type: 'create_task',
        title,
        category: sanitizeSetValue(rawAction?.category, TASK_CATEGORIES, 'other'),
        priority: sanitizeTaskPriority(rawAction?.priority),
        dueDate: sanitizeDate(rawAction?.dueDate || rawAction?.date),
        notes: toStringValue(rawAction?.notes) || undefined,
      };
    }
    case 'create_habit': {
      const name = toStringValue(rawAction?.name);
      if (!name) return null;
      return {
        type: 'create_habit',
        name,
        category: sanitizeSetValue(rawAction?.category, HABIT_CATEGORIES, 'health'),
        emoji: toStringValue(rawAction?.emoji) || '⚡',
        target: Math.max(1, Math.min(365, Math.round(toNumberValue(rawAction?.target) ?? 21))),
      };
    }
    case 'create_shopping_item': {
      const name = toStringValue(rawAction?.name);
      if (!name) return null;
      return {
        type: 'create_shopping_item',
        name,
        quantity: toStringValue(rawAction?.quantity) || '1',
        category: sanitizeSetValue(rawAction?.category, SHOPPING_CATEGORIES, 'inne'),
      };
    }
    case 'create_goal': {
      const title = toStringValue(rawAction?.title);
      if (!title) return null;
      return {
        type: 'create_goal',
        title,
        category: sanitizeSetValue(rawAction?.category, GOAL_CATEGORIES, 'personal'),
        targetDate: sanitizeDate(rawAction?.targetDate || rawAction?.date),
        description: toStringValue(rawAction?.description) || undefined,
        progress: clampProgress(rawAction?.progress),
      };
    }
    case 'update_goal_progress': {
      const reference = toStringValue(rawAction?.reference || rawAction?.title);
      if (!reference) return null;
      return {
        type: 'update_goal_progress',
        reference,
        progress: clampProgress(rawAction?.progress),
      };
    }
    case 'create_calendar_event': {
      const title = toStringValue(rawAction?.title);
      if (!title) return null;
      return {
        type: 'create_calendar_event',
        title,
        date: sanitizeDate(rawAction?.date),
        time: sanitizeTime(rawAction?.time),
        category: sanitizeSetValue(rawAction?.category, EVENT_CATEGORIES, 'other'),
        description: toStringValue(rawAction?.description) || undefined,
        location: toStringValue(rawAction?.location) || undefined,
        allDay: toBooleanValue(rawAction?.allDay),
      };
    }
    case 'create_plan_item': {
      const activity = toStringValue(rawAction?.activity);
      if (!activity) return null;
      return {
        type: 'create_plan_item',
        activity,
        date: sanitizeDate(rawAction?.date),
        time: sanitizeTime(rawAction?.time) || '09:00',
      };
    }
    case 'create_budget_entry': {
      const description = toStringValue(rawAction?.description);
      const amount = toNumberValue(rawAction?.amount);
      if (!description || amount === null || amount <= 0) return null;
      return {
        type: 'create_budget_entry',
        description,
        amount: Number(amount.toFixed(2)),
        entryType: sanitizeBudgetType(rawAction?.entryType || rawAction?.type),
        category: toStringValue(rawAction?.category) || 'inne',
      };
    }
    case 'show_summary':
      return { type: 'show_summary', scope: rawAction?.scope === 'today' ? 'today' : 'general' };
    default:
      return null;
  }
}

function sanitizePlan(rawPlan: any): AssistantPlan {
  const reply = toStringValue(rawPlan?.reply) || 'Juz sie tym zajmuje.';
  const rawActions = Array.isArray(rawPlan?.actions) ? rawPlan.actions : [];

  return {
    reply,
    actions: rawActions.map(sanitizeAction).filter((action): action is AssistantAction => action !== null).slice(0, 10),
  };
}

function getHelpReply() {
  return `Moge realnie zarzadzac aplikacja. Przyklady:

- "dodaj zadanie wyslac fakture jutro"
- "oznacz zadanie wyslac fakture jako zrobione"
- "dodaj notatke pomysl na kampanie"
- "dodaj zakupy: mleko, chleb, banany"
- "ustaw wydarzenie jutro 15:30 dentysta"
- "dodaj wydatek 49.90 na paliwo"
- "dodaj cel przeczytac 12 ksiazek do 2026-12-31"
- "pokaz podsumowanie dnia"`;
}

function extractValueAfterCommand(command: string, pattern: RegExp) {
  const match = command.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function extractAmount(command: string) {
  const match = command.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  return Number(match[1].replace(',', '.'));
}

function extractTimeFromText(command: string) {
  return sanitizeTime(command.match(/([01]?\d|2[0-3])[:.]([0-5]\d)/)?.[0]);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wordMatch(normalized: string, word: string): boolean {
  return new RegExp(`(^|\\s)${word}(\\s|$)`).test(normalized);
}

function handleChitchat(normalized: string): string | null {
  const n = normalized;
  const wordCount = n.trim().split(/\s+/).length;

  // Powitania — tylko jeśli wiadomość jest krótka LUB zaczyna się od powitania
  const greetings = ['hej', 'hejka', 'hejo', 'siema', 'siemanko', 'siemka', 'czesc', 'hi', 'hello', 'elo', 'witaj', 'serwus', 'heja'];
  if (greetings.some(g => n === g || (wordCount <= 3 && wordMatch(n, g)))) {
    return pickRandom([
      'Hej! Co mogę dla Ciebie zrobić?',
      'Siema! Gotowy do działania, mów śmiało.',
      'Cześć! Jak mogę Ci dziś pomóc?',
      'Hejka! W czym mogę pomóc?',
      'No hej! Co robimy?',
      'Cześć! Pamiętam nasze poprzednie rozmowy. Co tym razem?',
    ]);
  }

  // Jak się masz / co słychać — frazy wielowyrazowe, bezpieczne
  if (['jak sie masz', 'co slychac', 'co u ciebie', 'jak leci', 'co porabiasz', 'jak zyjesz'].some(p => n.includes(p))) {
    return pickRandom([
      'Dobrze, dzięki! Zawsze gotowy do pomocy. Co robimy?',
      'Świetnie! Czekam na Twoje komendy. Co chcesz zrobić?',
      'W formie! Co mogę dla Ciebie zrobić?',
      'Uczę się cały czas! Im więcej rozmawiamy, tym lepiej Cię rozumiem.',
    ]);
  }

  // Kim jesteś / co umiesz — frazy wielowyrazowe
  if (['kim jestes', 'co umiesz', 'co potrafisz', 'co mozesz', 'do czego sluzy'].some(p => n.includes(p))) {
    return 'Jestem LifeFast Operator — Twój inteligentny asystent z pamięcią i uczeniem się! Mogę:\n\n' +
      '✅ Zarządzać zadaniami, notatkami, zakupami\n' +
      '✅ Planować wydarzenia i cele\n' +
      '✅ Śledzić budżet i wydatki\n' +
      '✅ Pamiętać Twoje preferencje\n' +
      '✅ Uczyć się z każdej rozmowy\n' +
      '✅ Rozumieć kontekst i nawiązania\n\n' +
      'Powiedz np. "dodaj zadanie" albo po prostu pogadajmy!';
  }

  // Pytania o pamięć i uczenie się
  if (['pamietasz', 'co pamietasz', 'uczysz sie', 'jak sie uczysz', 'co wiesz o mnie'].some(p => n.includes(p))) {
    return 'Tak! Uczę się z każdej rozmowy. Pamiętam:\n' +
      '• Twoje ulubione kategorie i wzorce\n' +
      '• Często używane frazy\n' +
      '• Kontekst poprzednich rozmów\n' +
      '• Twoje preferencje czasowe\n\n' +
      'Im więcej rozmawiamy, tym lepiej Cię rozumiem!';
  }

  // Pytania o możliwości AI
  if (['jestes ai', 'jestes botem', 'sztuczna inteligencja', 'jak dzialasz'].some(p => n.includes(p))) {
    return 'Tak, jestem AI! Używam:\n' +
      '• Analizy języka naturalnego (NLP)\n' +
      '• Rozpoznawania intencji\n' +
      '• Ekstrakcji encji (daty, kwoty, nazwy)\n' +
      '• Pamięci konwersacyjnej\n' +
      '• Uczenia się wzorców\n\n' +
      'Dzięki temu rozumiem polski język i kontekst rozmowy!';
  }

  // Podziękowania — tylko krótkie wiadomości lub dokładne słowa
  const thanksWords = ['dzieki', 'dziekuje', 'thx', 'thanks'];
  if (thanksWords.some(p => n === p || (wordCount <= 4 && wordMatch(n, p)))) {
    return pickRandom([
      'Nie ma za co! Mogę coś jeszcze zrobić?',
      'Cała przyjemność po mojej stronie! Co dalej?',
      'Zawsze do usług! Coś jeszcze?',
      'Cieszę się, że mogłem pomóc! 😊',
    ]);
  }

  // Potwierdzenia / reakcje — tylko gdy cała wiadomość to 1-2 słowa
  if (wordCount <= 2) {
    const acks = ['ok', 'okej', 'git', 'spoko', 'super', 'fajnie', 'cool', 'swietnie', 'dobra', 'jasne', 'rozumiem', 'kumam'];
    if (acks.some(p => n === p || wordMatch(n, p))) {
      return pickRandom([
        'Super! Co dalej?',
        'Git! Mogę coś jeszcze zrobić?',
        'Okej! Czekam na kolejne polecenie.',
        'Spoko, jestem tu. Co robimy?',
      ]);
    }
  }

  // Pożegnania — tylko krótkie wiadomości i dokładne słowa
  const farewells = ['do widzenia', 'na razie', 'do zobaczenia', 'dobranoc'];
  const farewellWords = ['bye', 'papa'];
  if (
    farewells.some(p => n.includes(p)) ||
    (wordCount <= 2 && farewellWords.some(p => n === p || wordMatch(n, p)))
  ) {
    return pickRandom([
      'Do zobaczenia! Wróć kiedy będziesz potrzebował pomocy. 👋',
      'Pa pa! Miło było porozmawiać.',
      'Na razie! Wróć kiedy chcesz.',
      'Dobranoc! Pamiętam naszą rozmowę na następny raz. 🌙',
    ]);
  }

  // Pytania o czas / datę
  if (['ktora godzina', 'jaka jest godzina', 'która godzina'].some(p => n.includes(p))) {
    return `Teraz jest ${format(new Date(), 'HH:mm')}.`;
  }
  if (['jaka jest data', 'jaki mamy dzien', 'ktory mamy dzien'].some(p => n.includes(p))) {
    return `Dzisiaj jest ${format(new Date(), 'd.M.yyyy')}.`;
  }

  // Pytania o pogodę (symulacja)
  if (['jaka pogoda', 'pogoda', 'czy bedzie padac'].some(p => n.includes(p))) {
    return 'Nie mam dostępu do danych pogodowych, ale mogę dodać przypomnienie o sprawdzeniu pogody! Chcesz?';
  }

  // Pytania o motywację
  if (['zmotywuj mnie', 'potrzebuje motywacji', 'nie mam sily', 'nie chce mi sie'].some(p => n.includes(p))) {
    return pickRandom([
      '💪 Każdy mały krok to postęp! Zacznij od jednej małej rzeczy.',
      '🌟 Pamiętaj po co zaczynałeś! Twoje cele są w zasięgu ręki.',
      '🚀 Nie musisz być perfekcyjny, wystarczy że zaczniesz!',
      '✨ Wierzę w Ciebie! Masz to! Co możemy zrobić razem?',
    ]);
  }

  // "Nie wiem co robić" — frazy wielowyrazowe
  if (['co proponujesz', 'co sugerujesz', 'co mam zrobic', 'pomoz mi', 'nie wiem co robic'].some(p => n.includes(p))) {
    return 'Mogę pomóc z wieloma rzeczami! Powiedz np.:\n' +
      '• "dodaj zadanie [co masz do zrobienia]"\n' +
      '• "kup [produkty]"\n' +
      '• "pokaz podsumowanie dnia"\n' +
      '• "dodaj wydatek [kwota] na [opis]"\n' +
      '• "zaplanuj spotkanie jutro o 15:00"\n\n' +
      'Albo po prostu pogadajmy!';
  }

  // Komplementy dla AI
  if (['jestes super', 'jestes swietny', 'jestes dobry', 'lubie cie', 'jestes pomocny'].some(p => n.includes(p))) {
    return pickRandom([
      'Dzięki! Staram się być jak najbardziej pomocny. 😊',
      'Miło mi to słyszeć! Uczę się cały czas, żeby być lepszy.',
      'Dziękuję! To dzięki naszym rozmowom staję się lepszy!',
    ]);
  }

  return null;
}

function fallbackPlan(command: string): AssistantPlan {
  const normalized = normalizeText(command);

  // Obsługa rozmowy (chitchat) w pierwszej kolejności
  const chitchatReply = handleChitchat(normalized);
  if (chitchatReply) {
    return { reply: chitchatReply, actions: [] };
  }

  if (normalized.includes('pomoc') || normalized.includes('help') || normalized.includes('co potrafisz') || normalized.includes('co umiesz')) {
    return { reply: getHelpReply(), actions: [] };
  }

  if (normalized.includes('podsumowanie') || normalized.includes('summary') || normalized.includes('bilans') || normalized.includes('statystyki')) {
    return { reply: 'Sprawdzam aktualny stan aplikacji.', actions: [{ type: 'show_summary', scope: 'today' }] };
  }

  const { category, isActionable } = classifyIntent(command);
  const entities = extractEntities(command);

  const dateStr = entities.dates.length > 0 ? format(entities.dates[0].resolved, 'yyyy-MM-dd') : undefined;
  const timeStr = entities.times.length > 0
    ? `${String(entities.times[0].hours).padStart(2, '0')}:${String(entities.times[0].minutes).padStart(2, '0')}`
    : extractTimeFromText(command);
  const firstAmount = entities.amounts[0]?.value ?? extractAmount(command);
  const priority = (entities.priorities[0] as TaskPriority | undefined) ?? 'medium';

  const cleanTitle = command
    .replace(/\b(dodaj|dodajmy|stwórz|stworz|utwórz|utworz|zanotuj|zapisz|zaplanuj|ustaw|wpisz|zapamiętaj|zapamiętaj|kup|kupić|kupic|dopisz|przypomnij mi o|oznacz jako zrobione|ukończ|ukoncz)\b/gi, '')
    .replace(/\b(zadanie|task|notatk[ęeia]?|notatka|zakupy|zakup|produkt|nawyk|cel|wydarzenie|spotkanie|wpis|wydatek|przychód|przychod)\b/gi, '')
    .replace(/\b(jutro|dzisiaj|dziś|dzis|pojutrze|wczoraj|za tydzień|za tydzien|następny tydzień|nastepny tydzien)\b/gi, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/[:\-,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  switch (category) {
    case 'CREATE_TASK': {
      const title = cleanTitle || command.replace(/\b(dodaj|task|zadanie)\b/gi, '').trim();
      if (!title || title.length < 2) return { reply: 'Podaj tytuł zadania, np. "dodaj zadanie wyslac maila".', actions: [] };
      return {
        reply: `Dodaje zadanie "${title}".`,
        actions: [{ type: 'create_task', title, priority, dueDate: dateStr, category: 'other' }],
      };
    }

    case 'COMPLETE_TASK':
    case 'DELETE_TASK': {
      const reference = cleanTitle || command;
      if (category === 'COMPLETE_TASK') {
        return { reply: `Oznaczam "${reference}" jako zrobione.`, actions: [{ type: 'complete_task', reference }] };
      }
      return { reply: `Usuwam zadanie "${reference}".`, actions: [{ type: 'delete_task', reference }] };
    }

    case 'CREATE_NOTE': {
      const content = command
        .replace(/\b(dodaj|stwórz|stworz|utwórz|utworz|zanotuj|zapisz|zapamiętaj|pamietaj|notatk[ęeia]?|notatka)\b/gi, '')
        .replace(/^[:\-\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim() || command;
      return {
        reply: `Tworze notatke.`,
        actions: [{ type: 'create_note', content, title: content.slice(0, 50), category: 'general', tags: ['AI'], priority: 'medium' }],
      };
    }

    case 'CREATE_SHOPPING': {
      const rawItems = command
        .replace(/\b(dodaj zakupy|dodaj do zakupów|lista zakupów|dopisz do zakupów|kup mi|kup|kupić|kupic|dodaj produkt|dopisz|dodaj)\b/gi, '')
        .replace(/^[:\-\s]+/, '')
        .split(/[,;]|\s+i\s+|\s+oraz\s+|\s+a\s+(?=[a-ząćęłńóśźżA-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      if (rawItems.length === 0) return { reply: 'Podaj produkty, np. "kup mleko, chleb, banany".', actions: [] };
      return {
        reply: `Dodaje ${rawItems.length === 1 ? `"${rawItems[0]}"` : `${rawItems.length} produkty`} do zakupow.`,
        actions: rawItems.map((name) => ({ type: 'create_shopping_item' as const, name, category: 'inne', quantity: '1' })),
      };
    }

    case 'CREATE_EVENT': {
      const title = cleanTitle || 'Wydarzenie';
      const date = dateStr ?? (normalized.includes('jutro') ? format(addDays(new Date(), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      return {
        reply: `Dodaje wydarzenie "${title}" na ${date}${timeStr ? ` o ${timeStr}` : ''}.`,
        actions: [{ type: 'create_calendar_event', title, date, time: timeStr, allDay: !timeStr, category: 'personal' }],
      };
    }

    case 'CREATE_GOAL': {
      const title = cleanTitle || command;
      return {
        reply: `Tworze cel "${title}".`,
        actions: [{ type: 'create_goal', title, category: 'personal', targetDate: dateStr }],
      };
    }

    case 'CREATE_BUDGET': {
      const isIncome = normalized.includes('przychod') || normalized.includes('zarobilem') || normalized.includes('zarobil') || normalized.includes('wplyw');
      const desc = command
        .replace(/\b(dodaj|zapisz|wydatek|przychód|przychod|zarobił|zarobiłem|wydałem|wydałam|kosztuje|zapłaciłem|zapłaciłam)\b/gi, '')
        .replace(/\d+(?:[.,]\d+)?\s*(?:zł|pln|złotych|euro)?/gi, '')
        .replace(/\s+na\s+/i, ' ')
        .replace(/[:\-,]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Wpis finansowy';
      if (!firstAmount) return { reply: 'Podaj kwote, np. "dodaj wydatek 50 zl na kawe".', actions: [] };
      return {
        reply: `Zapisuje ${isIncome ? 'przychod' : 'wydatek'} ${firstAmount.toFixed(2)} PLN.`,
        actions: [{ type: 'create_budget_entry', description: desc, amount: firstAmount, entryType: isIncome ? 'income' : 'expense', category: 'inne' }],
      };
    }

    case 'QUERY_DATA':
    case 'ANALYTICS': {
      return { reply: 'Sprawdzam Twoj stan...', actions: [{ type: 'show_summary', scope: 'general' }] };
    }

    case 'HELP':
      return { reply: getHelpReply(), actions: [] };

    case 'CHITCHAT': {
      const greetingResponses = [
        'Cześć! W czym mogę Ci pomóc?',
        'Hej! Jestem gotów do działania. Co masz na myśli?',
        'Dzień dobry! Jak mogę Ci dziś pomóc?',
        'Siema! Co planujemy zrobić?',
      ];
      const randomResponse = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
      return { reply: randomResponse, actions: [] };
    }

    default: {
      if (!isActionable) {
        return { reply: 'Czesc! Jak moge Ci pomoc? Wpisz "pomoc" zeby zobaczyc co potrafia.', actions: [] };
      }
      return {
        reply: 'Rozumiem intencje, ale potrzebuje wiecej szczegolow. Przykladowe komendy:\n- "dodaj zadanie wyslac maila jutro"\n- "kup mleko, chleb, maslo"\n- "dodaj wydatek 45 zl na kawe"\nLub wpisz "pomoc".',
        actions: [],
      };
    }
  }
}


async function getNotesByUser(userId: string): Promise<NoteRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'notes'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as NoteRecord));
}

async function getTasksByUser(userId: string): Promise<TaskRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as TaskRecord));
}

async function getHabitsByUser(userId: string): Promise<HabitRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'habits'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as HabitRecord));
}

async function getShoppingItemsByUser(userId: string): Promise<ShoppingRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'shoppingItems'), where('addedBy', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as ShoppingRecord));
}

async function getGoalsByUser(userId: string): Promise<GoalRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'goals'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as GoalRecord));
}

async function getCalendarEventsByUser(userId: string): Promise<CalendarEventRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'calendarEvents'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as CalendarEventRecord));
}

async function getPlansByUser(userId: string): Promise<PlanRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'plans'), where('userId', '==', userId), limit(120)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as PlanRecord));
}

async function getBudgetEntriesByUser(userId: string): Promise<BudgetRecord[]> {
  const snapshot = await getDocs(query(collection(db, 'budget'), where('userId', '==', userId), limit(200)));
  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  } as BudgetRecord));
}

function getReferenceScore(reference: string, candidate: string) {
  const normalizedReference = normalizeText(reference);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedReference || !normalizedCandidate) return 0;
  if (normalizedReference === normalizedCandidate) return 100;
  if (normalizedCandidate.startsWith(normalizedReference) || normalizedReference.startsWith(normalizedCandidate)) {
    return 85;
  }
  if (normalizedCandidate.includes(normalizedReference) || normalizedReference.includes(normalizedCandidate)) {
    return 70;
  }

  const referenceTokens = new Set(normalizedReference.split(' ').filter((token) => token.length > 1));
  const candidateTokens = new Set(normalizedCandidate.split(' ').filter((token) => token.length > 1));
  let overlap = 0;

  referenceTokens.forEach((token) => {
    if (candidateTokens.has(token)) overlap += 1;
  });

  return overlap * 15;
}

function findBestMatch<T extends { id: string }>(
  items: T[],
  reference: string,
  getTexts: Array<(item: T) => string | undefined>,
): T | null {
  let bestMatch: T | null = null;
  let bestScore = 0;

  items.forEach((item) => {
    const score = Math.max(
      ...getTexts.map((getText) => getReferenceScore(reference, getText(item) || '')),
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  return bestScore >= 30 ? bestMatch : null;
}

function isWriteAction(action: AssistantAction) {
  return action.type !== 'show_summary';
}

async function executeAction(action: AssistantAction, user: User): Promise<string> {
  switch (action.type) {
    case 'create_note': {
      await addDoc(collection(db, 'notes'), {
        title: action.title || action.content.slice(0, 50),
        content: action.content.slice(0, 10000),
        color: 'yellow',
        tags: action.tags || ['AI'],
        category: action.category || 'general',
        priority: action.priority || 'medium',
        pinned: false,
        userId: user.uid,
        wordCount: action.content.trim().split(/\s+/).filter(Boolean).length,
        charCount: action.content.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return `Dodalem notatke "${action.title || action.content.slice(0, 40)}".`;
    }
    case 'pin_note': {
      const notes = await getNotesByUser(user.uid);
      const note: NoteRecord | null = findBestMatch<NoteRecord>(notes, action.reference, [
        (item) => String(item.title || ''),
        (item) => String(item.content || '').slice(0, 80),
      ]);

      if (!note) return `Nie znalazlem notatki "${action.reference}".`;

      await updateDoc(doc(db, 'notes', note.id), {
        pinned: !Boolean(note.pinned),
        updatedAt: serverTimestamp(),
      });

      return Boolean(note.pinned)
        ? `Odpialem notatke "${note.title || action.reference}".`
        : `Przypialem notatke "${note.title || action.reference}".`;
    }
    case 'delete_note': {
      const notes = await getNotesByUser(user.uid);
      const note: NoteRecord | null = findBestMatch<NoteRecord>(notes, action.reference, [
        (item) => String(item.title || ''),
        (item) => String(item.content || '').slice(0, 80),
      ]);

      if (!note) return `Nie znalazlem notatki "${action.reference}".`;
      await deleteDoc(doc(db, 'notes', note.id));
      return `Usunalem notatke "${note.title || action.reference}".`;
    }
    case 'create_task': {
      const tasks = await getTasksByUser(user.uid);
      const duplicate = tasks.find(
        (task) =>
          normalizeText(String(task.title || '')) === normalizeText(action.title) &&
          !Boolean(task.completed),
      );

      if (duplicate) {
        return `Zadanie "${action.title}" juz istnieje.`;
      }

      await addDoc(collection(db, 'tasks'), {
        title: action.title,
        completed: false,
        priority: action.priority || 'medium',
        category: action.category || 'other',
        dueDate: action.dueDate || null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: ['AI'],
        notes: action.notes || null,
        recurring: false,
      });

      return `Dodalem zadanie "${action.title}".`;
    }
    case 'complete_task':
    case 'reopen_task':
    case 'delete_task': {
      const tasks = await getTasksByUser(user.uid);
      const task: TaskRecord | null = findBestMatch<TaskRecord>(tasks, action.reference, [
        (item) => String(item.title || ''),
      ]);

      if (!task) return `Nie znalazlem zadania "${action.reference}".`;

      if (action.type === 'delete_task') {
        await deleteDoc(doc(db, 'tasks', task.id));
        return `Usunalem zadanie "${task.title}".`;
      }

      const completed = action.type === 'complete_task';
      await updateDoc(doc(db, 'tasks', task.id), {
        completed,
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });

      return completed
        ? `Oznaczylem zadanie "${task.title}" jako zrobione.`
        : `Przywrocilem zadanie "${task.title}" do otwartych.`;
    }
    case 'create_habit': {
      const habits = await getHabitsByUser(user.uid);
      const duplicate = habits.find(
        (habit) => normalizeText(String(habit.name || '')) === normalizeText(action.name),
      );

      if (duplicate) return `Nawyk "${action.name}" juz istnieje.`;

      await addDoc(collection(db, 'habits'), {
        name: action.name,
        emoji: action.emoji || '⚡',
        category: action.category || 'health',
        target: action.target || 21,
        userId: user.uid,
        completions: {},
        streak: 0,
        bestStreak: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return `Dodalem nawyk "${action.name}".`;
    }
    case 'create_shopping_item': {
      const items = await getShoppingItemsByUser(user.uid);
      const duplicate = items.find(
        (item) =>
          normalizeText(String(item.name || '')) === normalizeText(action.name) &&
          !Boolean(item.checked),
      );

      if (duplicate) return `Produkt "${action.name}" juz jest na liscie.`;

      await addDoc(collection(db, 'shoppingItems'), {
        name: action.name,
        checked: false,
        quantity: action.quantity || '1',
        category: action.category || 'inne',
        addedBy: user.uid,
        listId: 'default',
        priority: 'medium',
        recurring: false,
        tags: ['AI'],
        createdAt: serverTimestamp(),
      });

      return `Dodalem do zakupow "${action.name}".`;
    }
    case 'check_shopping_item':
    case 'uncheck_shopping_item': {
      const items = await getShoppingItemsByUser(user.uid);
      const item: ShoppingRecord | null = findBestMatch<ShoppingRecord>(items, action.reference, [
        (entry) => String(entry.name || ''),
      ]);

      if (!item) return `Nie znalazlem produktu "${action.reference}".`;

      const checked = action.type === 'check_shopping_item';
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        checked,
        purchasedAt: checked ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });

      return checked
        ? `Oznaczylem produkt "${item.name}" jako kupiony.`
        : `Przywrocilem produkt "${item.name}" na aktywna liste.`;
    }
    case 'create_goal': {
      const goals = await getGoalsByUser(user.uid);
      const duplicate = goals.find(
        (goal) =>
          normalizeText(String(goal.title || '')) === normalizeText(action.title) &&
          !Boolean(goal.completed),
      );

      if (duplicate) return `Cel "${action.title}" juz istnieje.`;

      const progress = clampProgress(action.progress);
      await addDoc(collection(db, 'goals'), {
        title: action.title,
        description: action.description || undefined,
        category: action.category || 'personal',
        targetDate: action.targetDate || undefined,
        progress,
        completed: progress >= 100,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return `Dodalem cel "${action.title}".`;
    }
    case 'update_goal_progress': {
      const goals = await getGoalsByUser(user.uid);
      const goal: GoalRecord | null = findBestMatch<GoalRecord>(goals, action.reference, [
        (item) => String(item.title || ''),
      ]);

      if (!goal) return `Nie znalazlem celu "${action.reference}".`;

      await updateDoc(doc(db, 'goals', goal.id), {
        progress: action.progress,
        completed: action.progress >= 100,
        updatedAt: serverTimestamp(),
      });

      return `Ustawilem postep celu "${goal.title}" na ${action.progress}%.`;
    }
    case 'create_calendar_event': {
      const date = action.date || format(new Date(), 'yyyy-MM-dd');
      const time = action.allDay ? '' : action.time || '12:00';

      await addDoc(collection(db, 'calendarEvents'), {
        title: action.title,
        time,
        allDay: Boolean(action.allDay),
        category: action.category || 'other',
        description: action.description || undefined,
        location: action.location || undefined,
        date,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return Boolean(action.allDay)
        ? `Dodalem calodniowe wydarzenie "${action.title}" na ${date}.`
        : `Dodalem wydarzenie "${action.title}" na ${date} ${time}.`;
    }
    case 'create_plan_item': {
      await addDoc(collection(db, 'plans'), {
        time: action.time || '09:00',
        activity: action.activity,
        userId: user.uid,
        date: action.date || format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
        done: false,
      });

      return `Dodalem punkt planu "${action.activity}" o ${action.time || '09:00'}.`;
    }
    case 'create_budget_entry': {
      await addDoc(collection(db, 'budget'), {
        description: action.description,
        amount: action.amount,
        type: action.entryType,
        userId: user.uid,
        category: action.category || 'inne',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return action.entryType === 'income'
        ? `Dodalem przychod "${action.description}" na ${action.amount.toFixed(2)} PLN.`
        : `Dodalem wydatek "${action.description}" na ${action.amount.toFixed(2)} PLN.`;
    }
    case 'show_summary': {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [tasks, notes, habits, shoppingItems, goals, events, plans, budgetEntries] = await Promise.all([
        getTasksByUser(user.uid),
        getNotesByUser(user.uid),
        getHabitsByUser(user.uid),
        getShoppingItemsByUser(user.uid),
        getGoalsByUser(user.uid),
        getCalendarEventsByUser(user.uid),
        getPlansByUser(user.uid),
        getBudgetEntriesByUser(user.uid),
      ]);

      const openTasks = tasks.filter((task) => !Boolean(task.completed));
      const todayEvents = events.filter((event) => String(event.date || '') === today);
      const todayPlans = plans.filter((plan) => String(plan.date || '') === today);
      const uncheckedShopping = shoppingItems.filter((item) => !Boolean(item.checked));
      const activeGoals = goals.filter((goal) => !Boolean(goal.completed));
      const balance = budgetEntries.reduce((sum, entry) => {
        const amount = Number(entry.amount || 0);
        return entry.type === 'income' ? sum + amount : sum - amount;
      }, 0);
      const tips = [
        'Skup się na 3 najważniejszych zadaniach — reszta poczeka.',
        'Małe kroki, duże wyniki. Zacznij od tego co możesz zrobić teraz.',
        'Każde ukończone zadanie to dowód Twojej skuteczności.',
        'Produktywność to nie robienie wszystkiego — to robienie właściwych rzeczy.',
        'Zacznij. Motywacja przychodzi po działaniu, nie przed nim.',
        'Jeden krok do przodu każdego dnia — po roku jesteś daleko.',
      ];
      const insight = tips[Math.floor(Math.random() * tips.length)];

      return `Podsumowanie:
Otwarte zadania: ${openTasks.length}
Notatki: ${notes.length}
Nawyki: ${habits.length}
Zakupy do kupienia: ${uncheckedShopping.length}
Cele w toku: ${activeGoals.length}
Wydarzenia dzisiaj: ${todayEvents.length}
Punkty planu na dzis: ${todayPlans.length}
Bilans: ${balance.toFixed(2)} PLN

Wskazowka AI:
${insight}`;
    }
  }
}

export async function runAssistantCommand(
  command: string,
  user: User,
  options?: { isOffline?: boolean; history?: ConversationTurn[] },
): Promise<AssistantResult> {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return {
      reply: 'Napisz polecenie, a zajmę się resztą.',
      performedActions: [],
      usedAdvancedPlanning: false,
    };
  }

  const history = options?.history ?? [];

  // Pobierz kontekst użytkownika z pamięci
  const userContext = conversationMemory.getContext(user.uid);
  const contextSummary = conversationMemory.getContextSummary(user.uid);

  // Resolve anaphora and follow-up references using conversation history
  const ctx = contextualize(trimmedCommand, history);
  const processedCommand = ctx.isFollowUp && ctx.resolvedText !== trimmedCommand
    ? ctx.resolvedText
    : trimmedCommand;

  // Ucz się z wiadomości użytkownika
  patternLearner.learnFromMessage(user.uid, processedCommand, ctx.topicChain);

  // Klasyfikuj intencję
  const intent = classifyIntent(processedCommand);
  const entities = extractEntities(processedCommand);

  const plan = fallbackPlan(processedCommand);

  if (options?.isOffline && plan.actions.some(isWriteAction)) {
    return {
      reply: 'Tryb offline blokuje zmiany w danych. Mogę pokazać pomoc albo podsumowanie gdy wrócisz online.',
      performedActions: [],
      usedAdvancedPlanning: false,
    };
  }

  if (plan.actions.length === 0) {
    return {
      reply: plan.reply || getHelpReply(),
      performedActions: [],
      usedAdvancedPlanning: false,
    };
  }

  const performedActions: string[] = [];
  const actionSummaryItems: { type: string; name: string }[] = [];

  for (const action of plan.actions) {
    try {
      const message = await executeAction(action, user);
      performedActions.push(message);
      
      // Ucz się z wykonanych akcji
      const category = 'category' in action ? action.category : undefined;
      patternLearner.learnFromAction(user.uid, action.type, category);
      
      if (action.type !== 'show_summary') {
        const entityName =
          'title' in action ? action.title :
          'name' in action ? action.name :
          'activity' in action ? action.activity :
          'description' in action ? action.description :
          action.type;
        const entityType = action.type.replace('create_', '').replace('_item', '').replace('_entry', '').replace('calendar_event', 'event');
        actionSummaryItems.push({ type: entityType, name: entityName as string });
      }
    } catch (error) {
      performedActions.push(buildErrorResponse(error));
    }
  }

  // Zapisz interakcję w pamięci
  conversationMemory.learnFromInteraction(
    user.uid,
    ctx.topicChain[0] || 'general',
    entities.names,
    ctx.sentimentShift,
    actionSummaryItems.length > 0 ? 8 : 5
  );

  const aiReply = plan.reply?.trim() ?? '';
  const isGenericReply = !aiReply || aiReply.includes('zajmuje') || aiReply.includes('Dodaje');
  const finalReply = actionSummaryItems.length > 1 && isGenericReply
    ? buildMultiActionSummary(actionSummaryItems)
    : [aiReply, ...performedActions.filter(() => actionSummaryItems.length <= 1)].filter(Boolean).join('\n');

  return {
    reply: finalReply || aiReply || performedActions.join('\n'),
    performedActions,
    usedAdvancedPlanning: false,
  };
}
