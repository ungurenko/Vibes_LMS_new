import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { fetchWithAuthGet, fetchWithAuthPatch } from '@/lib/fetchWithAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: 'info' | 'warning' | 'success' | 'reminder';
  is_read: boolean;
  created_at: string;
}

interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

const typeConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  reminder: { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
};

export const NotificationBell: React.FC = () => {
  const [data, setData] = useState<NotificationsData>({ notifications: [], unreadCount: 0 });
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await fetchWithAuthGet<NotificationsData>('/api/notifications');
      setData(result);
    } catch (err) {
      // Silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetchWithAuthPatch<any>(`/api/notifications?id=${id}`, {});
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchWithAuthPatch<any>('/api/notifications?all=true', {});
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days < 7) return `${days} дн`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <Bell size={20} />
          {data.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {data.unreadCount > 9 ? '9+' : data.unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b border-zinc-200 dark:border-white/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">Уведомления</SheetTitle>
            {data.unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Прочитать все
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
          {data.notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Bell size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {data.notifications.map((notification) => {
                const config = typeConfig[notification.type] || typeConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    className={`px-6 py-4 flex gap-3 transition-colors ${
                      !notification.is_read ? 'bg-purple-50/50 dark:bg-purple-500/5' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-bold ${!notification.is_read ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-zinc-400 shrink-0">{formatTime(notification.created_at)}</span>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{notification.message}</p>
                      )}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-2 text-[11px] text-purple-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Check size={12} />
                          Прочитано
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
