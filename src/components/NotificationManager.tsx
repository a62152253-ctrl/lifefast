import React, { useEffect, useRef } from 'react';
import { useSmartNotifications } from '../hooks/useSmartNotifications';
import { useToast } from '../context/ToastContext';

/**
 * Runs in the background — shows a toast for the most critical
 * smart notification once per session (on first load).
 */
export default function NotificationManager() {
  const { notifications } = useSmartNotifications();
  const { showToast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current || notifications.length === 0) return;

    // Pick the most severe one: error > warning > info
    const priority = ['error', 'warning', 'info'] as const;
    const top = priority
      .map(sev => notifications.find(n => n.severity === sev))
      .find(Boolean);

    if (!top) return;

    shownRef.current = true;

    const toastType =
      top.severity === 'error' ? 'error' :
      top.severity === 'warning' ? 'warning' :
      'info';

    showToast({ type: toastType, message: `${top.title}: ${top.message}` });
  }, [notifications, showToast]);

  return null;
}
