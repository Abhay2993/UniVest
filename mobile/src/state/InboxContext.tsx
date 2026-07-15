import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIVITY_ITEMS } from '../data/mock';
import { ActivityItem } from '../types';

const STORAGE_KEY = 'univest.inbox.read.v1';

interface InboxValue {
  items: ActivityItem[];
  unreadCount: number;
  isRead: (id: string) => boolean;
  markAllRead: () => void;
}

const InboxContext = createContext<InboxValue>({
  items: [],
  unreadCount: 0,
  isRead: () => true,
  markAllRead: () => {},
});

/**
 * The activity inbox: milestone attestations, auction clearings, K-1s,
 * closing reminders, distributions. Items arrive by server push in
 * production; read-state persists on device.
 */
export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) setReadIds(parsed.filter((x) => typeof x === 'string'));
        }
      })
      .catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    const all = ACTIVITY_ITEMS.map((i) => i.id);
    setReadIds(all);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all)).catch(() => {});
  }, []);

  const value = useMemo<InboxValue>(
    () => ({
      items: ACTIVITY_ITEMS,
      unreadCount: ACTIVITY_ITEMS.filter((i) => !readIds.includes(i.id)).length,
      isRead: (id) => readIds.includes(id),
      markAllRead,
    }),
    [readIds, markAllRead],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxValue {
  return useContext(InboxContext);
}
