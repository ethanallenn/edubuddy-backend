-- EduBuddy PostgreSQL schema
-- Matches the live database shape used by the current backend code.
-- Includes the subjects and grades tables that are required by the API but
-- were not present in the pasted dump.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.schools (
  school_id VARCHAR(7) NOT NULL,
  school_name VARCHAR(100) NOT NULL,
  postcode VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT schools_pkey PRIMARY KEY (school_id),
  CONSTRAINT schools_school_id_check CHECK (school_id ~ '^[0-9]{7}$')
);

CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID DEFAULT gen_random_uuid() NOT NULL,
  school_id VARCHAR(7),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_email_school_id_unique UNIQUE (email, school_id),
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'teacher')),
  CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.classes (
  class_id UUID DEFAULT gen_random_uuid() NOT NULL,
  school_id VARCHAR(7),
  class_name VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT classes_pkey PRIMARY KEY (class_id),
  CONSTRAINT unique_school_class UNIQUE (school_id, class_name, academic_year),
  CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.subjects (
  subject_id UUID DEFAULT gen_random_uuid() NOT NULL,
  school_id VARCHAR(7),
  subject_name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subjects_pkey PRIMARY KEY (subject_id),
  CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.students (
  student_id UUID DEFAULT gen_random_uuid() NOT NULL,
  school_id VARCHAR(7),
  class_id UUID,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  candidate_number VARCHAR(4),
  email VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT students_pkey PRIMARY KEY (student_id),
  CONSTRAINT students_candidate_number_check CHECK (candidate_number ~ '^[0-9]{4}$'),
  CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id) ON DELETE SET NULL,
  CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_school_student_email
  ON public.students USING btree (school_id, email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.grades (
  grade_id UUID DEFAULT gen_random_uuid() NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  assessment_name VARCHAR(150) NOT NULL,
  score_achieved NUMERIC(10, 2) NOT NULL,
  score_possible NUMERIC(10, 2) NOT NULL,
  confidence_level NUMERIC(4, 1),
  feedback TEXT,
  date_conducted DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT grades_pkey PRIMARY KEY (grade_id),
  CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE,
  CONSTRAINT grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grades_student_id_idx ON public.grades USING btree (student_id);
CREATE INDEX IF NOT EXISTS grades_subject_id_idx ON public.grades USING btree (subject_id);
CREATE INDEX IF NOT EXISTS grades_date_conducted_idx ON public.grades USING btree (date_conducted DESC);

CREATE TABLE IF NOT EXISTS public.class_assignments (
  assignment_id UUID DEFAULT gen_random_uuid() NOT NULL,
  class_id UUID NOT NULL,
  title VARCHAR(140) NOT NULL,
  template_key VARCHAR(60) NOT NULL,
  description TEXT,
  due_date DATE,
  estimated_duration_mins INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT class_assignments_pkey PRIMARY KEY (assignment_id),
  CONSTRAINT class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id) ON DELETE CASCADE,
  CONSTRAINT class_assignments_status_check CHECK (status IN ('draft', 'scheduled', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS class_assignments_class_id_idx ON public.class_assignments USING btree (class_id);
CREATE INDEX IF NOT EXISTS class_assignments_due_date_idx ON public.class_assignments USING btree (due_date);

CREATE TABLE IF NOT EXISTS public.invitations (
  invitation_id UUID DEFAULT gen_random_uuid() NOT NULL,
  school_id VARCHAR(7),
  email VARCHAR(100) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invitations_pkey PRIMARY KEY (invitation_id),
  CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'teacher')),
  CONSTRAINT unique_school_email_invite UNIQUE (school_id, email),
  CONSTRAINT invitations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.password_resets (
  reset_id SERIAL NOT NULL,
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT password_resets_pkey PRIMARY KEY (reset_id),
  CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON public.password_resets USING btree (token_hash);

COMMIT;
