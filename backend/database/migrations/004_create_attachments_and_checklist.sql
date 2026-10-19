CREATE TABLE IF NOT EXISTS activity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('file', 'link')),
  storage_key TEXT UNIQUE,
  external_url TEXT,
  content_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_attachments_reference_check CHECK (
    (
      attachment_type = 'file'
      AND storage_key IS NOT NULL
      AND external_url IS NULL
      AND content_type IS NOT NULL
      AND size_bytes IS NOT NULL
    )
    OR (
      attachment_type = 'link'
      AND storage_key IS NULL
      AND external_url IS NOT NULL
      AND content_type IS NULL
      AND size_bytes IS NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS student_activity_checklist (
  activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, student_id)
);
