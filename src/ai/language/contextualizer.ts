/**
 * Contextualizer — analyses multi-turn conversation history to resolve
 * references like "to", "tamto", "je", "to zadanie" that refer to previous messages.
 */

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ResolvedContext {
  resolvedText: string;
  references: ResolvedReference[];
  topicChain: string[];
  sentimentShift: 'positive' | 'negative' | 'neutral';
  isFollowUp: boolean;
}

export interface ResolvedReference {
  original: string;
  resolved: string;
  type: 'entity' | 'action' | 'time';
}

// Polish anaphora pronouns and deictic expressions
const ANAPHORA_PATTERNS: [RegExp, string][] = [
  [/\bto\b/gi, 'DEICTIC'],
  [/\btamto\b/gi, 'DEICTIC'],
  [/\bje\b/gi, 'PRONOUN_OBJ'],
  [/\bją\b/gi, 'PRONOUN_OBJ_F'],
  [/\bgo\b/gi, 'PRONOUN_OBJ_M'],
  [/\bje\b/gi, 'PRONOUN_OBJ_N'],
  [/\bnim\b/gi, 'PRONOUN_INST'],
  [/\bnim\b/gi, 'PRONOUN_LOC'],
  [/\bto samo\b/gi, 'IDENTITY'],
  [/\bpoprzedni[ae]?\b/gi, 'PREV_REF'],
  [/\bwcześniej wspomnian[ae]\b/gi, 'PREV_MENTION'],
  [/\bten sam\b/gi, 'IDENTITY'],
  [/\bta sama\b/gi, 'IDENTITY'],
  [/\bte same\b/gi, 'IDENTITY'],
];

// Follow-up indicators — user is continuing on the same topic
const FOLLOW_UP_SIGNALS = [
  'a co z', 'co z tym', 'i jeszcze', 'a też', 'a poza tym',
  'też', 'również', 'i to', 'a to', 'zmień to', 'usuń to',
  'ten', 'ta', 'te', 'tamten', 'tamta',
  'do tego', 'z tym', 'o tym', 'w tym',
];

// Sentiment words for detecting frustration / satisfaction
const POSITIVE_SENTIMENT = [
  'super', 'świetnie', 'dziękuję', 'dzięki', 'ok', 'okej', 'fajnie',
  'perfect', 'dokładnie', 'tak', 'zgadza się', 'dobrze', 'brawo',
];

const NEGATIVE_SENTIMENT = [
  'nie', 'źle', 'błąd', 'problem', 'nie działa', 'nie chcę', 'usuń',
  'cofnij', 'anuluj', 'zły', 'niedobrze', 'popraw', 'to nie to',
];

// ─── Topic extraction ─────────────────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  task: ['zadanie', 'zadania', 'task', 'todo', 'zrobic', 'wykonać'],
  note: ['notatka', 'notatki', 'note', 'zanotuj'],
  shopping: ['zakupy', 'kup', 'lista', 'sklep', 'produkt'],
  event: ['wydarzenie', 'spotkanie', 'termin', 'kalendarz', 'wizyta'],
  budget: ['budżet', 'pieniądze', 'wydatek', 'przychód', 'finanse', 'zł'],
  goal: ['cel', 'cele', 'osiągnąć', 'planuję'],
  health: ['zdrowie', 'trening', 'ćwiczenie', 'sport', 'dieta'],
};

function extractTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(topic);
    }
  }
  return found;
}

// ─── Entity recall from history ───────────────────────────────────────────────

function recallLastMentionedEntity(history: ConversationTurn[]): string | null {
  // Walk backwards through user messages looking for entity names in quotes
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role !== 'user') continue;
    const quoted = [...turn.text.matchAll(/"([^"]+)"|'([^']+)'|„([^"]+)"/g)];
    if (quoted.length > 0) {
      return quoted[0][1] ?? quoted[0][2] ?? quoted[0][3] ?? null;
    }
  }
  return null;
}

function recallLastTopic(history: ConversationTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const topics = extractTopics(history[i].text);
    if (topics.length > 0) return topics[0];
  }
  return null;
}

// ─── Anaphora resolution ─────────────────────────────────────────────────────

function resolveAnaphora(text: string, history: ConversationTurn[]): ResolvedReference[] {
  const refs: ResolvedReference[] = [];
  const lastEntity = recallLastMentionedEntity(history);

  for (const [pattern, type] of ANAPHORA_PATTERNS) {
    if (pattern.test(text)) {
      if (lastEntity && (type === 'DEICTIC' || type.startsWith('PRONOUN'))) {
        refs.push({ original: pattern.source, resolved: lastEntity, type: 'entity' });
      }
    }
  }

  return refs;
}

// ─── Sentiment analysis ───────────────────────────────────────────────────────

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const posScore = POSITIVE_SENTIMENT.filter((w) => lower.includes(w)).length;
  const negScore = NEGATIVE_SENTIMENT.filter((w) => lower.includes(w)).length;
  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

// ─── Follow-up detection ──────────────────────────────────────────────────────

function detectFollowUp(text: string, history: ConversationTurn[]): boolean {
  if (history.length === 0) return false;
  const lower = text.toLowerCase();

  // Short messages are usually follow-ups
  if (text.trim().split(' ').length <= 4) return true;

  return FOLLOW_UP_SIGNALS.some((signal) => lower.includes(signal));
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function contextualize(currentMessage: string, history: ConversationTurn[]): ResolvedContext {
  const references = resolveAnaphora(currentMessage, history);
  const topicChain: string[] = [];

  // Build topic chain from last 5 turns
  const recentHistory = history.slice(-5);
  for (const turn of recentHistory) {
    const topics = extractTopics(turn.text);
    topicChain.push(...topics.filter((t) => !topicChain.includes(t)));
  }
  topicChain.push(...extractTopics(currentMessage).filter((t) => !topicChain.includes(t)));

  // Replace anaphoric references in text
  let resolvedText = currentMessage;
  for (const ref of references) {
    resolvedText = resolvedText.replace(new RegExp(`\\b${ref.original}\\b`, 'gi'), ref.resolved);
  }

  return {
    resolvedText,
    references,
    topicChain,
    sentimentShift: detectSentiment(currentMessage),
    isFollowUp: detectFollowUp(currentMessage, history),
  };
}

export function getConversationSummary(history: ConversationTurn[]): string {
  if (history.length === 0) return 'Nowa rozmowa.';

  const topics = new Set<string>();
  for (const turn of history.slice(-10)) {
    extractTopics(turn.text).forEach((t) => topics.add(t));
  }

  const topicLabels: Record<string, string> = {
    task: 'zadania',
    note: 'notatki',
    shopping: 'zakupy',
    event: 'kalendarz',
    budget: 'budżet',
    goal: 'cele',
    health: 'zdrowie',
  };

  const topicList = [...topics].map((t) => topicLabels[t] ?? t).join(', ');
  const lastUserMessage = [...history].reverse().find((t) => t.role === 'user')?.text ?? '';
  const lastTopic = recallLastTopic(history);

  return [
    `Tematy w rozmowie: ${topicList || 'ogólne'}`,
    lastTopic ? `Ostatni temat: ${topicLabels[lastTopic] ?? lastTopic}` : '',
    `Ostatnia wiadomość użytkownika: "${lastUserMessage.slice(0, 80)}${lastUserMessage.length > 80 ? '…' : ''}"`,
  ]
    .filter(Boolean)
    .join('\n');
}
