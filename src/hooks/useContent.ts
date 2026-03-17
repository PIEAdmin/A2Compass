import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as contentService from '../services/content.service';
import type { Lesson, Activity, ContentLibraryItem, CurriculumUnit, StudentAssignment } from '../types/content';

export function useLessons(filters?: { subject_id?: string; status?: string; search?: string }) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setLessons(await contentService.getLessons(user.id, filters)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, filters?.subject_id, filters?.status, filters?.search]);

  useEffect(() => { reload(); }, [reload]);
  return { lessons, loading, reload };
}

export function useActivities(filters?: { subject_id?: string; format_id?: string; status?: string }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setActivities(await contentService.getActivities(user.id, filters)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, filters?.subject_id, filters?.format_id, filters?.status]);

  useEffect(() => { reload(); }, [reload]);
  return { activities, loading, reload };
}

export function useStudentAssignments(date?: string) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setAssignments(await contentService.getStudentAssignments(user.id, date)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, date]);

  useEffect(() => { reload(); }, [reload]);
  return { assignments, loading, reload };
}

export function useReferenceData() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formats, setFormats] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, f, t] = await Promise.all([contentService.getSubjects(), contentService.getLearningFormats(), contentService.getTiers()]);
        setSubjects(s || []); setFormats(f || []); setTiers(t || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return { subjects, formats, tiers, loading };
}
