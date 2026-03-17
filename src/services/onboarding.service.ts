import { supabase } from '../../services/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OnboardingState {
  id: string;
  student_id: string;
  welcome_seen: boolean;
  avatar_complete: boolean;
  display_name_complete: boolean;
  color_complete: boolean;
  interests_complete: boolean;
  questions_complete: boolean;
  tour_complete: boolean;
  orientation_complete: boolean;
  warm_activities_unlocked: boolean;
  assessment_scheduled: boolean;
  assessment_completed: boolean;
  playlist_unlocked: boolean;
  onboarding_mode: string | null;
}

export interface StudentPreferences {
  display_name?: string;
  avatar_config?: Record<string, unknown>;
  favorite_color?: string;
  interests?: string[];
  learning_style?: string;
  good_at?: string;
  want_to_learn?: string;
  makes_me_smile?: string;
}

export interface WarmActivity {
  id: string;
  slug: string;
  title: string;
  description: string;
  activity_type: 'exploration' | 'creative_prompt' | 'scavenger_hunt' | 'memory_game' | 'story' | 'choice_board';
  content: Record<string, unknown>;
  interests: string[];
  min_age: number | null;
  max_age: number | null;
}

export interface WarmActivityProgress {
  id: string;
  student_id: string;
  activity_id: string;
  status: string;
  response_data: Record<string, unknown> | null;
  stars_earned: number;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  earned_at: string;
  context: Record<string, unknown> | null;
  badges: Badge;
}

export interface AssessmentBooking {
  id: string;
  student_id: string;
  parent_id: string;
  teacher_id: string | null;
  requested_date: string;
  requested_time_slot: string;
  notes: string | null;
  status: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Onboarding State                                                   */
/* ------------------------------------------------------------------ */

export async function getOnboardingState(studentId: string): Promise<OnboardingState> {
  const { data, error } = await supabase
    .from('student_onboarding')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch onboarding state: ${error.message}`);

  if (data) return data as OnboardingState;

  // Create a new record if none exists
  const { data: created, error: createErr } = await supabase
    .from('student_onboarding')
    .insert({ student_id: studentId })
    .select('*')
    .single();

  if (createErr) throw new Error(`Failed to create onboarding state: ${createErr.message}`);
  return created as OnboardingState;
}

export async function updateOnboardingStep(
  studentId: string,
  step: string,
  value: boolean | string,
): Promise<void> {
  const { error } = await supabase
    .from('student_onboarding')
    .update({ [step]: value })
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to update onboarding step "${step}": ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Preferences                                                        */
/* ------------------------------------------------------------------ */

export async function savePreferences(
  studentId: string,
  prefs: StudentPreferences,
): Promise<void> {
  const { error } = await supabase
    .from('student_preferences')
    .upsert({ student_id: studentId, ...prefs }, { onConflict: 'student_id' });

  if (error) throw new Error(`Failed to save preferences: ${error.message}`);
}

export async function getPreferences(studentId: string): Promise<StudentPreferences | null> {
  const { data, error } = await supabase
    .from('student_preferences')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch preferences: ${error.message}`);
  return data as StudentPreferences | null;
}

/* ------------------------------------------------------------------ */
/*  Orientation Completion                                             */
/* ------------------------------------------------------------------ */

export async function completeOrientation(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_orientation', { p_student_id: studentId });
  if (error) throw new Error(`Failed to complete orientation: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Warm Activities                                                    */
/* ------------------------------------------------------------------ */

export async function getWarmActivities(
  interests: string[],
  age?: number,
): Promise<WarmActivity[]> {
  let query = supabase.from('warm_activities').select('*');

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch warm activities: ${error.message}`);

  const activities = (data ?? []) as WarmActivity[];

  // Client-side filtering for interest overlap + age range
  return activities.filter((a) => {
    // Interest filter: include if activity has no interests requirement OR overlaps with student interests
    const interestMatch =
      !a.interests || a.interests.length === 0 || a.interests.some((i) => interests.includes(i));

    // Age filter
    const ageMatch =
      age === undefined ||
      ((a.min_age === null || age >= a.min_age) && (a.max_age === null || age <= a.max_age));

    return interestMatch && ageMatch;
  });
}

export async function getWarmActivityProgress(
  studentId: string,
): Promise<WarmActivityProgress[]> {
  const { data, error } = await supabase
    .from('student_warm_activity_progress')
    .select('*')
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to fetch activity progress: ${error.message}`);
  return (data ?? []) as WarmActivityProgress[];
}

export async function startWarmActivity(
  studentId: string,
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('student_warm_activity_progress')
    .upsert(
      { student_id: studentId, activity_id: activityId, status: 'in_progress' },
      { onConflict: 'student_id,activity_id' },
    );

  if (error) throw new Error(`Failed to start activity: ${error.message}`);
}

export async function completeWarmActivity(
  studentId: string,
  activityId: string,
  responseData: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('student_warm_activity_progress')
    .update({ status: 'completed', response_data: responseData, stars_earned: 1 })
    .eq('student_id', studentId)
    .eq('activity_id', activityId);

  if (error) throw new Error(`Failed to complete activity: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Badges                                                             */
/* ------------------------------------------------------------------ */

export async function getBadges(studentId: string): Promise<StudentBadge[]> {
  const { data, error } = await supabase
    .from('student_badges')
    .select('*, badges(*)')
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to fetch badges: ${error.message}`);
  return (data ?? []) as StudentBadge[];
}

export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*');
  if (error) throw new Error(`Failed to fetch all badges: ${error.message}`);
  return (data ?? []) as Badge[];
}

/* ------------------------------------------------------------------ */
/*  Assessment Bookings                                                */
/* ------------------------------------------------------------------ */

export async function bookAssessment(
  studentId: string,
  parentId: string,
  date: string,
  timeSlot: string,
  notes?: string,
): Promise<AssessmentBooking> {
  const { data, error } = await supabase
    .from('assessment_bookings')
    .insert({
      student_id: studentId,
      parent_id: parentId,
      requested_date: date,
      requested_time_slot: timeSlot,
      notes: notes || null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to book assessment: ${error.message}`);
  return data as AssessmentBooking;
}

export async function getBookings(studentId: string): Promise<AssessmentBooking[]> {
  const { data, error } = await supabase
    .from('assessment_bookings')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return (data ?? []) as AssessmentBooking[];
}
