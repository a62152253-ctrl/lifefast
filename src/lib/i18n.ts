import { useLanguage } from '../context/LanguageContext';

// Hook for easy translation in components
export const useTranslation = () => {
  const { t } = useLanguage();
  return { t };
};

// Helper function for translation outside React components
export const translate = (key: string, language?: string): string => {
  // This is a fallback for non-React contexts
  // In most cases, use the useTranslation hook instead
  const translations: Record<string, Record<string, string>> = {
    pl: {
      'common.loading': 'Ładowanie...',
      'common.save': 'Zapisz',
      'common.cancel': 'Anuluj',
      'common.delete': 'Usuń',
      'common.edit': 'Edytuj',
      'common.add': 'Dodaj',
      'common.error': 'Błąd',
      'common.success': 'Sukces',
      'nav.dashboard': 'Panel',
      'nav.tasks': 'Zadania',
      'nav.settings': 'Ustawienia',
      'settings.language': 'Język i Region',
      'settings.theme': 'Motyw',
      'settings.profile': 'Profil',
      'settings.notifications': 'Powiadomienia',
    },
    en: {
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.error': 'Error',
      'common.success': 'Success',
      'nav.dashboard': 'Dashboard',
      'nav.tasks': 'Tasks',
      'nav.settings': 'Settings',
      'settings.language': 'Language & Region',
      'settings.theme': 'Theme',
      'settings.profile': 'Profile',
      'settings.notifications': 'Notifications',
    },
    de: {
      'common.loading': 'Laden...',
      'common.save': 'Speichern',
      'common.cancel': 'Abbrechen',
      'common.delete': 'Löschen',
      'common.edit': 'Bearbeiten',
      'common.add': 'Hinzufügen',
      'common.error': 'Fehler',
      'common.success': 'Erfolg',
      'nav.dashboard': 'Dashboard',
      'nav.tasks': 'Aufgaben',
      'nav.settings': 'Einstellungen',
      'settings.language': 'Sprache & Region',
      'settings.theme': 'Theme',
      'settings.profile': 'Profil',
      'settings.notifications': 'Benachrichtigungen',
    },
    fr: {
      'common.loading': 'Chargement...',
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.delete': 'Supprimer',
      'common.edit': 'Modifier',
      'common.add': 'Ajouter',
      'common.error': 'Erreur',
      'common.success': 'Succès',
      'nav.dashboard': 'Tableau de bord',
      'nav.tasks': 'Tâches',
      'nav.settings': 'Paramètres',
      'settings.language': 'Langue et Région',
      'settings.theme': 'Thème',
      'settings.profile': 'Profil',
      'settings.notifications': 'Notifications',
    },
    es: {
      'common.loading': 'Cargando...',
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.add': 'Agregar',
      'common.error': 'Error',
      'common.success': 'Éxito',
      'nav.dashboard': 'Panel',
      'nav.tasks': 'Tareas',
      'nav.settings': 'Configuración',
      'settings.language': 'Idioma y Región',
      'settings.theme': 'Tema',
      'settings.profile': 'Perfil',
      'settings.notifications': 'Notificaciones',
    },
    it: {
      'common.loading': 'Caricamento...',
      'common.save': 'Salva',
      'common.cancel': 'Annulla',
      'common.delete': 'Elimina',
      'common.edit': 'Modifica',
      'common.add': 'Aggiungi',
      'common.error': 'Errore',
      'common.success': 'Successo',
      'nav.dashboard': 'Pannello',
      'nav.tasks': 'Compiti',
      'nav.settings': 'Impostazioni',
      'settings.language': 'Lingua e Regione',
      'settings.theme': 'Tema',
      'settings.profile': 'Profilo',
      'settings.notifications': 'Notifiche',
    },
  };

  const lang = language || 'pl';
  return translations[lang]?.[key] || translations.pl[key] || key;
};

// Date formatting utilities for different languages
export const formatDate = (date: Date, language: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(language, options).format(date);
  } catch {
    // Fallback to simple formatting
    return date.toLocaleDateString();
  }
};

// Time formatting utilities for different languages
export const formatTime = (date: Date, language: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  try {
    return new Intl.DateTimeFormat(language, options).format(date);
  } catch {
    // Fallback to simple formatting
    return date.toLocaleTimeString();
  }
};

// Currency formatting for different languages
export const formatCurrency = (amount: number, language: string, currency: string = 'PLN'): string => {
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // Fallback to simple formatting
    return `${amount.toFixed(2)} ${currency}`;
  }
};

// Number formatting for different languages
export const formatNumber = (number: number, language: string): string => {
  try {
    return new Intl.NumberFormat(language).format(number);
  } catch {
    // Fallback to simple formatting
    return number.toString();
  }
};
