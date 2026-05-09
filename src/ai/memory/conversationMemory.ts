/**
 * Conversation Memory — długoterminowa pamięć rozmów AI
 * Przechowuje kontekst, preferencje użytkownika i historię interakcji
 */

export interface UserPreferences {
  preferredCategories: string[];
  commonTasks: string[];
  workingHours?: { start: string; end: string };
  favoriteTopics: string[];
  communicationStyle: 'formal' | 'casual' | 'mixed';
}

export interface ConversationContext {
  userId: string;
  recentTopics: string[];
  activeProjects: string[];
  pendingActions: string[];
  userPreferences: UserPreferences;
  conversationCount: number;
  lastInteraction: Date;
}

export interface MemoryEntry {
  timestamp: Date;
  topic: string;
  entities: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: number; // 0-10
}

class ConversationMemoryManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private memories: Map<string, MemoryEntry[]> = new Map();
  private readonly MAX_MEMORIES = 100;
  private readonly MAX_RECENT_TOPICS = 10;

  getContext(userId: string): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        recentTopics: [],
        activeProjects: [],
        pendingActions: [],
        userPreferences: {
          preferredCategories: [],
          commonTasks: [],
          favoriteTopics: [],
          communicationStyle: 'casual',
        },
        conversationCount: 0,
        lastInteraction: new Date(),
      });
    }
    return this.contexts.get(userId)!;
  }

  updateContext(userId: string, updates: Partial<ConversationContext>): void {
    const context = this.getContext(userId);
    Object.assign(context, updates, { lastInteraction: new Date() });
    this.contexts.set(userId, context);
  }

  addMemory(userId: string, entry: MemoryEntry): void {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }

    const userMemories = this.memories.get(userId)!;
    userMemories.unshift(entry);

    // Zachowaj tylko najważniejsze wspomnienia
    if (userMemories.length > this.MAX_MEMORIES) {
      userMemories.sort((a, b) => b.importance - a.importance);
      this.memories.set(userId, userMemories.slice(0, this.MAX_MEMORIES));
    }
  }

  getRecentMemories(userId: string, count: number = 10): MemoryEntry[] {
    return this.memories.get(userId)?.slice(0, count) || [];
  }

  getMemoriesByTopic(userId: string, topic: string): MemoryEntry[] {
    return this.memories.get(userId)?.filter(m => m.topic === topic) || [];
  }

  addRecentTopic(userId: string, topic: string): void {
    const context = this.getContext(userId);
    if (!context.recentTopics.includes(topic)) {
      context.recentTopics.unshift(topic);
      if (context.recentTopics.length > this.MAX_RECENT_TOPICS) {
        context.recentTopics = context.recentTopics.slice(0, this.MAX_RECENT_TOPICS);
      }
      this.updateContext(userId, { recentTopics: context.recentTopics });
    }
  }

  learnFromInteraction(
    userId: string,
    topic: string,
    entities: string[],
    sentiment: 'positive' | 'negative' | 'neutral',
    importance: number
  ): void {
    this.addMemory(userId, {
      timestamp: new Date(),
      topic,
      entities,
      sentiment,
      importance,
    });

    this.addRecentTopic(userId, topic);

    const context = this.getContext(userId);
    context.conversationCount++;
    this.updateContext(userId, { conversationCount: context.conversationCount });
  }

  getContextSummary(userId: string): string {
    const context = this.getContext(userId);
    const recentMemories = this.getRecentMemories(userId, 5);

    const parts: string[] = [];

    if (context.recentTopics.length > 0) {
      parts.push(`Ostatnie tematy: ${context.recentTopics.slice(0, 3).join(', ')}`);
    }

    if (context.activeProjects.length > 0) {
      parts.push(`Aktywne projekty: ${context.activeProjects.join(', ')}`);
    }

    if (recentMemories.length > 0) {
      const topicCounts = new Map<string, number>();
      recentMemories.forEach(m => {
        topicCounts.set(m.topic, (topicCounts.get(m.topic) || 0) + 1);
      });
      const topTopic = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topTopic) {
        parts.push(`Najczęstszy temat: ${topTopic[0]}`);
      }
    }

    if (context.userPreferences.preferredCategories.length > 0) {
      parts.push(`Preferowane kategorie: ${context.userPreferences.preferredCategories.slice(0, 3).join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'Nowa rozmowa';
  }

  updatePreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const context = this.getContext(userId);
    context.userPreferences = { ...context.userPreferences, ...preferences };
    this.updateContext(userId, { userPreferences: context.userPreferences });
  }

  clear(userId: string): void {
    this.contexts.delete(userId);
    this.memories.delete(userId);
  }
}

export const conversationMemory = new ConversationMemoryManager();
