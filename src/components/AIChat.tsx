import { useEffect, useRef, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Button, IconButton } from './CommonUI';
import { Send, Bot, User, Sparkles, X, Minus, Plus, Wand2, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ASSISTANT_PROMPTS, runAssistantCommand, type ConversationTurn } from '../services/assistantService';
import { useToast } from '../context/ToastContext';
import { useOffline } from '../context/OfflineContext';
import { patternLearner } from '../ai/learning/patternLearner';
import { conversationMemory } from '../ai/memory/conversationMemory';

interface SuggestedAction {
  id: string;
  type: string;
  description: string;
  data: any;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'command' | 'response';
  suggestedActions?: SuggestedAction[];
}

export default function AIChat() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastModeLabel, setLastModeLabel] = useState<'standard' | 'advanced'>('standard');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [learnedPhrases, setLearnedPhrases] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const { isOffline } = useOffline();

  // Załaduj nauczone frazy przy otwarciu
  useEffect(() => {
    if (user && isOpen) {
      const phrases = patternLearner.getCommonPhrases(user.uid, 2);
      setLearnedPhrases(phrases.slice(0, 5));
      
      const suggestions = patternLearner.getSuggestions(user.uid, inputMessage);
      setSmartSuggestions(suggestions);
    }
  }, [user, isOpen, inputMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendAiMessage = (content: string) => {
    const aiMessage: ChatMessage = {
      id: `${Date.now()}-ai`,
      content,
      sender: 'ai',
      timestamp: new Date(),
      type: 'response',
    };

    setMessages((prev) => [...prev, aiMessage]);
  };

  const sendMessage = async (presetMessage?: string) => {
    const trimmedMessage = (presetMessage ?? inputMessage).trim();

    if (!trimmedMessage || !user || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      content: trimmedMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'command',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const result = await runAssistantCommand(trimmedMessage, user, { isOffline, history });
      setLastModeLabel(result.usedAdvancedPlanning ? 'advanced' : 'standard');

      // Update conversation history for next turn (keep last 20 turns to stay within context)
      setHistory(prev => [
        ...prev.slice(-19),
        { role: 'user', text: trimmedMessage },
        { role: 'model', text: result.reply },
      ]);

      appendAiMessage(result.reply);

      if (result.performedActions.length > 0) {
        showToast({
          type: 'success',
          message: `AI wykonalo ${result.performedActions.length} akcji.`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appendAiMessage(`Nie udalo sie obsluzyc polecenia. ${errorMessage}`);
      showToast({ type: 'error', message: 'AI nie moglo wykonac tej operacji.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt);
    void sendMessage(prompt);
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-[#ef6351] to-[#f5a65b] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 flex h-[560px] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_32px_90px_rgba(18,20,23,0.22)]"
    >
      <div className="flex items-center justify-between border-b border-white/20 bg-[linear-gradient(135deg,#1d1d1f,#2f4858_60%,#ef6351)] px-4 py-4 text-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold tracking-tight">LifeFast Operator</span>
            <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
            <span className="rounded-full bg-white/10 px-2 py-1">tasks</span>
            <span className="rounded-full bg-white/10 px-2 py-1">notes</span>
            <span className="rounded-full bg-white/10 px-2 py-1">shopping</span>
            <span className="rounded-full bg-white/10 px-2 py-1">calendar</span>
            <span className="rounded-full bg-white/10 px-2 py-1">
              {lastModeLabel === 'advanced' ? 'AI planowanie' : 'tryb szybki'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => setIsMinimized((value) => !value)}
            className="text-white hover:bg-white/20"
          >
            {isMinimized ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </IconButton>
          <IconButton
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(249,247,244,0.96),rgba(255,255,255,1))] p-4">
            {messages.length === 0 ? (
              <div className="space-y-5 py-4">
                <div className="rounded-[1.5rem] border border-[rgba(29,29,31,0.08)] bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[rgba(239,99,81,0.12)] p-3 text-[var(--color-accent,#ef6351)]">
                      <Wand2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1d1d1f]">AI z pamięcią i uczeniem się</p>
                      <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                        Uczę się z każdej rozmowy! Pamiętam Twoje preferencje, wzorce i kontekst.
                        Im więcej rozmawiamy, tym lepiej Cię rozumiem.
                      </p>
                    </div>
                  </div>
                </div>

                {learnedPhrases.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6e6e73]">
                        Twoje częste frazy
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {learnedPhrases.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setInputMessage(phrase)}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-900 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#6e6e73]">
                    Szybkie prompty
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ASSISTANT_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handlePromptClick(prompt)}
                        className="rounded-full border border-black/10 bg-white px-3 py-2 text-left text-xs font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-[1.25rem] px-4 py-3 shadow-sm ${
                        message.sender === 'user'
                          ? 'bg-[#1d1d1f] text-white'
                          : 'border border-black/5 bg-white text-[#1d1d1f]'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs opacity-70">
                        {message.sender === 'ai' ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isProcessing ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-[1.25rem] border border-black/5 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-[#ef6351]" />
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#ef6351] animate-bounce" />
                        <div
                          className="h-2 w-2 rounded-full bg-[#f5a65b] animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="h-2 w-2 rounded-full bg-[#2f4858] animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-black/5 bg-white p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {ASSISTANT_PROMPTS.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInputMessage(prompt)}
                  className="shrink-0 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[11px] font-semibold text-[#6e6e73] transition hover:bg-[#ececf0] hover:text-[#1d1d1f]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Np. dodaj zadanie, zakupy i wydarzenie na jutro..."
                className="flex-1 rounded-2xl border border-black/10 px-4 py-3 text-sm text-[#1d1d1f] outline-none transition focus:border-[#ef6351] focus:ring-4 focus:ring-[rgba(239,99,81,0.12)]"
                disabled={isProcessing}
              />
              <Button
                onClick={() => {
                  void sendMessage();
                }}
                disabled={!inputMessage.trim() || isProcessing}
                className="bg-[#1d1d1f] p-3 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
