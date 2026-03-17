-- ============================================================
-- A² Compass — Phase 1 Baseline Migration
-- Tasks 1.2–1.5: Enrollment, Tiers, Subjects, Mastery Engine
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TIER SYSTEM (Task 1.3)
-- ============================================================

CREATE TABLE public.tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  grade_range_start INT NOT NULL,
  grade_range_end INT NOT NULL,
  description TEXT,
  theme_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the 3 tiers
INSERT INTO public.tiers (name, slug, grade_range_start, grade_range_end, description, theme_config) VALUES
  ('Explorers'' Camp', 'explorers-camp', 1, 6,
   'Bright, playful learning adventures for grades 1-6',
   '{"colors": {"primary": "#FF6B35", "secondary": "#FFC857", "accent": "#2EC4B6"}, "style": "playful", "iconSet": "adventure"}'::jsonb),
  ('Scholars'' Guild', 'scholars-guild', 7, 9,
   'Collaborative, project-focused learning for grades 7-9',
   '{"colors": {"primary": "#3A86FF", "secondary": "#8338EC", "accent": "#06D6A0"}, "style": "balanced", "iconSet": "scholarly"}'::jsonb),
  ('The Collegium', 'the-collegium', 10, 12,
   'Professional, portfolio-style college-prep for grades 10-12',
   '{"colors": {"primary": "#1B2A4A", "secondary": "#2D5F9A", "accent": "#C9A227"}, "style": "professional", "iconSet": "collegiate"}'::jsonb);

-- Helper function: get tier for a grade level
CREATE OR REPLACE FUNCTION public.get_tier_for_grade(grade INT)
RETURNS UUID AS $$
  SELECT id FROM public.tiers
  WHERE grade >= grade_range_start AND grade <= grade_range_end
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 2. SUBJECT DOMAINS (Task 1.4)
-- ============================================================

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subject-tier availability (which subjects available per tier)
CREATE TABLE public.subject_tier_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.tiers(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, tier_id)
);

-- Seed 6 subject domains
INSERT INTO public.subjects (name, slug, description, icon, color, display_order) VALUES
  ('Mathematics', 'mathematics', 'Number sense, algebra, geometry, and problem-solving', '📐', '#E63946', 1),
  ('English Language Arts', 'english-language-arts', 'Reading comprehension, writing, grammar, and literature', '📚', '#457B9D', 2),
  ('Science', 'science', 'Life science, physical science, earth science, and scientific inquiry', '🔬', '#2A9D8F', 3),
  ('Social Studies', 'social-studies', 'History, geography, civics, and cultural studies', '🌍', '#E9C46A', 4),
  ('Foreign Language', 'foreign-language', 'World languages, cultural immersion, and communication', '🗣️', '#F4A261', 5),
  ('Creative Arts', 'creative-arts', 'Visual art, music, digital media, and creative expression', '🎨', '#8338EC', 6);

-- Make all subjects available in all tiers by default
INSERT INTO public.subject_tier_availability (subject_id, tier_id, is_available)
SELECT s.id, t.id, true
FROM public.subjects s CROSS JOIN public.tiers t;

-- ============================================================
-- 3. PROFILES & STUDENT DATA
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'student')),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  avatar_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student-specific profile data
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  grade_level INT NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
  tier_id UUID NOT NULL REFERENCES public.tiers(id),
  date_of_birth DATE,
  parent_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-assign tier from grade level
CREATE OR REPLACE FUNCTION public.auto_assign_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier_id := public.get_tier_for_grade(NEW.grade_level);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_tier
  BEFORE INSERT OR UPDATE OF grade_level ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_tier();

-- ============================================================
-- 4. ENROLLMENT MODELS (Task 1.2)
-- ============================================================

CREATE TABLE public.enrollment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('full_time', 'tutoring', 'summer', 'a_la_carte')),
  base_price_cents INT,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'quarterly', 'semester', 'one_time')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 4 enrollment types (prices TBD by Sandra)
INSERT INTO public.enrollment_types (name, slug, description, schedule_type, features) VALUES
  ('Full-Time Enrollment', 'full-time', '5-day structured academic schedule with all subjects', 'full_time',
   '["Full subject access", "Daily live seminars", "Weekly coaching sessions", "Progress reports"]'::jsonb),
  ('Tutoring Services', 'tutoring', 'Flexible, subject-specific one-on-one or small group sessions', 'tutoring',
   '["Subject-specific focus", "Flexible scheduling", "One-on-one coaching", "Progress tracking"]'::jsonb),
  ('Summer Enrichment', 'summer', 'Seasonal programs with themed learning experiences', 'summer',
   '["Themed programs", "Project-based learning", "Field trip integration", "Portfolio building"]'::jsonb),
  ('A La Carte', 'a-la-carte', 'Individual course purchases for specific learning goals', 'a_la_carte',
   '["Single course access", "Self-paced options", "Certificate of completion", "Flexible timeline"]'::jsonb);

-- Student enrollments
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  enrollment_type_id UUID NOT NULL REFERENCES public.enrollment_types(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'pending_payment', 'paused', 'cancelled', 'completed')),
  start_date DATE,
  end_date DATE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollment schedules (for full-time students)
CREATE TABLE public.enrollment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. LEARNING FORMATS (Task 1.4)
-- ============================================================

CREATE TABLE public.learning_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  format_type TEXT NOT NULL CHECK (format_type IN (
    'live_seminar', 'discussion_board', 'choice_board',
    'independent_project', 'partner_quest', 'one_on_one_coaching', 'practice_arena'
  )),
  tier_availability JSONB DEFAULT '["explorers-camp", "scholars-guild", "the-collegium"]',
  config_schema JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed all 7 learning formats
INSERT INTO public.learning_formats (name, slug, description, icon, format_type, display_order) VALUES
  ('Live Seminar', 'live-seminar', 'Real-time interactive teaching sessions with video', '🎥', 'live_seminar', 1),
  ('Discussion Board', 'discussion-board', 'Asynchronous threaded discussions on topics', '💬', 'discussion_board', 2),
  ('Choice Board', 'choice-board', 'Student-selected activities from curated options', '🎯', 'choice_board', 3),
  ('Independent Project', 'independent-project', 'Self-directed deep-dive projects with milestones', '🚀', 'independent_project', 4),
  ('Partner Quest', 'partner-quest', 'Collaborative paired learning activities', '🤝', 'partner_quest', 5),
  ('One-on-One Coaching', 'one-on-one-coaching', 'Personalized teacher-student sessions', '👩‍🏫', 'one_on_one_coaching', 6),
  ('Practice Arena', 'practice-arena', 'Skill-building exercises with immediate feedback', '⚡', 'practice_arena', 7);

-- ============================================================
-- 6. MASTERY ENGINE (Task 1.5)
-- ============================================================

-- Learning standards / objectives
CREATE TABLE public.learning_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.tiers(id),
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  grade_level INT,
  parent_standard_id UUID REFERENCES public.learning_standards(id),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_standards_subject ON public.learning_standards(subject_id);
CREATE INDEX idx_learning_standards_tier ON public.learning_standards(tier_id);

-- Student mastery tracking
CREATE TABLE public.student_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES public.learning_standards(id) ON DELETE CASCADE,
  current_score NUMERIC(5,2) DEFAULT 0 CHECK (current_score BETWEEN 0 AND 100),
  attempts INT NOT NULL DEFAULT 0,
  mastered BOOLEAN NOT NULL DEFAULT false,
  mastered_at TIMESTAMPTZ,
  last_assessed_at TIMESTAMPTZ,
  evidence JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, standard_id)
);

CREATE INDEX idx_student_mastery_student ON public.student_mastery(student_id);
CREATE INDEX idx_student_mastery_mastered ON public.student_mastery(mastered);

-- Mastery threshold constant: 85%
-- Auto-set mastered flag when score >= 85
CREATE OR REPLACE FUNCTION public.check_mastery_threshold()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_score >= 85 AND NOT OLD.mastered THEN
    NEW.mastered := true;
    NEW.mastered_at := now();
  ELSIF NEW.current_score < 85 THEN
    NEW.mastered := false;
    NEW.mastered_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_mastery
  BEFORE UPDATE OF current_score ON public.student_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mastery_threshold();

-- Assessment records
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  standard_id UUID REFERENCES public.learning_standards(id),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('diagnostic', 'formative', 'summative', 'practice')),
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  responses JSONB DEFAULT '{}',
  feedback TEXT,
  assessed_by UUID REFERENCES public.profiles(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_student ON public.assessments(student_id);
CREATE INDEX idx_assessments_subject ON public.assessments(subject_id);

-- ============================================================
-- 7. FLIGHT PLAN (Daily Workflow Hub)
-- ============================================================

CREATE TABLE public.flight_plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  learning_format_id UUID REFERENCES public.learning_formats(id),
  standard_id UUID REFERENCES public.learning_standards(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('lesson', 'activity', 'assessment', 'coaching', 'project', 'break')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'skipped')),
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  display_order INT NOT NULL DEFAULT 0,
  content_url TEXT,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flight_plan_student_date ON public.flight_plan_items(student_id, scheduled_date);

-- ============================================================
-- 8. UPDATED_AT TRIGGER (reusable)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_student_enrollments_updated_at BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_flight_plan_updated_at BEFORE UPDATE ON public.flight_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9. ROW LEVEL SECURITY (Clean, JWT-based)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_tier_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plan_items ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- TIERS, SUBJECTS, FORMATS, ENROLLMENT_TYPES: readable by all authenticated
CREATE POLICY "Anyone can read tiers" ON public.tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read subject_tier_availability" ON public.subject_tier_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read enrollment_types" ON public.enrollment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read learning_formats" ON public.learning_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read learning_standards" ON public.learning_standards FOR SELECT TO authenticated USING (true);

-- Admin full access on reference tables
CREATE POLICY "Admins manage tiers" ON public.tiers FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage enrollment_types" ON public.enrollment_types FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage learning_formats" ON public.learning_formats FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admins manage learning_standards" ON public.learning_standards FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- PROFILES: users see own, teachers/admins see all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Teachers read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');

-- STUDENT PROFILES: students see own, parents see children, teachers/admins see all
CREATE POLICY "Students read own student_profile" ON public.student_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Parents read children" ON public.student_profiles FOR SELECT TO authenticated
  USING (parent_id = auth.uid());
CREATE POLICY "Teachers read all students" ON public.student_profiles FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Admins manage student_profiles" ON public.student_profiles FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');
CREATE POLICY "Teachers manage student_profiles" ON public.student_profiles FOR ALL TO authenticated
  USING (public.get_my_role() = 'teacher');

-- ENROLLMENTS: similar pattern
CREATE POLICY "Students read own enrollments" ON public.student_enrollments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children enrollments" ON public.student_enrollments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers read all enrollments" ON public.student_enrollments FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Admins manage enrollments" ON public.student_enrollments FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');
CREATE POLICY "Teachers manage enrollments" ON public.student_enrollments FOR ALL TO authenticated
  USING (public.get_my_role() = 'teacher');

-- ENROLLMENT SCHEDULES
CREATE POLICY "Read own schedules" ON public.enrollment_schedules FOR SELECT TO authenticated
  USING (enrollment_id IN (
    SELECT se.id FROM public.student_enrollments se
    JOIN public.student_profiles sp ON se.student_id = sp.id
    WHERE sp.user_id = auth.uid() OR sp.parent_id = auth.uid()
  ));
CREATE POLICY "Teachers read all schedules" ON public.enrollment_schedules FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers manage schedules" ON public.enrollment_schedules FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- MASTERY: students see own, parents see children, teachers manage
CREATE POLICY "Students read own mastery" ON public.student_mastery FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children mastery" ON public.student_mastery FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage mastery" ON public.student_mastery FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- ASSESSMENTS
CREATE POLICY "Students read own assessments" ON public.assessments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children assessments" ON public.assessments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage assessments" ON public.assessments FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- FLIGHT PLAN: students see own, parents see children, teachers manage
CREATE POLICY "Students read own flight_plan" ON public.flight_plan_items FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Students update own flight_plan" ON public.flight_plan_items FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Parents read children flight_plan" ON public.flight_plan_items FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.student_profiles WHERE parent_id = auth.uid()));
CREATE POLICY "Teachers manage flight_plan" ON public.flight_plan_items FOR ALL TO authenticated
  USING (public.get_my_role() IN ('teacher', 'admin'));

-- ============================================================
-- 10. SERVICE ROLE BYPASS (for API operations)
-- ============================================================
-- The service_role key already bypasses RLS by default in Supabase

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
