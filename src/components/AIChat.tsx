import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { Button, Card, FloatingActionButton, IconButton, PageHeader, Modal } from './CommonUI';
import {
  collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, getDocs, limit
} from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { Send, Bot, User, Sparkles, X, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDashboardInsight } from '../services/geminiService';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: any;
  type: 'command' | 'response' | 'info';
}

export default function AIChat() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeCommand = async (command: string): Promise<string> => {
    const cmd = command.toLowerCase().trim();
    
    // Dodawanie notatki
    if (cmd.includes('dodaj notatk') || cmd.includes('stwórz notatk')) {
      const noteContent = command.replace(/dodaj notatk|stwórz notatk/i, '').trim();
      if (noteContent) {
        try {
          await addDoc(collection(db, 'notes'), {
            title: noteContent.substring(0, 50),
            content: noteContent,
            uid: user?.uid,
            timestamp: serverTimestamp(),
            color: 'yellow',
            tags: ['AI'],
            pinned: false
          });
          return `✅ Dodałem notatkę: "${noteContent}"`;
        } catch (error) {
          return `❌ Błąd dodawania notatki: ${error}`;
        }
      }
      return 'Podaj treść notatki';
    }

    // Dodawanie zadania
    if (cmd.includes('dodaj zadani') || cmd.includes('dodaj task')) {
      const taskContent = command.replace(/dodaj zadani|dodaj task/i, '').trim();
      if (taskContent) {
        try {
          await addDoc(collection(db, 'tasks'), {
            title: taskContent,
            uid: user?.uid,
            timestamp: serverTimestamp(),
            completed: false,
            priority: 'medium',
            category: 'other'
          });
          return `✅ Dodałem zadanie: "${taskContent}"`;
        } catch (error) {
          return `❌ Błąd dodawania zadania: ${error}`;
        }
      }
      return 'Podaj treść zadania';
    }

    // Dodawanie nawyku
    if (cmd.includes('dodaj nawyk') || cmd.includes('stwórz nawyk')) {
      const habitContent = command.replace(/dodaj nawyk|stwórz nawyk/i, '').trim();
      if (habitContent) {
        try {
          await addDoc(collection(db, 'habits'), {
            name: habitContent,
            uid: user?.uid,
            timestamp: serverTimestamp(),
            streak: 0,
            completedToday: false,
            frequency: 'daily'
          });
          return `✅ Dodałem nawyk: "${habitContent}"`;
        } catch (error) {
          return `❌ Błąd dodawania nawyku: ${error}`;
        }
      }
      return 'Podaj nazwę nawyku';
    }

    // Pomoc
    if (cmd.includes('pomoc') || cmd.includes('help') || cmd.includes('co potrafisz')) {
      return `🤖 Jestem AI asystentem LifeFlow. Mogę:
      
📝 **Notatki**: "dodaj notatkę o psie"
✅ **Zadania**: "dodaj zadanie kupić chleb"
🎯 **Nawyki**: "dodaj nawyk ćwiczyć rano"
📊 **Podsumowanie**: "pokaż podsumowanie dnia"

Wystarczy napisać komendę naturalnym językiem!`;
    }

    // Podsumowanie
    if (cmd.includes('podsumowanie') || cmd.includes('summary')) {
      try {
        const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('uid', '==', user?.uid), limit(10)));
        const notesSnapshot = await getDocs(query(collection(db, 'notes'), where('uid', '==', user?.uid), limit(10)));
        const habitsSnapshot = await getDocs(query(collection(db, 'habits'), where('uid', '==', user?.uid), limit(10)));
        
        const tasks = tasksSnapshot.docs.length;
        const notes = notesSnapshot.docs.length;
        const habits = habitsSnapshot.docs.length;
        
        return `📊 Podsumowanie:
📝 Notatki: ${notes}
✅ Zadania: ${tasks}
🎯 Nawyki: ${habits}`;
      } catch (error) {
        return `❌ Błąd pobierania podsumowania: ${error}`;
      }
    }

    return 'Nie rozumiem komendy. Napisz "pomoc" aby zobaczyć dostępne opcje.';
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'command'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const response = await executeCommand(inputMessage);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date(),
        type: 'response'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `❌ Wystąpił błąd: ${error}`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'response'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
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
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
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
      className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">LifeFlow AI</span>
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/20"
          >
            {isMinimized ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </IconButton>
          <IconButton
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                <p className="text-sm">Cześć! Jestem LifeFlow AI 😊</p>
                <p className="text-xs mt-1">Napisz "pomoc" aby zobaczyć co mogę zrobić</p>
              </div>
            )}
            
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
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender === 'ai' ? (
                        <Bot className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span className="text-xs opacity-75">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Napisz komendę..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isProcessing}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="bg-blue-500 text-white p-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
