import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Startup } from '../types';
import { cancelScheduledAlert, scheduleClosingSoonAlert } from '../services/notifications';

const STORAGE_KEY = 'univest.watchlist.v1';

interface StoredWatchlist {
  /** startupId → scheduled closing-soon notification id (null if none). */
  watched: Record<string, string | null>;
  followedUniversities: string[];
}

interface WatchlistValue {
  watchedIds: string[];
  isWatched: (startupId: string) => boolean;
  /** Adds/removes an offering; schedules or cancels its closing-soon alert. */
  toggleWatch: (startup: Startup) => Promise<void>;
  followedUniversityIds: string[];
  isFollowing: (universityId: string) => boolean;
  toggleFollow: (universityId: string) => void;
}

const WatchlistContext = createContext<WatchlistValue>({
  watchedIds: [],
  isWatched: () => false,
  toggleWatch: async () => {},
  followedUniversityIds: [],
  isFollowing: () => false,
  toggleFollow: () => {},
});

function persist(watched: Record<string, string | null>, followedUniversities: string[]): void {
  const payload: StoredWatchlist = { watched, followedUniversities };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watched, setWatched] = useState<Record<string, string | null>>({});
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<StoredWatchlist>;
        if (stored.watched && typeof stored.watched === 'object') setWatched(stored.watched);
        if (Array.isArray(stored.followedUniversities)) setFollowed(stored.followedUniversities);
      })
      .catch(() => {});
  }, []);

  const toggleWatch = useCallback(
    async (startup: Startup) => {
      if (startup.id in watched) {
        const notificationId = watched[startup.id];
        if (notificationId) void cancelScheduledAlert(notificationId);
        const next = { ...watched };
        delete next[startup.id];
        setWatched(next);
        persist(next, followed);
      } else {
        const notificationId = await scheduleClosingSoonAlert(startup);
        const next = { ...watched, [startup.id]: notificationId };
        setWatched(next);
        persist(next, followed);
      }
    },
    [watched, followed],
  );

  const toggleFollow = useCallback(
    (universityId: string) => {
      const next = followed.includes(universityId)
        ? followed.filter((id) => id !== universityId)
        : [...followed, universityId];
      setFollowed(next);
      persist(watched, next);
    },
    [watched, followed],
  );

  const value = useMemo<WatchlistValue>(
    () => ({
      watchedIds: Object.keys(watched),
      isWatched: (startupId) => startupId in watched,
      toggleWatch,
      followedUniversityIds: followed,
      isFollowing: (universityId) => followed.includes(universityId),
      toggleFollow,
    }),
    [watched, followed, toggleWatch, toggleFollow],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  return useContext(WatchlistContext);
}
