import React from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Server, Database, Lock } from 'lucide-react';
import { Button } from './CommonUI';

interface ErrorStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon,
  title,
  message,
  action,
  className = ""
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
      {icon || <AlertTriangle size={32} className="text-gray-400" />}
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    {message && <p className="text-sm text-gray-600 mb-6 max-w-sm">{message}</p>}
    {action && (
      <Button 
        variant="primary" 
        onClick={action.onClick}
        className="min-w-[140px]"
      >
        {action.label}
      </Button>
    )}
  </div>
);

export const OfflineError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    icon={<WifiOff size={32} className="text-gray-400" />}
    title="Brak połączenia z internetem"
    message="Sprawdź połączenie sieciowe i spróbuj ponownie"
    action={onRetry ? { label: "Spróbuj ponownie", onClick: onRetry } : undefined}
  />
);

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    icon={<Wifi size={32} className="text-amber-500" />}
    title="Problem z połączeniem"
    message="Nie można połączyć się z serwerem. Spróbuj ponownie za chwilę."
    action={onRetry ? { label: "Odśwież", onClick: onRetry } : undefined}
  />
);

export const ServerError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    icon={<Server size={32} className="text-red-500" />}
    title="Błąd serwera"
    message="Coś poszło nie tak po naszej stronie. Pracujemy nad tym!"
    action={onRetry ? { label: "Spróbuj ponownie", onClick: onRetry } : undefined}
  />
);

export const DatabaseError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    icon={<Database size={32} className="text-red-500" />}
    title="Błąd bazy danych"
    message="Nie można załadować danych. Spróbuj odświeżyć stronę."
    action={onRetry ? { label: "Odśwież", onClick: onRetry } : undefined}
  />
);

export const PermissionError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    icon={<Lock size={32} className="text-amber-500" />}
    title="Brak uprawnień"
    message="Nie masz dostępu do tej funkcji. Skontaktuj się z administratorem."
    action={onRetry ? { label: "Spróbuj ponownie", onClick: onRetry } : undefined}
  />
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ icon, title, message, action, className = "" }) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    {message && <p className="text-sm text-gray-500 mb-6 max-w-sm">{message}</p>}
    {action && (
      <Button 
        variant="primary" 
        onClick={action.onClick}
        className="min-w-[140px]"
      >
        {action.label}
      </Button>
    )}
  </div>
);

export const LoadingState: React.FC<{ message?: string }> = ({ message = "Ładowanie..." }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-sm text-gray-600">{message}</p>
  </div>
);
