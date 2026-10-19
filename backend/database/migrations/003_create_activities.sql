CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_subject_id UUID NOT NULL REFERENCES class_subjects (id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('assignment', 'exam', 'event', 'notice')),
  starts_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activities_due_after_start
    CHECK (starts_at IS NULL OR due_at IS NULL OR due_at >= starts_at)
);
