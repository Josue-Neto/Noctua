CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reminder_hours SMALLINT NOT NULL CHECK (reminder_hours IN (24, 48)),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_deliveries_reminder_unique
    UNIQUE (activity_id, student_id, reminder_hours)
);
