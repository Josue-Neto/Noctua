CREATE INDEX IF NOT EXISTS activities_class_subject_due_idx
  ON activities (class_subject_id, due_at)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS activities_published_due_idx
  ON activities (due_at)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS class_memberships_student_idx
  ON class_memberships (student_id);

CREATE INDEX IF NOT EXISTS class_subjects_teacher_idx
  ON class_subjects (teacher_id);

CREATE INDEX IF NOT EXISTS activity_attachments_activity_idx
  ON activity_attachments (activity_id);

CREATE INDEX IF NOT EXISTS student_activity_checklist_student_idx
  ON student_activity_checklist (student_id, updated_at);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS notification_deliveries_pending_idx
  ON notification_deliveries (scheduled_at)
  WHERE status = 'pending';
