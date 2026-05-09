import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Check, CheckCheck, User, Heart, Sparkles } from 'lucide-react';
import { Card, Button, Badge, IconButton } from './CommonUI';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { sendMessage, subscribeToChat, markMessageAsRead, ChatMessage } from '../lib/chat';
import { doc, onSnapshot } from 'firebase/firestore';
import { hapticFeedback } from '../lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Chat() {
  const [user] = useAuthState(auth);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Watch profile for partner info
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPartnerUid(data.partnerUid || null);
        setPartnerEmail(data.partnerEmail || '');
      }
    });

    return unsubProfile;
  }, [user]);

  useEffect(() => {
    if (!partnerUid) return;

    const unsub = subscribeToChat(partnerUid, (msgs) => {
      setMessages(msgs);
      
      // Mark messages as read
      msgs.filter(msg => msg.toUid === user?.uid && !msg.read).forEach(msg => {
        markMessageAsRead(msg.id);
      });
    });

    return unsub;
  }, [partnerUid, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !partnerUid) return;

    hapticFeedback('medium');
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    
    try {
      const success = await sendMessage(messageContent, partnerUid);
      if (!success) {
        setNewMessage(messageContent);
      }
    } catch {
      setNewMessage(messageContent);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return format(date, 'HH:mm', { locale: pl });
  };

  const isToday = (timestamp: any) => {
    if (!timestamp) return false;
    const date = timestamp.toDate();
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (!partnerUid) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-none text-center py-24">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6 shadow-lg">
            <MessageCircle size={40} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4">Brak połączonego partnera</h3>
          <p className="text-gray-600 font-medium mb-8 max-w-md mx-auto">
            Połącz konto z partnerem, aby móc ze sobą rozmawiać i synchronizować dane.
          </p>
          <Button variant="primary" className="rounded-2xl px-8">
            Ustawienia partnera
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-200px)] flex flex-col">
      {/* Chat Header */}
      <Card className="bg-white shadow-sm border-0 rounded-t-3xl px-8 py-6 mb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
              {partnerEmail[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{partnerEmail}</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-[10px] h-6 flex items-center">
              <Heart size={12} className="mr-1" /> Połączony
            </Badge>
          </div>
        </div>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 bg-gray-50/50 overflow-y-auto px-6 py-6 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => {
            const isOwn = message.fromUid === user?.uid;
            const showDate = index === 0 || !isToday(messages[index - 1]?.timestamp);
            
            return (
              <React.Fragment key={message.id}>
                {showDate && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400 font-medium bg-white px-3 py-1 rounded-full">
                      {isToday(message.timestamp) ? 'Dzisiaj' : format(message.timestamp.toDate(), 'd MMMM', { locale: pl })}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-sm ${
                    isOwn 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' 
                      : 'bg-white text-gray-900 border border-gray-100'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed break-words">
                      {message.content}
                    </p>
                    <div className={`flex items-center justify-between mt-2 gap-4 ${
                      isOwn ? 'text-indigo-100' : 'text-gray-400'
                    }`}>
                      <span className="text-[10px] font-medium">
                        {formatTime(message.timestamp)}
                      </span>
                      {isOwn && (
                        <div className="flex items-center gap-1">
                          {message.read ? (
                            <CheckCheck size={14} className="text-indigo-200" />
                          ) : (
                            <Check size={14} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <Card className="bg-white shadow-lg border-0 rounded-b-3xl px-6 py-4 mt-0">
        <form onSubmit={handleSend} className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Napisz wiadomość..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-100 transition-all focus:border-indigo-200"
              maxLength={500}
            />
            {newMessage.length > 400 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {newMessage.length}/500
              </span>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="h-14 w-14 rounded-2xl p-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Send size={20} className="text-white" />
          </Button>
        </form>
        
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <p className="text-gray-500 font-medium text-sm">
              Rozpocznij rozmowę z {partnerEmail.split('@')[0]}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
