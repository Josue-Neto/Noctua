CREATE TABLE IF NOT EXISTS academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_year SMALLINT NOT NULL CHECK (school_year BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_classes_name_year_unique UNIQUE (name, school_year)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color_hex CHAR(7) NOT NULL DEFAULT '#46479C'
    CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_memberships (
  class_id UUID NOT NULL REFERENCES academic_classes (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES academic_classes (id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT class_subjects_class_subject_unique UNIQUE (class_id, subject_id)
);
