import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, logout, db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { Card, Button, PageHeader, Badge, IconButton, Modal } from './CommonUI';
import { User, LogOut, Bell, Shield, Paintbrush, Globe, Info, ChevronRight, CreditCard, Sparkles, Share2, Mail, Check, X, Users, RefreshCw, Sun, Moon, Download, FileJson, FileSpreadsheet, BrainCircuit, Camera, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { sendInvite, acceptInvite, rejectInvite, disconnectPartner, updateUserSettings, DEFAULT_SETTINGS, Invite } from '../lib/sharing';
import { useDevice } from '../context/DeviceContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { exportToJSON, exportToCSV } from '../lib/export';
import CustomNavManager from './CustomNavManager';

const AVATAR_EMOJIS = ['😎','🦊','🐺','🦋','🌟','⚡','🔥','🌊','🍀','🦅','🌙','🎯','💎','🚀','🎨','👑','🐉','🦁'];
const AVATAR_COLORS = [
  { id: 'indigo',  cls: 'bg-indigo-500',  label: 'Indygo' },
  { id: 'violet',  cls: 'bg-violet-500',  label: 'Fiolet' },
  { id: 'rose',    cls: 'bg-rose-500',    label: 'Róż' },
  { id: 'amber',   cls: 'bg-amber-500',   label: 'Bursztyn' },
  { id: 'emerald', cls: 'bg-emerald-500', label: 'Szmaragd' },
  { id: 'sky',     cls: 'bg-sky-500',     label: 'Błękit' },
  { id: 'orange',  cls: 'bg-orange-500',  label: 'Pomarańcz' },
  { id: 'slate',   cls: 'bg-slate-700',   label: 'Grafit' },
];

export default function Settings() {
  const [user] = useAuthState(auth);
  const [sharingEmail, setSharingEmail] = useState('');
  const [profile, setProfile] = useState<any | null>(null);
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Profile editor state
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEmoji, setEditEmoji] = useState('😎');
  const [editColor, setEditColor] = useState('indigo');
  const [profileSaving, setProfileSaving] = useState(false);

  // Modals state
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAiControl, setShowAiControl] = useState(false);
  const { deviceType, setDeviceType } = useDevice();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (!user) return;

    // Listen to user profile
    const unsubProfile = onSnapshot(doc(db, 'userProfiles', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      else setProfile(null);
    });

    // Listen to received invites
    const qReceived = query(
      collection(db, 'invites'),
      where('toEmail', '==', user.email?.toLowerCase().trim()),
      where('status', '==', 'pending')
    );
    const unsubReceived = onSnapshot(qReceived, (snap) => {
      setReceivedInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    });

    // Listen to sent invites
    const qSent = query(
      collection(db, 'invites'),
      where('fromUid', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubSent = onSnapshot(qSent, (snap) => {
      setSentInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    });

    return () => {
      unsubProfile();
      unsubReceived();
      unsubSent();
    };
  }, [user]);

  const openProfileEditor = () => {
    setEditName(profile?.displayName || user?.displayName || '');
    setEditBio(profile?.bio || '');
    setEditEmoji(profile?.avatarEmoji || '😎');
    setEditColor(profile?.avatarColor || 'indigo');
    setShowProfile(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateProfile(user, { displayName: editName.trim() || user.displayName });
      await setDoc(doc(db, 'userProfiles', user.uid), {
        displayName: editName.trim(),
        bio: editBio.trim(),
        avatarEmoji: editEmoji,
        avatarColor: editColor,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setShowProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingEmail.trim()) return;
    setIsLoading(true);
    await sendInvite(sharingEmail);
    setSharingEmail('');
    setIsLoading(false);
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    if (!user) return;
    setIsLoading(true);
    
    // Fetch all user records
    const collections = ['tasks', 'shoppingItems', 'habits', 'notes', 'budget', 'plans'];
    const allData: any = {};
    const flatData: any[] = [];

    for (const coll of collections) {
      const q = query(collection(db, coll), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id, collection: coll }));
      allData[coll] = docs;
      flatData.push(...docs);
    }

    if (format === 'json') {
      exportToJSON(allData, `lifeflow_export_${user.uid}`);
    } else {
      exportToCSV(flatData, `lifeflow_export_${user.uid}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-10 pb-32">
      <PageHeader 
        title={t('settings.title')} 
        subtitle={t('settings.subtitle') || "Dostosuj LifeFlow do swoich potrzeb i preferencji."}
      />

      <div className="grid gap-10">
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">{t('settings.profile')}</h3>
          <Card className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-gradient-to-br from-white to-gray-50 border-gray-100 shadow-xl shadow-indigo-500/5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  'w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-transform duration-500',
                  AVATAR_COLORS.find(c => c.id === (profile?.avatarColor || 'indigo'))?.cls || 'bg-indigo-600'
                )}
              >
                {user?.photoURL && !profile?.avatarEmoji ? (
                  <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-[2rem]" />
                ) : profile?.avatarEmoji ? (
                  <span className="text-4xl">{profile.avatarEmoji}</span>
                ) : (
                  <span className="text-4xl font-extrabold">{(profile?.displayName || user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <button
                type="button"
                onClick={openProfileEditor}
                className="absolute -bottom-2 -right-2 bg-white w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-500 shadow-md hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                title="Zmień avatar"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 mb-1">
                <h3 className="text-2xl font-extrabold text-[#1d1d1f]">
                  {profile?.displayName || user?.displayName || 'Użytkownik LifeFlow'}
                </h3>
                <Badge variant="primary" className="bg-indigo-50 text-indigo-600 border-none">PRO</Badge>
              </div>
              <p className="text-gray-400 font-medium text-sm">{user?.email}</p>
              {profile?.bio && (
                <p className="text-gray-500 text-sm mt-2 italic leading-relaxed max-w-md">"{profile.bio}"</p>
              )}
            </div>

            <div className="shrink-0">
              <Button variant="secondary" className="px-6 gap-2" onClick={openProfileEditor}>
                <Pencil size={15} /> Edytuj profil
              </Button>
            </div>
          </Card>
        </section>

        {/* Sync Accounts Section */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Synchronizacja Kont</h3>
          <Card className="p-8 space-y-8">
            {profile?.partnerUid ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <Users size={32} />
                  </div>
                  <div>
                    <Badge variant="primary" className="mb-1">Aktywne połączenie</Badge>
                    <p className="text-xl font-extrabold text-[#1d1d1f]">Połączono z {profile.partnerEmail}</p>
                    <p className="text-xs text-indigo-400 font-medium tracking-tight">Wasze dane są teraz synchronizowane na wspólnych listach.</p>
                  </div>
                </div>
                <Button variant="danger" className="w-full md:w-auto" onClick={disconnectPartner}>
                  Odłącz konto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Share2 size={24} />
                    </div>
                    <h4 className="text-lg font-extrabold text-[#1d1d1f]">Zaproś partnera lub domownika</h4>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Wspólne zarządzanie domem jest łatwiejsze. Zaproś drugą osobę, aby wspólnie edytować listę zakupów i plany.
                  </p>
                  <form onSubmit={handleSendInvite} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="email" 
                        placeholder="E-mail partnera"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                        value={sharingEmail}
                        onChange={(e) => setSharingEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || !sharingEmail.trim()}>
                      {isLoading ? <RefreshCw size={20} className="animate-spin" /> : 'Zaproś'}
                    </Button>
                  </form>
                  {sentInvites.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Wysłane zaproszenia</p>
                      {sentInvites.map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-sm font-bold text-gray-600">{invite.toEmail}</span>
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Oczekiwanie</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Users size={24} />
                    </div>
                    <h4 className="text-lg font-extrabold text-[#1d1d1f]">Zaproszenia dla Ciebie</h4>
                  </div>
                  <AnimatePresence mode="wait">
                    {receivedInvites.length > 0 ? (
                      <div className="space-y-3">
                        {receivedInvites.map(invite => (
                          <motion.div 
                            key={invite.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center justify-between p-4 bg-white border-2 border-emerald-50 rounded-2xl shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-extrabold text-gray-900">{invite.fromEmail}</p>
                              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Zaprasza do grupy</p>
                            </div>
                            <div className="flex gap-2">
                               <IconButton icon={Check} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white" onClick={() => acceptInvite(invite)} />
                               <IconButton icon={X} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white" onClick={() => rejectInvite(invite.id)} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 text-sm font-medium">Brak nowych zaproszeń.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Aplikacja</h3>
            <Card className="divide-y divide-gray-50 p-0 overflow-hidden shadow-xl shadow-gray-200/50">
              <div onClick={() => setShowNotifications(true)} className="cursor-pointer">
                <SettingItem icon={Bell} title={t('settings.notifications')} subtitle={t('settings.notifications.subtitle') || "Zarządzaj alertami i przypomnieniami"} />
              </div>
              <div onClick={() => setShowAppearance(true)} className="cursor-pointer">
                <SettingItem icon={Paintbrush} title={t('settings.appearance')} subtitle={t('settings.appearance.subtitle') || "Motyw ciemny, jasny i kolory akcentów"} />
              </div>
              <div onClick={() => setShowAiControl(true)} className="cursor-pointer">
                <SettingItem icon={BrainCircuit} title={t('settings.ai')} subtitle={t('settings.ai.subtitle') || "Zarządzaj mocą AI i asystentami"} />
              </div>
              <div onClick={() => setShowLanguage(true)} className="cursor-pointer">
                <SettingItem icon={Globe} title={t('settings.language')} subtitle={language === 'pl' ? 'Polski (Polska)' : language === 'en' ? 'English (UK)' : language === 'de' ? 'Deutsch (DE)' : language === 'fr' ? 'Français (FR)' : language === 'es' ? 'Español (ES)' : 'Italiano (IT)'} />
              </div>
              <div onClick={() => setShowSubscription(true)} className="cursor-pointer">
                <SettingItem icon={CreditCard} title={t('settings.subscription') || "Subskrypcja"} subtitle={t('settings.subscription.subtitle') || "LifeFlow Premium - Aktywna"} />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">{t('settings.customNav') || 'Niestandardowa Nawigacja'}</h3>
            <Card className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('settings.customNav.description') || 'Dodaj własne karty do paska nawigacji, aby mieć szybki dostęp do ulubionych stron.'}
                </p>
                <CustomNavManager />
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Bezpieczeństwo</h3>
            <Card className="divide-y divide-gray-50 p-0 overflow-hidden shadow-xl shadow-gray-200/50">
              <div onClick={() => setShowPrivacy(true)} className="cursor-pointer">
                <SettingItem icon={Shield} title="Prywatność i Dane" subtitle="Zarządzaj tym, co udostępniasz" />
              </div>
              <div onClick={() => setShowHelp(true)} className="cursor-pointer">
                <SettingItem icon={Info} title="Centrum Pomocy" subtitle="Dokumentacja i wsparcie techniczne" />
              </div>
              <div className="p-6 flex items-center justify-between hover:bg-red-50/30 transition-all cursor-pointer group" onClick={logout}>
                <div className="flex items-center">
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl mr-5 group-hover:bg-red-600 group-hover:text-white transition-all">
                    <LogOut size={24} />
                  </div>
                  <div>
                    <p className="font-extrabold text-[#1d1d1f]">Wyloguj się</p>
                    <p className="text-xs text-gray-400 mt-0.5">Zakończ aktualną sesję</p>
                  </div>
                </div>
                <div className="text-red-300 transform group-hover:translate-x-1 transition-transform">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Card>
          </section>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Eksport Danych</h3>
          <Card className="p-8 bg-white border-dashed border-2 border-indigo-100">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                     <Download size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-black text-gray-900">Twoje dane są Twoją własnością</h4>
                     <p className="text-sm text-gray-400">Pobierz kopię wszystkich swoich zadań, nawyków i notatek.</p>
                  </div>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                  <Button variant="secondary" onClick={() => handleExportData('json')} className="flex-1 md:flex-none gap-3 h-14">
                     <FileJson size={18} /> JSON
                  </Button>
                  <Button variant="secondary" onClick={() => handleExportData('csv')} className="flex-1 md:flex-none gap-3 h-14">
                     <FileSpreadsheet size={18} /> CSV
                  </Button>
               </div>
             </div>
          </Card>
        </section>

        <section className="pt-10 text-center">
           <div className="flex items-center justify-center space-x-2 text-gray-300 font-bold uppercase text-[10px] tracking-[0.3em]">
             <span>LifeFlow v1.0.0</span>
             <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
             <span>Made with Love</span>
           </div>
        </section>
      </div>

      {/* Profile editor modal */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Edytuj profil">
        <form onSubmit={saveProfile} className="space-y-5">

          {/* TOP: Live preview + imię + bio obok siebie */}
          <div className="flex items-start gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            {/* Avatar preview — zawsze widoczny */}
            <div
              className={cn(
                'w-20 h-20 shrink-0 rounded-2xl flex items-center justify-center text-4xl shadow-lg transition-all duration-200',
                AVATAR_COLORS.find(c => c.id === editColor)?.cls ?? 'bg-indigo-500'
              )}
            >
              {editEmoji}
            </div>
            {/* Pola imię + bio */}
            <div className="flex-1 min-w-0 space-y-2">
              <input
                type="text"
                placeholder="Imię i nazwisko..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={50}
              />
              <textarea
                placeholder="Bio — napisz coś o sobie..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none h-16"
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                maxLength={150}
              />
              <p className="text-[10px] text-gray-300 text-right">{editBio.length}/150</p>
            </div>
          </div>

          {/* Emoji grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Wybierz ikonę</label>
            <div className="grid grid-cols-9 gap-1.5">
              {AVATAR_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEditEmoji(em)}
                  className={cn(
                    'w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all border-2',
                    editEmoji === em
                      ? 'border-indigo-500 bg-indigo-50 scale-110 shadow-md'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  )}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Kolor tła avatara</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setEditColor(c.id)}
                  className={cn(
                    'w-8 h-8 rounded-xl transition-all border-2',
                    c.cls,
                    editColor === c.id
                      ? 'scale-110 border-white shadow-lg ring-2 ring-offset-1 ring-gray-400'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="ghost" onClick={() => setShowProfile(false)}>Anuluj</Button>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? <RefreshCw size={16} className="animate-spin" /> : 'Zapisz profil'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modals */}
      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Prywatność i Dane">
        <div className="space-y-6">
          <div className="p-5 bg-indigo-50 rounded-2xl">
            <h4 className="font-bold text-indigo-900 mb-2">Bezpieczeństwo Firebase</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Twoje dane są przechowywane w bezpiecznej chmurze Google Firebase. Stosujemy rygorystyczne reguły bezpieczeństwa (Firestore Rules), które gwarantują, że tylko Ty (i Twój partner, jeśli go połączysz) macie dostęp do Waszych danych.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-extrabold text-gray-900">Co przechowujemy?</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                Listy zadań i zakupów
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                Nawyki i statystyki realizacji
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                Historię Twojego budżetu
              </li>
            </ul>
          </div>
          <div className="pt-4">
             <Button variant="secondary" className="w-full" onClick={() => setShowPrivacy(false)}>Rozumiem</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Centrum Pomocy">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-1">Jak działa synchronizacja?</h4>
              <p className="text-sm text-gray-500">Wpisz e-mail partnera w sekcji "Synchronizacja Kont". Po zaakceptowaniu zaproszenia, Wasze zakupy i zadania będą wspólne w czasie rzeczywistym.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-1">Czym jest LifeFlow AI?</h4>
              <p className="text-sm text-gray-500">To Twój osobisty asystent na głównym panelu, który analizuje Twoje zadania i nawyki, by dawać Ci spersonalizowane rady każdego dnia.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-1">Gdzie jest eksport do ZIP?</h4>
              <p className="text-sm text-gray-500">Ta funkcja jest dostępna w menu ustawień platformy Google AI Studio (ikona zębatki na górnym pasku).</p>
            </div>
          </div>
          <div className="pt-4">
             <Button variant="primary" className="w-full" onClick={() => setShowHelp(false)}>Zamknij pomoc</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showNotifications} onClose={() => setShowNotifications(false)} title="Powiadomienia">
        <div className="space-y-8">
          <div className="space-y-6">
            <NotificationToggle 
              title="Powiadomienia Push" 
              subtitle="Otrzymuj alerty o zadaniach i planach na żywo" 
              checked={profile?.settings?.notifications?.push ?? true}
              onChange={(val) => updateUserSettings({ notifications: { ...(profile?.settings?.notifications || DEFAULT_SETTINGS.notifications), push: val } })}
            />
            <NotificationToggle 
              title="Inteligentne Przypomnienia" 
              subtitle="Alerty o nadchodzących spotkaniach z planu dnia" 
              checked={profile?.settings?.notifications?.plans ?? true}
              onChange={(val) => updateUserSettings({ notifications: { ...(profile?.settings?.notifications || DEFAULT_SETTINGS.notifications), plans: val } })}
            />
            <NotificationToggle 
              title="Nawyki i Rutyna" 
              subtitle="Motywujące przypomnienia o Twoich nawykach" 
              checked={profile?.settings?.notifications?.habits ?? true}
              onChange={(val) => updateUserSettings({ notifications: { ...(profile?.settings?.notifications || DEFAULT_SETTINGS.notifications), habits: val } })}
            />
            <NotificationToggle 
              title="Synchronizacja Zakupów" 
              subtitle="Powiadomienia o zmianach we wspólnej liście" 
              checked={profile?.settings?.notifications?.shopping ?? true}
              onChange={(val) => updateUserSettings({ notifications: { ...(profile?.settings?.notifications || DEFAULT_SETTINGS.notifications), shopping: val } })}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">System powiadomień aktywny</p>
        </div>
      </Modal>

  <Modal isOpen={showAppearance} onClose={() => setShowAppearance(false)} title="Wygląd aplikacji">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setTheme('default')}
              className={cn(
                "p-4 rounded-2xl border-2 text-center cursor-pointer transition-all",
                theme === 'default' ? "border-indigo-600 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
              )}
            >
              <div className="w-12 h-12 bg-indigo-600/10 rounded-xl mx-auto mb-3 flex items-center justify-center text-indigo-600">
                <Sun size={24} />
              </div>
              <p className="font-bold text-gray-900 text-sm">Jasny</p>
            </div>
            <div 
              onClick={() => setTheme('dark')}
              className={cn(
                "p-4 rounded-2xl border-2 text-center cursor-pointer transition-all",
                theme === 'dark' ? "border-indigo-600 bg-gray-900" : "border-gray-900/10 bg-gray-900 opacity-60"
              )}
            >
              <div className="w-12 h-12 bg-white/10 rounded-xl mx-auto mb-3 flex items-center justify-center text-white">
                <Moon size={24} />
              </div>
              <p className="font-bold text-white text-sm">Ciemny</p>
            </div>
          </div>
          
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Dodatkowe motywy</h4>
             <div className="grid grid-cols-3 gap-3">
               {[
                 { id: 'ocean', label: 'Ocean', color: 'bg-blue-500' },
                 { id: 'forest', label: 'Las', color: 'bg-emerald-500' },
                 { id: 'sunset', label: 'Zachód', color: 'bg-orange-500' },
               ].map(m => (
                 <button 
                  key={m.id}
                  onClick={() => setTheme(m.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    theme === m.id ? "border-indigo-600 bg-white shadow-lg" : "border-gray-50 bg-gray-50"
                  )}
                 >
                   <div className={cn("w-8 h-8 rounded-lg", m.color)} />
                   <span className="text-[10px] font-bold">{m.label}</span>
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-center">Tryb interfejsu (Desktop)</h4>
             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => setDeviceType('desktop')}
                 className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${deviceType === 'desktop' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
               >
                 Komputer
               </button>
               <button 
                 onClick={() => setDeviceType('mobile')}
                 className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${deviceType === 'mobile' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
               >
                 Telefon (1:1)
               </button>
             </div>
          </div>
          
          <Button className="w-full" onClick={() => setShowAppearance(false)}>Zastosuj zmiany</Button>
        </div>
      </Modal>

      <Modal isOpen={showLanguage} onClose={() => setShowLanguage(false)} title={t('settings.language')}>
        <div className="space-y-4">
          <div className="grid gap-3">
            {[
              { code: 'pl', name: 'Polski', flag: '🇵🇱' },
              { code: 'en', name: 'English', flag: '🇬🇧' },
              { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
              { code: 'fr', name: 'Français', flag: '🇫🇷' },
              { code: 'es', name: 'Español', flag: '🇪🇸' },
              { code: 'it', name: 'Italiano', flag: '🇮🇹' },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={cn(
                  "p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                  language === lang.code 
                    ? "border-indigo-600 bg-indigo-50" 
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{lang.flag}</div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{lang.name}</p>
                    <p className="text-xs text-gray-400">{lang.code.toUpperCase()}</p>
                  </div>
                </div>
                {language === lang.code && <Check className="text-indigo-600" size={20} />}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center leading-relaxed pt-2">
            {t('settings.language')} • {language === 'pl' ? 'Zmiana języka zaktualizuje cały interfejs aplikacji.' : 'Language change will update the entire app interface.'}
          </p>
        </div>
      </Modal>

      <Modal isOpen={showSubscription} onClose={() => setShowSubscription(false)} title="Twój Plan">
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
             <Sparkles size={100} className="absolute -top-10 -right-10 opacity-10 rotate-12" />
             <div className="relative z-10">
               <Badge variant="primary" className="bg-white/20 text-white mb-4 border-none">LifeFlow Premium</Badge>
               <h4 className="text-3xl font-black mb-1">Status: Aktywny</h4>
               <p className="text-indigo-100 text-sm opacity-80">Następna płatność: Maj 2026</p>
             </div>
          </div>
          
          <div className="space-y-4">
             <h4 className="font-bold text-[#1d1d1f]">Twoje korzyści:</h4>
             {[
               'Nielimitowana liczba synchronizowanych kont',
               'LifeFlow AI Personal Insight (Gemini Powered)',
               'Nielimitowane nawyki i grupy zadań',
               'Wsparcie priorytetowe 24/7'
             ].map(perk => (
               <div key={perk} className="flex items-center gap-3 text-sm text-gray-600">
                 <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                   <Check size={12} />
                 </div>
                 {perk}
               </div>
             ))}
          </div>
          
          <Button variant="secondary" className="w-full" onClick={() => setShowSubscription(false)}>Zarządzaj płatnościami</Button>
        </div>
      </Modal>

      <Modal isOpen={showAiControl} onClose={() => setShowAiControl(false)} title="Zarządzanie AI">
        <div className="space-y-8">
           <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] text-white overflow-hidden relative">
              <BrainCircuit size={80} className="absolute -bottom-5 -right-5 opacity-20" />
              <h4 className="text-xl font-black mb-2">LifeFlow Brain</h4>
              <p className="text-xs text-indigo-100/70 font-medium">Model Gemini 3 Flash napędza Twoją aplikację. Możesz kontrolować poszczególne moduły inteligencji.</p>
           </div>
           
           <div className="space-y-6">
              <NotificationToggle 
                title="AI Task Specialist" 
                subtitle="Rozbijanie zadań na podzadania i kroki" 
                checked={true}
                onChange={() => {}}
              />
              <NotificationToggle 
                title="AI Habit Strategist" 
                subtitle="Spersonalizowany coaching i porady psychologiczne" 
                checked={true}
                onChange={() => {}}
              />
              <NotificationToggle 
                title="AI Food Scientist" 
                subtitle="Szacowanie kalorii i wartości odżywczych" 
                checked={true}
                onChange={() => {}}
              />
              <NotificationToggle 
                title="AI Daily Executive" 
                subtitle="Analiza produktywności na Dashboardzie" 
                checked={true}
                onChange={() => {}}
              />
           </div>
           <Button className="w-full h-14 rounded-2xl" onClick={() => setShowAiControl(false)}>Zapisz preferencje AI</Button>
        </div>
      </Modal>
    </div>
  );
}

function NotificationToggle({ 
  title, 
  subtitle, 
  checked, 
  onChange 
}: { 
  title: string, 
  subtitle: string, 
  checked: boolean, 
  onChange: (val: boolean) => void 
}) {
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="font-extrabold text-[#1d1d1f]">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </div>
    </div>
  );
}

function SettingItem({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) {
  return (
    <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group">
      <div className="flex items-center">
        <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl mr-5 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-200 transition-all">
          <Icon size={24} />
        </div>
        <div>
          <p className="font-extrabold text-[#1d1d1f] tracking-tight">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="text-gray-200 transform group-hover:translate-x-1 group-hover:text-indigo-400 transition-all">
        <ChevronRight size={24} />
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

