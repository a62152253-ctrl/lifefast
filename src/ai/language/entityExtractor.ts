/**
 * Entity extractor — pulls structured data (dates, times, amounts, names, categories)
 * out of raw Polish text so the assistant can act without asking for clarification.
 */

export interface ExtractedEntities {
  dates: DateEntity[];
  times: TimeEntity[];
  amounts: AmountEntity[];
  names: string[];
  categories: string[];
  priorities: string[];
  durations: DurationEntity[];
}

export interface DateEntity {
  raw: string;
  resolved: Date;
  relative: boolean;
}

export interface TimeEntity {
  raw: string;
  hours: number;
  minutes: number;
}

export interface AmountEntity {
  raw: string;
  value: number;
  currency?: string;
}

export interface DurationEntity {
  raw: string;
  minutes: number;
}

// ─── Date resolution ─────────────────────────────────────────────────────────

const RELATIVE_DATE_MAP: Record<string, () => Date> = {
  dzisiaj: () => today(),
  dziś: () => today(),
  jutro: () => addDays(today(), 1),
  pojutrze: () => addDays(today(), 2),
  wczoraj: () => addDays(today(), -1),
  'za tydzień': () => addDays(today(), 7),
  'w przyszłym tygodniu': () => addDays(today(), 7),
  'za miesiąc': () => addDays(today(), 30),
  'za dwa dni': () => addDays(today(), 2),
  'za trzy dni': () => addDays(today(), 3),
  'za 2 dni': () => addDays(today(), 2),
  'za 3 dni': () => addDays(today(), 3),
  'za 5 dni': () => addDays(today(), 5),
  'za 7 dni': () => addDays(today(), 7),
  'za 10 dni': () => addDays(today(), 10),
  'za 14 dni': () => addDays(today(), 14),
  'za dwa tygodnie': () => addDays(today(), 14),
  'za trzy tygodnie': () => addDays(today(), 21),
  'za dwa miesiące': () => addDays(today(), 60),
  'za rok': () => addDays(today(), 365),
  'następny tydzień': () => addDays(today(), 7),
  'następny miesiąc': () => addDays(today(), 30),
  'przyszły tydzień': () => addDays(today(), 7),
  'przyszły miesiąc': () => addDays(today(), 30),
  'w przyszłym miesiącu': () => addDays(today(), 30),
  'w przyszłym roku': () => addDays(today(), 365),
  'przedwczoraj': () => addDays(today(), -2),
  'dwa dni temu': () => addDays(today(), -2),
  'tydzień temu': () => addDays(today(), -7),
  'miesiąc temu': () => addDays(today(), -30),
  'dziś wieczorem': () => today(),
  'dziś rano': () => today(),
  'jutro rano': () => addDays(today(), 1),
  'jutro wieczorem': () => addDays(today(), 1),
};

const WEEKDAY_MAP: Record<string, number> = {
  poniedziałek: 1, poniedzialek: 1,
  wtorek: 2,
  środa: 3, sroda: 3,
  czwartek: 4,
  piątek: 5, piatek: 5,
  sobota: 6,
  niedziela: 0,
};

const MONTH_MAP: Record<string, number> = {
  stycznia: 0, styczeń: 0, styczen: 0,
  lutego: 1, luty: 1,
  marca: 2, marzec: 2,
  kwietnia: 3, kwiecień: 3, kwiecien: 3,
  maja: 4, maj: 4,
  czerwca: 5, czerwiec: 5,
  lipca: 6, lipiec: 6,
  sierpnia: 7, sierpień: 7, sierpien: 7,
  września: 8, wrzesień: 8, wrzesien: 8,
  października: 9, październik: 9, pazdziernik: 9,
  listopada: 10, listopad: 10,
  grudnia: 11, grudzień: 11, grudzien: 11,
};

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function nextWeekday(target: number): Date {
  const d = today();
  const current = d.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  return addDays(d, diff);
}

function extractDates(text: string): DateEntity[] {
  const lower = text.toLowerCase();
  const results: DateEntity[] = [];

  // Relative expressions (longest first to prefer "za tydzień" over "za")
  const relativeKeys = Object.keys(RELATIVE_DATE_MAP).sort((a, b) => b.length - a.length);
  for (const key of relativeKeys) {
    if (lower.includes(key)) {
      results.push({ raw: key, resolved: RELATIVE_DATE_MAP[key](), relative: true });
      break; // only one date per expression
    }
  }

  // Weekday names: "w piątek", "na wtorek", "we środę"
  if (results.length === 0) {
    for (const [name, day] of Object.entries(WEEKDAY_MAP)) {
      const regex = new RegExp(`\\b(w|we|na|o|przez)\\s+${name}\\b`, 'i');
      if (regex.test(lower)) {
        results.push({ raw: name, resolved: nextWeekday(day), relative: true });
        break;
      }
    }
  }

  // Numeric date: "12 maja", "5 marca 2026"
  const numericDateRegex = /\b(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{4}))?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = numericDateRegex.exec(lower)) !== null) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    const month = MONTH_MAP[monthName];
    if (month !== undefined && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      results.push({ raw: match[0], resolved: d, relative: false });
    }
  }

  // ISO-like: "2026-05-20", "20.05.2026"
  const isoRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((match = isoRegex.exec(lower)) !== null) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    results.push({ raw: match[0], resolved: d, relative: false });
  }

  const dotRegex = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g;
  while ((match = dotRegex.exec(lower)) !== null) {
    const d = new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
    results.push({ raw: match[0], resolved: d, relative: false });
  }

  return results;
}

// ─── Time extraction ─────────────────────────────────────────────────────────

function extractTimes(text: string): TimeEntity[] {
  const results: TimeEntity[] = [];
  const lower = text.toLowerCase();

  // "o 14:30", "o 9:00", "godzina 15"
  const timeRegex = /\b(?:o|godzina|godz\.?)\s+(\d{1,2})(?::(\d{2}))?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = timeRegex.exec(lower)) !== null) {
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      results.push({ raw: match[0], hours, minutes });
    }
  }

  // Standalone "14:30"
  const standaloneRegex = /\b(\d{1,2}):(\d{2})\b/g;
  while ((match = standaloneRegex.exec(lower)) !== null) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      results.push({ raw: match[0], hours, minutes });
    }
  }

  return results;
}

// ─── Amount extraction ────────────────────────────────────────────────────────

function extractAmounts(text: string): AmountEntity[] {
  const results: AmountEntity[] = [];
  const lower = text.toLowerCase();

  // "100 zł", "50.00 PLN", "200 złotych", "1500pln"
  const amountRegex = /(\d+(?:[.,]\d+)?)\s*(zł|pln|złotych|euro|eur|dolar|dolarów|\$|€)/gi;
  let match: RegExpExecArray | null;
  while ((match = amountRegex.exec(lower)) !== null) {
    const value = parseFloat(match[1].replace(',', '.'));
    const currencyRaw = match[2].toLowerCase();
    const currency = currencyRaw.startsWith('zł') || currencyRaw === 'złotych' ? 'PLN' : currencyRaw.toUpperCase();
    results.push({ raw: match[0], value, currency });
  }

  // Bare numbers near financial keywords
  const financeKeywords = /(?:kosztuje|kosztowało|zapłaciłem|zapłaciłam|wydałem|wydałam|cena|wartość)\s+(\d+(?:[.,]\d+)?)/gi;
  while ((match = financeKeywords.exec(lower)) !== null) {
    const value = parseFloat(match[1].replace(',', '.'));
    results.push({ raw: match[1], value, currency: 'PLN' });
  }

  return results;
}

// ─── Duration extraction ──────────────────────────────────────────────────────

function extractDurations(text: string): DurationEntity[] {
  const results: DurationEntity[] = [];
  const lower = text.toLowerCase();

  const patterns: [RegExp, (m: RegExpExecArray) => number][] = [
    [/(\d+)\s*(?:godzin[ay]?|godz\.?)/gi, (m) => parseInt(m[1], 10) * 60],
    [/(\d+)\s*(?:minut[ay]?|min\.?)/gi, (m) => parseInt(m[1], 10)],
    [/(\d+)\s*(?:dni|dzień|dnia)/gi, (m) => parseInt(m[1], 10) * 60 * 24],
  ];

  for (const [regex, calc] of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lower)) !== null) {
      results.push({ raw: match[0], minutes: calc(match) });
    }
  }

  return results;
}

// ─── Priority extraction ──────────────────────────────────────────────────────

function extractPriorities(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  if (/\b(pilne|pilny|natychmiast|asap|urgent|super\s*ważne)\b/.test(lower)) found.push('urgent');
  else if (/\b(wysoki\s*priorytet|ważne|ważny|high\s*priority)\b/.test(lower)) found.push('high');
  else if (/\b(normalny|średni\s*priorytet|medium)\b/.test(lower)) found.push('medium');
  else if (/\b(niski\s*priorytet|niskie|low|kiedyś|w\s*wolnej\s*chwili)\b/.test(lower)) found.push('low');

  return found;
}

// ─── Category extraction ──────────────────────────────────────────────────────

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/\b(praca|zawodowe|służbowe|office|biznes|projekt|deadline|sprint)\b/i, 'work'],
  [/\b(dom|domowe|household|sprzątanie|remont|naprawa|meble)\b/i, 'home'],
  [/\b(zdrowie|medyczne|lekarz|sport|trening|ćwiczenia|fitness|siłownia|joga)\b/i, 'health'],
  [/\b(zakupy|shopping|sklep|supermarket|lista|produkty)\b/i, 'shopping'],
  [/\b(finanse|budżet|pieniądze|wydatki|przychód|rachunek|karta)\b/i, 'finance'],
  [/\b(edukacja|nauka|szkoła|kurs|szkolenie|książka|certyfikat|egzamin)\b/i, 'education'],
  [/\b(rodzina|dzieci|personal|osobiste|partner|małżonek|rodzice)\b/i, 'personal'],
  [/\b(hobby|rozrywka|rozrywki|film|gra|sport|muzyka|czytanie)\b/i, 'leisure'],
  [/\b(podróż|wakacje|turystyka|hotel|lot|bilet|mapa)\b/i, 'travel'],
  [/\b(gotowanie|jedzenie|przepis|kolacja|obiad|śniadanie)\b/i, 'cooking'],
  [/\b(spotkanie|konferencja|prezentacja|webinar|rozmowa|call)\b/i, 'meeting'],
  [/\b(zaktualizuj|zmień|edytuj|usuń|archiwizuj|duplikuj)\b/i, 'maintenance'],
];

function extractCategories(text: string): string[] {
  const found: string[] = [];
  for (const [regex, cat] of CATEGORY_PATTERNS) {
    if (regex.test(text)) found.push(cat);
  }
  return [...new Set(found)];
}

// ─── Name extraction ─────────────────────────────────────────────────────────

function extractNames(text: string): string[] {
  // Quoted strings are most likely entity names/titles
  const quoted = [...text.matchAll(/"([^"]+)"|'([^']+)'|„([^"]+)"/g)].map(
    (m) => m[1] ?? m[2] ?? m[3],
  );
  return quoted.filter(Boolean);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function extractEntities(text: string): ExtractedEntities {
  return {
    dates: extractDates(text),
    times: extractTimes(text),
    amounts: extractAmounts(text),
    names: extractNames(text),
    categories: extractCategories(text),
    priorities: extractPriorities(text),
    durations: extractDurations(text),
  };
}

export function hasDate(text: string): boolean {
  return extractDates(text).length > 0;
}

export function getFirstDate(text: string): Date | null {
  const dates = extractDates(text);
  return dates.length > 0 ? dates[0].resolved : null;
}

export function getFirstAmount(text: string): number | null {
  const amounts = extractAmounts(text);
  return amounts.length > 0 ? amounts[0].value : null;
}
