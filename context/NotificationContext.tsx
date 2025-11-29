'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useNotificationsSocket } from '@/hooks/use-notifications';
import type { ToastNotification } from '@/types';

interface NotificationContextType {
  status: string;
  error: string | null;
  notifications: ToastNotification[];
  unreadCount: number;
  markNotificationRead: (notificationId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const notificationSocket = useNotificationsSocket();

  return (
    <NotificationContext.Provider value={notificationSocket}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
