import { useState, useEffect, useCallback } from 'react';
import type {
  SkillDomain,
  DomainSkillGroup,
  PlaylistItem,
  PlaylistConfig,
  DayMode,
} from '../types/skills';
import {
  getSkillDomains,
  getStudentSkillSummary,
  getPlaylistItems,
  completePlaylistItem,
  skipPlaylistItem,
  startPlaylistItem,
  getPlaylistConfig,
  updatePlaylistConfig,
  setDayMode as setDayModeService,
  setDailySkillCap as setDailySkillCapService,
  updateFocusSkills as updateFocusSkillsService,
} from '../services/skills.service';

export function useSkillDomains() {
  const [domains, setDomains] = useState<SkillDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getSkillDomains();
        if (!cancelled) setDomains(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load domains');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { domains, loading, error };
}

export function useStudentSkillProfile(studentId: string) {
  const [groups, setGroups] = useState<DomainSkillGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentSkillSummary(studentId);
      setGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load skill profile');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}

export function usePlaylist(studentId: string, date?: string) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPlaylistItems(studentId, date);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [studentId, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const complete = useCallback(
    async (itemId: string, score: number) => {
      await completePlaylistItem(itemId, score);
      await refresh();
    },
    [refresh]
  );

  const skip = useCallback(
    async (itemId: string) => {
      await skipPlaylistItem(itemId);
      await refresh();
    },
    [refresh]
  );

  const start = useCallback(
    async (itemId: string) => {
      await startPlaylistItem(itemId);
      await refresh();
    },
    [refresh]
  );

  return { items, loading, error, refresh, complete, skip, start };
}

export function usePlaylistConfig(studentId: string) {
  const [config, setConfig] = useState<PlaylistConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPlaylistConfig(studentId);
      setConfig(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist config');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (updates: Partial<PlaylistConfig>) => {
      const updated = await updatePlaylistConfig(studentId, updates);
      setConfig(updated);
    },
    [studentId]
  );

  const changeDayMode = useCallback(
    async (mode: DayMode) => {
      await setDayModeService(studentId, mode);
      await refresh();
    },
    [studentId, refresh]
  );

  const changeDailySkillCap = useCallback(
    async (cap: number) => {
      await setDailySkillCapService(studentId, cap);
      await refresh();
    },
    [studentId, refresh]
  );

  const changeFocusSkills = useCallback(
    async (skillIds: string[]) => {
      await updateFocusSkillsService(studentId, skillIds);
      await refresh();
    },
    [studentId, refresh]
  );

  return { config, loading, error, refresh, update, changeDayMode, changeDailySkillCap, changeFocusSkills };
}
