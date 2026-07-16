import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACADEMY_MODULES, BASE_UNLOCK, UNLOCK_PER_MODULE } from '../data/academy';

const STORAGE_KEY = 'univest.academy.v1';

interface EducationValue {
  completedIds: string[];
  isCompleted: (moduleId: string) => boolean;
  completeModule: (moduleId: string) => void;
  /** Fraction of the statutory limit currently unlocked (0.6 → 1.0). */
  unlockFactor: number;
  /** The investor's usable limit right now. */
  effectiveLimit: (statutoryLimit: number) => number;
}

const EducationContext = createContext<EducationValue>({
  completedIds: [],
  isCompleted: () => false,
  completeModule: () => {},
  unlockFactor: BASE_UNLOCK,
  effectiveLimit: (l) => Math.round(l * BASE_UNLOCK),
});

export function EducationProvider({ children }: { children: React.ReactNode }) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) setCompletedIds(parsed.filter((x) => typeof x === 'string'));
        }
      })
      .catch(() => {});
  }, []);

  const completeModule = useCallback((moduleId: string) => {
    setCompletedIds((cur) => {
      if (cur.includes(moduleId)) return cur;
      const next = [...cur, moduleId];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<EducationValue>(() => {
    const unlockFactor = Math.min(
      1,
      BASE_UNLOCK + UNLOCK_PER_MODULE * Math.min(completedIds.length, ACADEMY_MODULES.length),
    );
    return {
      completedIds,
      isCompleted: (id) => completedIds.includes(id),
      completeModule,
      unlockFactor,
      effectiveLimit: (statutoryLimit) => Math.round(statutoryLimit * unlockFactor),
    };
  }, [completedIds, completeModule]);

  return <EducationContext.Provider value={value}>{children}</EducationContext.Provider>;
}

export function useEducation(): EducationValue {
  return useContext(EducationContext);
}
