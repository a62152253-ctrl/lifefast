import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Share2, Mail, Check, X, AlertCircle, Loader2, Video, MessageCircle, Calendar, Clock, Star, Zap } from 'lucide-react';
import { Card, Button, Badge, IconButton } from './CommonUI';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { sendInvite, acceptInvite, rejectInvite, disconnectPartner, Invite, UserProfile } from '../lib/sharing';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { hapticFeedback } from '../lib/utils';

export default function PartnerManager() {
  const [user] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<Invite[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<Invite[]>([]);
  const [sharedGoals, setSharedGoals] = useState<any[]>([]);
  const [sharedTasks, setSharedTasks] = useState<any[]>([]);
  const [showShared, setShowShared] = useState(false);
  const [collabHistory, setCollabHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Watch profile for partner info
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });

    // Watch incoming invites
    const qIn = query(collection(db, 'invites'), where('toEmail', '==', user.email?.toLowerCase()));
    const unsubIn = onSnapshot(qIn, (snap) => {
      setIncomingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    });

    // Watch outgoing invites
    const qOut = query(collection(db, 'invites'), where('fromUid', '==', user.uid));
    const unsubOut = onSnapshot(qOut, (snap) => {
      setOutgoingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    });

    return () => { unsubProfile(); unsubIn(); unsubOut(); };
  }, [user]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !user) return;
    setIsSending(true);
    hapticFeedback('medium');
    try {
      await sendInvite(email);
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Czy na pewno chcesz rozłączyć to konto? Wspólne dane nie będą już widoczne.')) {
      hapticFeedback('heavy');
      await disconnectPartner();
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Współdzielenie Premium</h3>
            <p className="text-sm text-gray-400 font-medium">Zarządzaj dostępem dla partnera lub rodziny.</p>
          </div>
        </div>

        <form onSubmit={handleSendInvite} className="mb-12">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Wyślij zaproszenie</p>
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail partnera..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-100 transition-all pl-12"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              </div>
              <Button type="submit" disabled={isSending} className="md:w-48 h-[60px] rounded-2xl">
                 {isSending ? (
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 ) : (
                   <>Zaproś <UserPlus size={18} /></>
                 )}
              </Button>
           </div>
           
           <AnimatePresence>
             {status === 'success' && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0 }}
                 className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold"
               >
                 <Check size={18} /> Zaproszenie zostało wysłane pomyślnie!
               </motion.div>
             )}
           </AnimatePresence>
        </form>

        <div className="space-y-6">
           {incomingInvites.length > 0 && (
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Oczekujące zaproszenia</p>
                 {incomingInvites.map(inv => (
                    <div key={inv.id} className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center justify-between">
                       <div>
                          <p className="text-lg font-black text-amber-900">{inv.fromEmail}</p>
                          <p className="text-xs text-amber-700 font-medium">Chce połączyć z Tobą konto</p>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="primary" className="h-10 px-4 rounded-xl text-xs" onClick={() => { hapticFeedback('medium'); acceptInvite(inv); }}>Akceptuj</Button>
                          <IconButton icon={X} onClick={() => { hapticFeedback('light'); rejectInvite(inv.id); }} className="bg-white text-amber-900 border-amber-200" />
                       </div>
                    </div>
                 ))}
              </div>
           )}

           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Twoi Partnerzy</p>
           {profile?.partnerUid ? (
             <div className="p-6 bg-gray-50 rounded-[2rem] flex items-center justify-between group hover:bg-indigo-50/30 transition-all border border-transparent hover:border-indigo-100">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-indigo-600 font-extrabold text-xl overflow-hidden">
                      {profile.partnerEmail?.[0].toUpperCase()}
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-[#1d1d1f] truncate max-w-[150px]">{profile.partnerEmail}</p>
                        <Badge variant="success" className="text-[8px] h-5 flex items-center">Połączony</Badge>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">Masz dostęp do wspólnych danych</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <IconButton icon={Shield} className="hover:bg-white text-indigo-600" />
                   <IconButton icon={X} onClick={handleDisconnect} className="hover:bg-red-50 text-red-500" />
                </div>
             </div>
           ) : (
             <div className="text-center py-10 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
                Nie masz jeszcze połączonego partnera.
             </div>
           )}

           {outgoingInvites.filter(i => i.status === 'pending').length > 0 && (
              <div className="pt-4 space-y-3">
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-1">Wysłane zaproszenia</p>
                 {outgoingInvites.filter(i => i.status === 'pending').map(inv => (
                    <div key={inv.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
                       <p className="text-sm font-bold text-gray-600">{inv.toEmail}</p>
                       <Badge variant="secondary">Oczekiwanie</Badge>
                       <IconButton icon={X} size="sm" onClick={() => rejectInvite(inv.id)} />
                    </div>
                 ))}
              </div>
           )}
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900 to-indigo-950 text-white border-none relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10">
            <Share2 size={120} />
         </div>
         <div className="relative z-10">
            <h4 className="text-lg font-black mb-4 flex items-center gap-2">
               <AlertCircle size={20} className="text-amber-400" />
               Bezpieczeństwo danych
            </h4>
            <p className="text-sm text-indigo-100/70 leading-relaxed max-w-[80%] font-medium">
               Twoje notatki osobiste i dane logowania nigdy nie są udostępniane. Współdzielenius podlegają jedynie listy zakupów, wspólne zadania i wspólne finanse.
            </p>
         </div>
      </Card>
    </div>
  );
}
