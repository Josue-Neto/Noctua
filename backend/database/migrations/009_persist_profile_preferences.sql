ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 240);
ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '' CHECK (avatar_url = '' OR avatar_url ~ '^https://');
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  dyslexia_font BOOLEAN NOT NULL DEFAULT FALSE,
  email_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX activities_scope_due_idx ON activities(class_subject_id,due_at,id);
CREATE INDEX activities_author_idx ON activities(author_id);
CREATE INDEX class_subjects_subject_idx ON class_subjects(subject_id);
CREATE INDEX invitation_classes_class_idx ON account_invitation_classes(class_id);
CREATE INDEX invitations_creator_idx ON account_invitations(created_by);
DO $$ DECLARE t RECORD; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
