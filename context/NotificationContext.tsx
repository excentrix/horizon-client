'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useNotificationsSocket } from '@/hooks/use-notifications';
import type { ToastNotification } from '@/types';
import type { StageStreamEvent } from '@/lib/analysis-stage';

interface NotificationContextType {
  status: string;
  error: string | null;
  notifications: ToastNotification[];
  analysisEvents: StageStreamEvent[];
  unreadCount: number;
  latestEvent: Record<string, unknown> | null;
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
