/**
 * Pattern Learner — uczy się wzorców z interakcji użytkownika
 * Rozpoznaje powtarzające się zadania, preferencje i konteksty
 */

export interface LearnedPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  context: string[];
  confidence: number;
}

export interface UserBehavior {
  commonPhrases: Map<string, number>;
  taskPatterns: Map<string, LearnedPattern>;
  timePreferences: Map<string, number>; // godzina -> częstotliwość
  categoryPreferences: Map<string, number>;
}

class PatternLearningEngine {
  private behaviors: Map<string, UserBehavior> = new Map();
  private readonly MIN_FREQUENCY_THRESHOLD = 3;
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  private initBehavior(userId: string): UserBehavior {
    if (!this.behaviors.has(userId)) {
      this.behaviors.set(userId, {
        commonPhrases: new Map(),
        taskPatterns: new Map(),
        timePreferences: new Map(),
        categoryPreferences: new Map(),
      });
    }
    return this.behaviors.get(userId)!;
  }

  learnFromMessage(userId: string, message: string, context: string[]): void {
    const behavior = this.initBehavior(userId);

    // Ucz się fraz
    const phrases = this.extractPhrases(message);
    phrases.forEach(phrase => {
      const count = behavior.commonPhrases.get(phrase) || 0;
      behavior.commonPhrases.set(phrase, count + 1);
    });

    // Ucz się wzorców zadań
    const taskPattern = this.extractTaskPattern(message);
    if (taskPattern) {
      const existing = behavior.taskPatterns.get(taskPattern);
      if (existing) {
        existing.frequency++;
        existing.lastSeen = new Date();
        existing.confidence = Math.min(1, existing.frequency / 10);
      } else {
        behavior.taskPatterns.set(taskPattern, {
          pattern: taskPattern,
          frequency: 1,
          lastSeen: new Date(),
          context,
          confidence: 0.1,
        });
      }
    }

    // Ucz się preferencji czasowych
    const hour = new Date().getHours().toString();
    behavior.timePreferences.set(hour, (behavior.timePreferences.get(hour) || 0) + 1);
  }

  learnFromAction(userId: string, actionType: string, category?: string): void {
    const behavior = this.initBehavior(userId);

    if (category) {
      behavior.categoryPreferences.set(
        category,
        (behavior.categoryPreferences.get(category) || 0) + 1
      );
    }
  }

  private extractPhrases(text: string): string[] {
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    const phrases: string[] = [];

    // Unigramy (pojedyncze słowa)
    phrases.push(...words.filter(w => w.length > 3));

    // Bigramy (pary słów)
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
      }
    }

    // Trigramy (trójki słów)
    for (let i = 0; i < words.length - 2; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2 && words[i + 2].length > 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    return phrases;
  }

  private extractTaskPattern(text: string): string | null {
    const normalized = text.toLowerCase();

    // Wzorce czasowe
    if (/jutro|dzisiaj|pojutrze|za \d+ dni/.test(normalized)) {
      return 'time_based_task';
    }

    // Wzorce zakupowe
    if (/kup|zakup|lista|sklep/.test(normalized)) {
      return 'shopping_task';
    }

    // Wzorce spotkań
    if (/spotkanie|wizyta|termin|kalendarz/.test(normalized)) {
      return 'meeting_task';
    }

    // Wzorce finansowe
    if (/wydatek|przychód|budżet|zapłac/.test(normalized)) {
      return 'finance_task';
    }

    return null;
  }

  getCommonPhrases(userId: string, minFrequency: number = 3): string[] {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return [];

    return Array.from(behavior.commonPhrases.entries())
      .filter(([_, freq]) => freq >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([phrase]) => phrase)
      .slice(0, 20);
  }

  getLearnedPatterns(userId: string): LearnedPattern[] {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return [];

    return Array.from(behavior.taskPatterns.values())
      .filter(p => p.frequency >= this.MIN_FREQUENCY_THRESHOLD)
      .filter(p => p.confidence >= this.CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.frequency - a.frequency);
  }

  getPreferredCategories(userId: string, limit: number = 5): string[] {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return [];

    return Array.from(behavior.categoryPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cat]) => cat);
  }

  getPreferredTimeSlots(userId: string): string[] {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return [];

    return Array.from(behavior.timePreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  getSuggestions(userId: string, currentContext: string): string[] {
    const behavior = this.behaviors.get(userId);
    if (!behavior) return [];

    const suggestions: string[] = [];
    const patterns = this.getLearnedPatterns(userId);

    // Sugeruj na podstawie wzorców
    patterns.forEach(pattern => {
      if (pattern.context.some(ctx => currentContext.includes(ctx))) {
        suggestions.push(`Może chcesz: ${pattern.pattern}?`);
      }
    });

    // Sugeruj popularne kategorie
    const topCategories = this.getPreferredCategories(userId, 3);
    if (topCategories.length > 0) {
      suggestions.push(`Często używasz kategorii: ${topCategories.join(', ')}`);
    }

    return suggestions.slice(0, 5);
  }

  clear(userId: string): void {
    this.behaviors.delete(userId);
  }
}

export const patternLearner = new PatternLearningEngine();
