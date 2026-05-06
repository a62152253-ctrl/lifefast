import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Language = 'pl' | 'en' | 'de' | 'fr' | 'es' | 'it';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const translations = {
  pl: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.tasks': 'Zadania',
    'nav.shopping': 'Zakupy',
    'nav.habits': 'Nawyki',
    'nav.notes': 'Notatki',
    'nav.budget': 'Budżet',
    'nav.plan': 'Plan',
    'nav.calendar': 'Kalendarz',
    'nav.meals': 'Posiłki',
    'nav.mood': 'Nastrój',
    'nav.chat': 'Czat',
    'nav.settings': 'Ustawienia',
    
    // Auth
    'auth.login': 'Zaloguj się',
    'auth.register': 'Zarejestruj się',
    'auth.email': 'Email',
    'auth.password': 'Hasło',
    'auth.forgotPassword': 'Zapomniałeś hasła?',
    'auth.loginWithGoogle': 'Zaloguj przez Google',
    'auth.createAccount': 'Załóż konto',
    'auth.alreadyHaveAccount': 'Masz już konto?',
    'auth.dontHaveAccount': 'Nie masz konta?',
    'auth.signUp': 'Zarejestruj się',
    'auth.signIn': 'Zaloguj się',
    
    // Common
    'common.save': 'Zapisz',
    'common.cancel': 'Anuluj',
    'common.delete': 'Usuń',
    'common.edit': 'Edytuj',
    'common.add': 'Dodaj',
    'common.loading': 'Ładowanie...',
    'common.error': 'Błąd',
    'common.success': 'Sukces',
    'common.close': 'Zamknij',
    'common.confirm': 'Potwierdź',
    'common.back': 'Wróć',
    'common.next': 'Dalej',
    'common.done': 'Gotowe',
    'common.search': 'Szukaj',
    'common.filter': 'Filtruj',
    'common.sort': 'Sortuj',
    
    // Dashboard
    'dashboard.title': 'Witaj z powrotem',
    'dashboard.subtitle': 'Twój osobisty asystent produktywności',
    'dashboard.todayTasks': 'Dzisiejsze zadania',
    'dashboard.upcomingEvents': 'Nadchodzące wydarzenia',
    'dashboard.quickActions': 'Szybkie akcje',
    'dashboard.recentNotes': 'Ostatnie notatki',
    'dashboard.budgetOverview': 'Przegląd budżetu',
    'dashboard.habitProgress': 'Postęp nawyków',
    
    // Tasks
    'tasks.title': 'Zadania',
    'tasks.addTask': 'Dodaj zadanie',
    'tasks.taskTitle': 'Tytuł zadania',
    'tasks.description': 'Opis',
    'tasks.dueDate': 'Termin',
    'tasks.priority': 'Priorytet',
    'tasks.status': 'Status',
    'tasks.high': 'Wysoki',
    'tasks.medium': 'Średni',
    'tasks.low': 'Niski',
    'tasks.completed': 'Ukończone',
    'tasks.pending': 'Oczekujące',
    'tasks.inProgress': 'W trakcie',
    
    // Settings
    'settings.title': 'Ustawienia',
    'settings.subtitle': 'Dostosuj LifeFlow do swoich potrzeb i preferencji.',
    'settings.profile': 'Profil',
    'settings.appearance': 'Wygląd',
    'settings.notifications': 'Powiadomienia',
    'settings.privacy': 'Prywatność',
    'settings.language': 'Język',
    'settings.ai': 'Sztuczna Inteligencja',
    'settings.ai.subtitle': 'Zarządzaj mocą AI i asystentami',
    'settings.notifications.subtitle': 'Zarządzaj alertami i przypomnieniami',
    'settings.appearance.subtitle': 'Motyw ciemny, jasny i kolory akcentów',
    'settings.theme': 'Motyw',
    'settings.export': 'Eksport danych',
    'settings.about': 'O aplikacji',
    'settings.help': 'Pomoc',
    'settings.subscription': 'Subskrypcja',
    'settings.subscription.subtitle': 'LifeFlow Premium - Aktywna',
    'settings.defaultUser': 'Użytkownik LifeFlow',
    'settings.editProfile': 'Edytuj profil',
    'settings.customNav': 'Niestandardowa Nawigacja',
    'settings.customNav.description': 'Dodaj własne karty do paska nawigacji, aby mieć szybki dostęp do ulubionych stron.',
    
    // Budget
    'budget.title': 'Budżet',
    'budget.income': 'Przychody',
    'budget.expenses': 'Wydatki',
    'budget.balance': 'Saldo',
    'budget.addTransaction': 'Dodaj transakcję',
    'budget.amount': 'Kwota',
    'budget.category': 'Kategoria',
    'budget.description': 'Opis',
    
    // Calendar
    'calendar.title': 'Kalendarz',
    'calendar.today': 'Dziś',
    'calendar.week': 'Tydzień',
    'calendar.month': 'Miesiąc',
    'calendar.addEvent': 'Dodaj wydarzenie',
    'calendar.eventTitle': 'Tytuł wydarzenia',
    'calendar.startTime': 'Czas rozpoczęcia',
    'calendar.endTime': 'Czas zakończenia',
    
    // Habits
    'habits.title': 'Nawyki',
    'habits.addHabit': 'Dodaj nawyk',
    'habits.habitName': 'Nazwa nawyku',
    'habits.frequency': 'Częstotliwość',
    'habits.daily': 'Codziennie',
    'habits.weekly': 'Co tydzień',
    'habits.monthly': 'Co miesiąc',
    'habits.streak': 'Seria',
    
    // Notes
    'notes.title': 'Notatki',
    'notes.addNote': 'Dodaj notatkę',
    'notes.noteTitle': 'Tytuł notatki',
    'notes.noteContent': 'Treść notatki',
    'notes.search': 'Szukaj notatek',
    
    // Shopping
    'shopping.title': 'Zakupy',
    'shopping.addItem': 'Dodaj produkt',
    'shopping.itemName': 'Nazwa produktu',
    'shopping.quantity': 'Ilość',
    'shopping.price': 'Cena',
    'shopping.category': 'Kategoria',
    'shopping.purchased': 'Kupione',
    
    // Chat
    'chat.title': 'Czat AI',
    'chat.typeMessage': 'Wpisz wiadomość...',
    'chat.send': 'Wyślij',
    'chat.aiAssistant': 'Asystent AI',
    
    // Mood Tracker
    'mood.title': 'Nastrój',
    'mood.today': 'Dzisiejszy nastrój',
    'mood.addEntry': 'Dodaj wpis',
    'mood.note': 'Notatka',
    
    // Meal Planner
    'meals.title': 'Planer posiłków',
    'meals.addMeal': 'Dodaj posiłek',
    'meals.mealName': 'Nazwa posiłku',
    'meals.calories': 'Kalorie',
    'meals.mealType': 'Rodzaj posiłku',
    
    // Errors
    'error.network': 'Błąd sieci',
    'error.auth': 'Błąd autentykacji',
    'error.validation': 'Błąd walidacji',
    'error.unknown': 'Nieznany błąd',
    'error.emailRequired': 'Email jest wymagany',
    'error.passwordRequired': 'Hasło jest wymagane',
    'error.invalidEmail': 'Nieprawidłowy email',
    'error.weakPassword': 'Hasło jest zbyt słabe',
    
    // Success messages
    'success.saved': 'Zapisano',
    'success.deleted': 'Usunięto',
    'success.updated': 'Zaktualizowano',
    'success.added': 'Dodano',
    
    // Time
    'time.today': 'Dziś',
    'time.yesterday': 'Wczoraj',
    'time.tomorrow': 'Jutro',
    'time.thisWeek': 'W tym tygodniu',
    'time.thisMonth': 'W tym miesiącu',
    'time.lastWeek': 'Ostatni tydzień',
    'time.lastMonth': 'Ostatni miesiąc',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.tasks': 'Tasks',
    'nav.shopping': 'Shopping',
    'nav.habits': 'Habits',
    'nav.notes': 'Notes',
    'nav.budget': 'Budget',
    'nav.plan': 'Plan',
    'nav.calendar': 'Calendar',
    'nav.meals': 'Meals',
    'nav.mood': 'Mood',
    'nav.chat': 'Chat',
    'nav.settings': 'Settings',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.loginWithGoogle': 'Login with Google',
    'auth.createAccount': 'Create account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.signUp': 'Sign up',
    'auth.signIn': 'Sign in',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    
    // Dashboard
    'dashboard.title': 'Welcome back',
    'dashboard.subtitle': 'Your personal productivity assistant',
    'dashboard.todayTasks': 'Today\'s tasks',
    'dashboard.upcomingEvents': 'Upcoming events',
    'dashboard.quickActions': 'Quick actions',
    'dashboard.recentNotes': 'Recent notes',
    'dashboard.budgetOverview': 'Budget overview',
    'dashboard.habitProgress': 'Habit progress',
    
    // Tasks
    'tasks.title': 'Tasks',
    'tasks.addTask': 'Add task',
    'tasks.taskTitle': 'Task title',
    'tasks.description': 'Description',
    'tasks.dueDate': 'Due date',
    'tasks.priority': 'Priority',
    'tasks.status': 'Status',
    'tasks.high': 'High',
    'tasks.medium': 'Medium',
    'tasks.low': 'Low',
    'tasks.completed': 'Completed',
    'tasks.pending': 'Pending',
    'tasks.inProgress': 'In progress',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize LifeFlow to your needs and preferences.',
    'settings.profile': 'Profile',
    'settings.appearance': 'Appearance',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.language': 'Language',
    'settings.ai': 'Artificial Intelligence',
    'settings.ai.subtitle': 'Manage AI power and assistants',
    'settings.notifications.subtitle': 'Manage alerts and reminders',
    'settings.appearance.subtitle': 'Dark theme, light theme and accent colors',
    'settings.theme': 'Theme',
    'settings.export': 'Export data',
    'settings.about': 'About',
    'settings.help': 'Help',
    'settings.subscription': 'Subscription',
    'settings.subscription.subtitle': 'LifeFlow Premium - Active',
    'settings.defaultUser': 'LifeFlow User',
    'settings.editProfile': 'Edit Profile',
    
    // Budget
    'budget.title': 'Budget',
    'budget.income': 'Income',
    'budget.expenses': 'Expenses',
    'budget.balance': 'Balance',
    'budget.addTransaction': 'Add transaction',
    'budget.amount': 'Amount',
    'budget.category': 'Category',
    'budget.description': 'Description',
    
    // Calendar
    'calendar.title': 'Calendar',
    'calendar.today': 'Today',
    'calendar.week': 'Week',
    'calendar.month': 'Month',
    'calendar.addEvent': 'Add event',
    'calendar.eventTitle': 'Event title',
    'calendar.startTime': 'Start time',
    'calendar.endTime': 'End time',
    
    // Habits
    'habits.title': 'Habits',
    'habits.addHabit': 'Add habit',
    'habits.habitName': 'Habit name',
    'habits.frequency': 'Frequency',
    'habits.daily': 'Daily',
    'habits.weekly': 'Weekly',
    'habits.monthly': 'Monthly',
    'habits.streak': 'Streak',
    
    // Notes
    'notes.title': 'Notes',
    'notes.addNote': 'Add note',
    'notes.noteTitle': 'Note title',
    'notes.noteContent': 'Note content',
    'notes.search': 'Search notes',
    
    // Shopping
    'shopping.title': 'Shopping',
    'shopping.addItem': 'Add item',
    'shopping.itemName': 'Item name',
    'shopping.quantity': 'Quantity',
    'shopping.price': 'Price',
    'shopping.category': 'Category',
    'shopping.purchased': 'Purchased',
    
    // Chat
    'chat.title': 'AI Chat',
    'chat.typeMessage': 'Type a message...',
    'chat.send': 'Send',
    'chat.aiAssistant': 'AI Assistant',
    
    // Mood Tracker
    'mood.title': 'Mood',
    'mood.today': 'Today\'s mood',
    'mood.addEntry': 'Add entry',
    'mood.note': 'Note',
    
    // Meal Planner
    'meals.title': 'Meal Planner',
    'meals.addMeal': 'Add meal',
    'meals.mealName': 'Meal name',
    'meals.calories': 'Calories',
    'meals.mealType': 'Meal type',
    
    // Errors
    'error.network': 'Network error',
    'error.auth': 'Authentication error',
    'error.validation': 'Validation error',
    'error.unknown': 'Unknown error',
    'error.emailRequired': 'Email is required',
    'error.passwordRequired': 'Password is required',
    'error.invalidEmail': 'Invalid email',
    'error.weakPassword': 'Password is too weak',
    
    // Success messages
    'success.saved': 'Saved',
    'success.deleted': 'Deleted',
    'success.updated': 'Updated',
    'success.added': 'Added',
    
    // Time
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.tomorrow': 'Tomorrow',
    'time.thisWeek': 'This week',
    'time.thisMonth': 'This month',
    'time.lastWeek': 'Last week',
    'time.lastMonth': 'Last month',
  },
  de: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.tasks': 'Aufgaben',
    'nav.shopping': 'Einkauf',
    'nav.habits': 'Gewohnheiten',
    'nav.notes': 'Notizen',
    'nav.budget': 'Budget',
    'nav.plan': 'Plan',
    'nav.calendar': 'Kalender',
    'nav.meals': 'Mahlzeiten',
    'nav.mood': 'Stimmung',
    'nav.chat': 'Chat',
    'nav.settings': 'Einstellungen',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.loginWithGoogle': 'Mit Google anmelden',
    'auth.createAccount': 'Konto erstellen',
    'auth.alreadyHaveAccount': 'Haben Sie bereits ein Konto?',
    'auth.dontHaveAccount': 'Haben Sie kein Konto?',
    'auth.signUp': 'Registrieren',
    'auth.signIn': 'Anmelden',
    
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.close': 'Schließen',
    'common.confirm': 'Bestätigen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.done': 'Fertig',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.sort': 'Sortieren',
    
    // Dashboard
    'dashboard.title': 'Willkommen zurück',
    'dashboard.subtitle': 'Ihr persönlicher Produktivitätsassistent',
    'dashboard.todayTasks': 'Heutige Aufgaben',
    'dashboard.upcomingEvents': 'Bevorstehende Ereignisse',
    'dashboard.quickActions': 'Schnellaktionen',
    'dashboard.recentNotes': 'Aktuelle Notizen',
    'dashboard.budgetOverview': 'Budgetübersicht',
    'dashboard.habitProgress': 'Gewohnheitsfortschritt',
    
    // Tasks
    'tasks.title': 'Aufgaben',
    'tasks.addTask': 'Aufgabe hinzufügen',
    'tasks.taskTitle': 'Aufgabentitel',
    'tasks.description': 'Beschreibung',
    'tasks.dueDate': 'Fälligkeitsdatum',
    'tasks.priority': 'Priorität',
    'tasks.status': 'Status',
    'tasks.high': 'Hoch',
    'tasks.medium': 'Mittel',
    'tasks.low': 'Niedrig',
    'tasks.completed': 'Abgeschlossen',
    'tasks.pending': 'Ausstehend',
    'tasks.inProgress': 'In Bearbeitung',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Passen Sie LifeFlow an Ihre Bedürfnisse und Vorlieben an.',
    'settings.profile': 'Profil',
    'settings.appearance': 'Erscheinungsbild',
    'settings.notifications': 'Benachrichtigungen',
    'settings.privacy': 'Datenschutz',
    'settings.language': 'Sprache',
    'settings.ai': 'Künstliche Intelligenz',
    'settings.ai.subtitle': 'Verwalten Sie KI-Stärke und Assistenten',
    'settings.notifications.subtitle': 'Benachrichtigungen und Erinnerungen verwalten',
    'settings.appearance.subtitle': 'Dunkles Design, helles Design und Akzentfarben',
    'settings.theme': 'Theme',
    'settings.export': 'Daten exportieren',
    'settings.about': 'Über',
    'settings.help': 'Hilfe',
    'settings.subscription': 'Abonnement',
    'settings.subscription.subtitle': 'LifeFlow Premium - Aktiv',
    'settings.defaultUser': 'LifeFlow Benutzer',
    'settings.editProfile': 'Profil bearbeiten',
    
    // Budget
    'budget.title': 'Budget',
    'budget.income': 'Einnahmen',
    'budget.expenses': 'Ausgaben',
    'budget.balance': 'Saldo',
    'budget.addTransaction': 'Transaktion hinzufügen',
    'budget.amount': 'Betrag',
    'budget.category': 'Kategorie',
    'budget.description': 'Beschreibung',
    
    // Calendar
    'calendar.title': 'Kalender',
    'calendar.today': 'Heute',
    'calendar.week': 'Woche',
    'calendar.month': 'Monat',
    'calendar.addEvent': 'Ereignis hinzufügen',
    'calendar.eventTitle': 'Ereignistitel',
    'calendar.startTime': 'Startzeit',
    'calendar.endTime': 'Endzeit',
    
    // Habits
    'habits.title': 'Gewohnheiten',
    'habits.addHabit': 'Gewohnheit hinzufügen',
    'habits.habitName': 'Gewohnheitsname',
    'habits.frequency': 'Häufigkeit',
    'habits.daily': 'Täglich',
    'habits.weekly': 'Wöchentlich',
    'habits.monthly': 'Monatlich',
    'habits.streak': 'Serie',
    
    // Notes
    'notes.title': 'Notizen',
    'notes.addNote': 'Notiz hinzufügen',
    'notes.noteTitle': 'Notiztitel',
    'notes.noteContent': 'Notizinhalt',
    'notes.search': 'Notizen suchen',
    
    // Shopping
    'shopping.title': 'Einkauf',
    'shopping.addItem': 'Artikel hinzufügen',
    'shopping.itemName': 'Artikelname',
    'shopping.quantity': 'Menge',
    'shopping.price': 'Preis',
    'shopping.category': 'Kategorie',
    'shopping.purchased': 'Gekauft',
    
    // Chat
    'chat.title': 'KI-Chat',
    'chat.typeMessage': 'Nachricht eingeben...',
    'chat.send': 'Senden',
    'chat.aiAssistant': 'KI-Assistent',
    
    // Mood Tracker
    'mood.title': 'Stimmung',
    'mood.today': 'Heutige Stimmung',
    'mood.addEntry': 'Eintrag hinzufügen',
    'mood.note': 'Notiz',
    
    // Meal Planner
    'meals.title': 'Mahlzeitenplaner',
    'meals.addMeal': 'Mahlzeit hinzufügen',
    'meals.mealName': 'Mahlzeitenname',
    'meals.calories': 'Kalorien',
    'meals.mealType': 'Mahlzeitenart',
    
    // Errors
    'error.network': 'Netzwerkfehler',
    'error.auth': 'Authentifizierungsfehler',
    'error.validation': 'Validierungsfehler',
    'error.unknown': 'Unbekannter Fehler',
    'error.emailRequired': 'E-Mail ist erforderlich',
    'error.passwordRequired': 'Passwort ist erforderlich',
    'error.invalidEmail': 'Ungültige E-Mail',
    'error.weakPassword': 'Passwort ist zu schwach',
    
    // Success messages
    'success.saved': 'Gespeichert',
    'success.deleted': 'Gelöscht',
    'success.updated': 'Aktualisiert',
    'success.added': 'Hinzugefügt',
    
    // Time
    'time.today': 'Heute',
    'time.yesterday': 'Gestern',
    'time.tomorrow': 'Morgen',
    'time.thisWeek': 'Diese Woche',
    'time.thisMonth': 'Dieser Monat',
    'time.lastWeek': 'Letzte Woche',
    'time.lastMonth': 'Letzter Monat',
  },
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.tasks': 'Tâches',
    'nav.shopping': 'Courses',
    'nav.habits': 'Habitudes',
    'nav.notes': 'Notes',
    'nav.budget': 'Budget',
    'nav.plan': 'Plan',
    'nav.calendar': 'Calendrier',
    'nav.meals': 'Repas',
    'nav.mood': 'Humeur',
    'nav.chat': 'Chat',
    'nav.settings': 'Paramètres',
    
    // Auth
    'auth.login': 'Connexion',
    'auth.register': 'S\'inscrire',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.loginWithGoogle': 'Connexion avec Google',
    'auth.createAccount': 'Créer un compte',
    'auth.alreadyHaveAccount': 'Vous avez déjà un compte?',
    'auth.dontHaveAccount': 'Vous n\'avez pas de compte?',
    'auth.signUp': 'S\'inscrire',
    'auth.signIn': 'Se connecter',
    
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.done': 'Terminé',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    
    // Dashboard
    'dashboard.title': 'Bon retour',
    'dashboard.subtitle': 'Votre assistant productivité personnel',
    'dashboard.todayTasks': 'Tâches d\'aujourd\'hui',
    'dashboard.upcomingEvents': 'Événements à venir',
    'dashboard.quickActions': 'Actions rapides',
    'dashboard.recentNotes': 'Notes récentes',
    'dashboard.budgetOverview': 'Aperçu du budget',
    'dashboard.habitProgress': 'Progrès des habitudes',
    
    // Tasks
    'tasks.title': 'Tâches',
    'tasks.addTask': 'Ajouter une tâche',
    'tasks.taskTitle': 'Titre de la tâche',
    'tasks.description': 'Description',
    'tasks.dueDate': 'Date d\'échéance',
    'tasks.priority': 'Priorité',
    'tasks.status': 'Statut',
    'tasks.high': 'Élevé',
    'tasks.medium': 'Moyen',
    'tasks.low': 'Bas',
    'tasks.completed': 'Terminé',
    'tasks.pending': 'En attente',
    'tasks.inProgress': 'En cours',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Personnalisez LifeFlow selon vos besoins et préférences.',
    'settings.profile': 'Profil',
    'settings.appearance': 'Apparence',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Confidentialité',
    'settings.language': 'Langue',
    'settings.ai': 'Intelligence Artificielle',
    'settings.ai.subtitle': 'Gérez la puissance de l\'IA et les assistants',
    'settings.notifications.subtitle': 'Gérez les alertes et les rappels',
    'settings.appearance.subtitle': 'Thème sombre, thème clair et couleurs d\'accent',
    'settings.theme': 'Thème',
    'settings.export': 'Exporter les données',
    'settings.about': 'À propos',
    'settings.help': 'Aide',
    'settings.subscription': 'Abonnement',
    'settings.subscription.subtitle': 'LifeFlow Premium - Actif',
    'settings.defaultUser': 'Utilisateur LifeFlow',
    'settings.editProfile': 'Modifier le profil',
    
    // Budget
    'budget.title': 'Budget',
    'budget.income': 'Revenus',
    'budget.expenses': 'Dépenses',
    'budget.balance': 'Solde',
    'budget.addTransaction': 'Ajouter une transaction',
    'budget.amount': 'Montant',
    'budget.category': 'Catégorie',
    'budget.description': 'Description',
    
    // Calendar
    'calendar.title': 'Calendrier',
    'calendar.today': 'Aujourd\'hui',
    'calendar.week': 'Semaine',
    'calendar.month': 'Mois',
    'calendar.addEvent': 'Ajouter un événement',
    'calendar.eventTitle': 'Titre de l\'événement',
    'calendar.startTime': 'Heure de début',
    'calendar.endTime': 'Heure de fin',
    
    // Habits
    'habits.title': 'Habitudes',
    'habits.addHabit': 'Ajouter une habitude',
    'habits.habitName': 'Nom de l\'habitude',
    'habits.frequency': 'Fréquence',
    'habits.daily': 'Quotidien',
    'habits.weekly': 'Hebdomadaire',
    'habits.monthly': 'Mensuel',
    'habits.streak': 'Série',
    
    // Notes
    'notes.title': 'Notes',
    'notes.addNote': 'Ajouter une note',
    'notes.noteTitle': 'Titre de la note',
    'notes.noteContent': 'Contenu de la note',
    'notes.search': 'Rechercher des notes',
    
    // Shopping
    'shopping.title': 'Courses',
    'shopping.addItem': 'Ajouter un article',
    'shopping.itemName': 'Nom de l\'article',
    'shopping.quantity': 'Quantité',
    'shopping.price': 'Prix',
    'shopping.category': 'Catégorie',
    'shopping.purchased': 'Acheté',
    
    // Chat
    'chat.title': 'Chat IA',
    'chat.typeMessage': 'Tapez un message...',
    'chat.send': 'Envoyer',
    'chat.aiAssistant': 'Assistant IA',
    
    // Mood Tracker
    'mood.title': 'Humeur',
    'mood.today': 'Humeur d\'aujourd\'hui',
    'mood.addEntry': 'Ajouter une entrée',
    'mood.note': 'Note',
    
    // Meal Planner
    'meals.title': 'Planificateur de repas',
    'meals.addMeal': 'Ajouter un repas',
    'meals.mealName': 'Nom du repas',
    'meals.calories': 'Calories',
    'meals.mealType': 'Type de repas',
    
    // Errors
    'error.network': 'Erreur réseau',
    'error.auth': 'Erreur d\'authentification',
    'error.validation': 'Erreur de validation',
    'error.unknown': 'Erreur inconnue',
    'error.emailRequired': 'Email requis',
    'error.passwordRequired': 'Mot de passe requis',
    'error.invalidEmail': 'Email invalide',
    'error.weakPassword': 'Mot de passe trop faible',
    
    // Success messages
    'success.saved': 'Enregistré',
    'success.deleted': 'Supprimé',
    'success.updated': 'Mis à jour',
    'success.added': 'Ajouté',
    
    // Time
    'time.today': 'Aujourd\'hui',
    'time.yesterday': 'Hier',
    'time.tomorrow': 'Demain',
    'time.thisWeek': 'Cette semaine',
    'time.thisMonth': 'Ce mois',
    'time.lastWeek': 'La semaine dernière',
    'time.lastMonth': 'Le mois dernier',
  },
  es: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.tasks': 'Tareas',
    'nav.shopping': 'Compras',
    'nav.habits': 'Hábitos',
    'nav.notes': 'Notas',
    'nav.budget': 'Presupuesto',
    'nav.plan': 'Plan',
    'nav.calendar': 'Calendario',
    'nav.meals': 'Comidas',
    'nav.mood': 'Estado de ánimo',
    'nav.chat': 'Chat',
    'nav.settings': 'Configuración',
    
    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.loginWithGoogle': 'Iniciar sesión con Google',
    'auth.createAccount': 'Crear cuenta',
    'auth.alreadyHaveAccount': '¿Ya tienes una cuenta?',
    'auth.dontHaveAccount': '¿No tienes una cuenta?',
    'auth.signUp': 'Registrarse',
    'auth.signIn': 'Iniciar sesión',
    
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.close': 'Cerrar',
    'common.confirm': 'Confirmar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.done': 'Hecho',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    
    // Dashboard
    'dashboard.title': 'Bienvenido de nuevo',
    'dashboard.subtitle': 'Tu asistente de productividad personal',
    'dashboard.todayTasks': 'Tareas de hoy',
    'dashboard.upcomingEvents': 'Próximos eventos',
    'dashboard.quickActions': 'Acciones rápidas',
    'dashboard.recentNotes': 'Notas recientes',
    'dashboard.budgetOverview': 'Resumen del presupuesto',
    'dashboard.habitProgress': 'Progreso de hábitos',
    
    // Tasks
    'tasks.title': 'Tareas',
    'tasks.addTask': 'Agregar tarea',
    'tasks.taskTitle': 'Título de la tarea',
    'tasks.description': 'Descripción',
    'tasks.dueDate': 'Fecha de vencimiento',
    'tasks.priority': 'Prioridad',
    'tasks.status': 'Estado',
    'tasks.high': 'Alto',
    'tasks.medium': 'Medio',
    'tasks.low': 'Bajo',
    'tasks.completed': 'Completado',
    'tasks.pending': 'Pendiente',
    'tasks.inProgress': 'En progreso',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Personaliza LifeFlow según tus necesidades y preferencias.',
    'settings.profile': 'Perfil',
    'settings.appearance': 'Apariencia',
    'settings.notifications': 'Notificaciones',
    'settings.privacy': 'Privacidad',
    'settings.language': 'Idioma',
    'settings.ai': 'Inteligencia Artificial',
    'settings.ai.subtitle': 'Gestiona el poder de la IA y los asistentes',
    'settings.notifications.subtitle': 'Gestiona alertas y recordatorios',
    'settings.appearance.subtitle': 'Tema oscuro, tema claro y colores de acento',
    'settings.theme': 'Tema',
    'settings.export': 'Exportar datos',
    'settings.about': 'Acerca de',
    'settings.help': 'Ayuda',
    'settings.subscription': 'Suscripción',
    'settings.subscription.subtitle': 'LifeFlow Premium - Activo',
    'settings.defaultUser': 'Usuario LifeFlow',
    'settings.editProfile': 'Editar perfil',
    
    // Budget
    'budget.title': 'Presupuesto',
    'budget.income': 'Ingresos',
    'budget.expenses': 'Gastos',
    'budget.balance': 'Saldo',
    'budget.addTransaction': 'Agregar transacción',
    'budget.amount': 'Cantidad',
    'budget.category': 'Categoría',
    'budget.description': 'Descripción',
    
    // Calendar
    'calendar.title': 'Calendario',
    'calendar.today': 'Hoy',
    'calendar.week': 'Semana',
    'calendar.month': 'Mes',
    'calendar.addEvent': 'Agregar evento',
    'calendar.eventTitle': 'Título del evento',
    'calendar.startTime': 'Hora de inicio',
    'calendar.endTime': 'Hora de fin',
    
    // Habits
    'habits.title': 'Hábitos',
    'habits.addHabit': 'Agregar hábito',
    'habits.habitName': 'Nombre del hábito',
    'habits.frequency': 'Frecuencia',
    'habits.daily': 'Diario',
    'habits.weekly': 'Semanal',
    'habits.monthly': 'Mensual',
    'habits.streak': 'Racha',
    
    // Notes
    'notes.title': 'Notas',
    'notes.addNote': 'Agregar nota',
    'notes.noteTitle': 'Título de la nota',
    'notes.noteContent': 'Contenido de la nota',
    'notes.search': 'Buscar notas',
    
    // Shopping
    'shopping.title': 'Compras',
    'shopping.addItem': 'Agregar artículo',
    'shopping.itemName': 'Nombre del artículo',
    'shopping.quantity': 'Cantidad',
    'shopping.price': 'Precio',
    'shopping.category': 'Categoría',
    'shopping.purchased': 'Comprado',
    
    // Chat
    'chat.title': 'Chat IA',
    'chat.typeMessage': 'Escribe un mensaje...',
    'chat.send': 'Enviar',
    'chat.aiAssistant': 'Asistente IA',
    
    // Mood Tracker
    'mood.title': 'Estado de ánimo',
    'mood.today': 'Estado de ánimo de hoy',
    'mood.addEntry': 'Agregar entrada',
    'mood.note': 'Nota',
    
    // Meal Planner
    'meals.title': 'Planificador de comidas',
    'meals.addMeal': 'Agregar comida',
    'meals.mealName': 'Nombre de la comida',
    'meals.calories': 'Calorías',
    'meals.mealType': 'Tipo de comida',
    
    // Errors
    'error.network': 'Error de red',
    'error.auth': 'Error de autenticación',
    'error.validation': 'Error de validación',
    'error.unknown': 'Error desconocido',
    'error.emailRequired': 'Email requerido',
    'error.passwordRequired': 'Contraseña requerida',
    'error.invalidEmail': 'Email inválido',
    'error.weakPassword': 'Contraseña muy débil',
    
    // Success messages
    'success.saved': 'Guardado',
    'success.deleted': 'Eliminado',
    'success.updated': 'Actualizado',
    'success.added': 'Agregado',
    
    // Time
    'time.today': 'Hoy',
    'time.yesterday': 'Ayer',
    'time.tomorrow': 'Mañana',
    'time.thisWeek': 'Esta semana',
    'time.thisMonth': 'Este mes',
    'time.lastWeek': 'La semana pasada',
    'time.lastMonth': 'El mes pasado',
  },
  it: {
    // Navigation
    'nav.dashboard': 'Pannello',
    'nav.tasks': 'Compiti',
    'nav.shopping': 'Spesa',
    'nav.habits': 'Abitudini',
    'nav.notes': 'Note',
    'nav.budget': 'Budget',
    'nav.plan': 'Piano',
    'nav.calendar': 'Calendario',
    'nav.meals': 'Pasti',
    'nav.mood': 'Umore',
    'nav.chat': 'Chat',
    'nav.settings': 'Impostazioni',
    
    // Auth
    'auth.login': 'Accedi',
    'auth.register': 'Registrati',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Password dimenticata?',
    'auth.loginWithGoogle': 'Accedi con Google',
    'auth.createAccount': 'Crea account',
    'auth.alreadyHaveAccount': 'Hai già un account?',
    'auth.dontHaveAccount': 'Non hai un account?',
    'auth.signUp': 'Registrati',
    'auth.signIn': 'Accedi',
    
    // Common
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.delete': 'Elimina',
    'common.edit': 'Modifica',
    'common.add': 'Aggiungi',
    'common.loading': 'Caricamento...',
    'common.error': 'Errore',
    'common.success': 'Successo',
    'common.close': 'Chiudi',
    'common.confirm': 'Conferma',
    'common.back': 'Indietro',
    'common.next': 'Avanti',
    'common.done': 'Fatto',
    'common.search': 'Cerca',
    'common.filter': 'Filtra',
    'common.sort': 'Ordina',
    
    // Dashboard
    'dashboard.title': 'Bentornato',
    'dashboard.subtitle': 'Il tuo assistente personale di produttività',
    'dashboard.todayTasks': 'Compiti di oggi',
    'dashboard.upcomingEvents': 'Eventi imminenti',
    'dashboard.quickActions': 'Azioni rapide',
    'dashboard.recentNotes': 'Note recenti',
    'dashboard.budgetOverview': 'Riepilogo budget',
    'dashboard.habitProgress': 'Progresso abitudini',
    
    // Tasks
    'tasks.title': 'Compiti',
    'tasks.addTask': 'Aggiungi compito',
    'tasks.taskTitle': 'Titolo compito',
    'tasks.description': 'Descrizione',
    'tasks.dueDate': 'Scadenza',
    'tasks.priority': 'Priorità',
    'tasks.status': 'Stato',
    'tasks.high': 'Alto',
    'tasks.medium': 'Medio',
    'tasks.low': 'Basso',
    'tasks.completed': 'Completato',
    'tasks.pending': 'In sospeso',
    'tasks.inProgress': 'In corso',
    
    // Settings
    'settings.title': 'Impostazioni',
    'settings.subtitle': 'Personalizza LifeFlow secondo le tue esigenze e preferenze.',
    'settings.profile': 'Profilo',
    'settings.appearance': 'Aspetto',
    'settings.notifications': 'Notifiche',
    'settings.privacy': 'Privacy',
    'settings.language': 'Lingua',
    'settings.ai': 'Intelligenza Artificiale',
    'settings.ai.subtitle': 'Gestisci la potenza dell\'IA e gli assistenti',
    'settings.notifications.subtitle': 'Gestisci avvisi e promemorie',
    'settings.appearance.subtitle': 'Tema scuro, tema chiaro e colori di accento',
    'settings.theme': 'Tema',
    'settings.export': 'Esporta dati',
    'settings.about': 'Informazioni',
    'settings.help': 'Aiuto',
    'settings.subscription': 'Abbonamento',
    'settings.subscription.subtitle': 'LifeFlow Premium - Attivo',
    'settings.defaultUser': 'Utente LifeFlow',
    'settings.editProfile': 'Modifica profilo',
    
    // Budget
    'budget.title': 'Budget',
    'budget.income': 'Entrate',
    'budget.expenses': 'Uscite',
    'budget.balance': 'Saldo',
    'budget.addTransaction': 'Aggiungi transazione',
    'budget.amount': 'Importo',
    'budget.category': 'Categoria',
    'budget.description': 'Descrizione',
    
    // Calendar
    'calendar.title': 'Calendario',
    'calendar.today': 'Oggi',
    'calendar.week': 'Settimana',
    'calendar.month': 'Mese',
    'calendar.addEvent': 'Aggiungi evento',
    'calendar.eventTitle': 'Titolo evento',
    'calendar.startTime': 'Ora inizio',
    'calendar.endTime': 'Ora fine',
    
    // Habits
    'habits.title': 'Abitudini',
    'habits.addHabit': 'Aggiungi abitudine',
    'habits.habitName': 'Nome abitudine',
    'habits.frequency': 'Frequenza',
    'habits.daily': 'Quotidiano',
    'habits.weekly': 'Settimanale',
    'habits.monthly': 'Mensile',
    'habits.streak': 'Serie',
    
    // Notes
    'notes.title': 'Note',
    'notes.addNote': 'Aggiungi nota',
    'notes.noteTitle': 'Titolo nota',
    'notes.noteContent': 'Contenuto nota',
    'notes.search': 'Cerca note',
    
    // Shopping
    'shopping.title': 'Spesa',
    'shopping.addItem': 'Aggiungi articolo',
    'shopping.itemName': 'Nome articolo',
    'shopping.quantity': 'Quantità',
    'shopping.price': 'Prezzo',
    'shopping.category': 'Categoria',
    'shopping.purchased': 'Acquistato',
    
    // Chat
    'chat.title': 'Chat IA',
    'chat.typeMessage': 'Digita un messaggio...',
    'chat.send': 'Invia',
    'chat.aiAssistant': 'Assistente IA',
    
    // Mood Tracker
    'mood.title': 'Umore',
    'mood.today': 'Umore di oggi',
    'mood.addEntry': 'Aggiungi voce',
    'mood.note': 'Nota',
    
    // Meal Planner
    'meals.title': 'Pianificatore pasti',
    'meals.addMeal': 'Aggiungi pasto',
    'meals.mealName': 'Nome pasto',
    'meals.calories': 'Calorie',
    'meals.mealType': 'Tipo pasto',
    
    // Errors
    'error.network': 'Errore di rete',
    'error.auth': 'Errore di autenticazione',
    'error.validation': 'Errore di validazione',
    'error.unknown': 'Errore sconosciuto',
    'error.emailRequired': 'Email richiesta',
    'error.passwordRequired': 'Password richiesta',
    'error.invalidEmail': 'Email non valida',
    'error.weakPassword': 'Password troppo debole',
    
    // Success messages
    'success.saved': 'Salvato',
    'success.deleted': 'Eliminato',
    'success.updated': 'Aggiornato',
    'success.added': 'Aggiunto',
    
    // Time
    'time.today': 'Oggi',
    'time.yesterday': 'Ieri',
    'time.tomorrow': 'Domani',
    'time.thisWeek': 'Questa settimana',
    'time.thisMonth': 'Questo mese',
    'time.lastWeek': 'La settimana scorsa',
    'time.lastMonth': 'Il mese scorso',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage first (SSR safe)
    const saved = typeof window !== 'undefined'
      ? localStorage.getItem('lifeflow-language')
      : null;
    if (saved && Object.keys(translations).includes(saved)) {
      return saved as Language;
    }
    
    // Check browser language (SSR safe)
    const browserLang = typeof navigator !== 'undefined'
      ? navigator.language.split('-')[0]
      : 'en';
    const supportedLangs = Object.keys(translations);
    
    if (supportedLangs.includes(browserLang)) {
      return browserLang as Language;
    }
    
    // Default to Polish
    return 'pl';
  });

  useEffect(() => {
    localStorage.setItem('lifeflow-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string): string => {
    const translation = translations[language]?.[key];
    if (!translation) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Translation missing for key: ${key} in language: ${language}`);
      }
      // Fallback to Polish if available
      const fallback = translations.pl?.[key];
      return fallback || key;
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
