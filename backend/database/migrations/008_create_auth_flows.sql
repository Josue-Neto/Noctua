CREATE TABLE IF NOT EXISTS account_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'coordinator')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT account_invitations_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS account_invitations_pending_email_unique_idx
  ON account_invitations (LOWER(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS account_invitations_token_hash_idx
  ON account_invitations (token_hash);

CREATE TABLE IF NOT EXISTS account_invitation_classes (
  invitation_id UUID NOT NULL REFERENCES account_invitations (id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES academic_classes (id) ON DELETE RESTRICT,
  PRIMARY KEY (invitation_id, class_id)
);

CREATE TABLE IF NOT EXISTS account_invitation_subjects (
  invitation_id UUID NOT NULL REFERENCES account_invitations (id) ON DELETE CASCADE,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  PRIMARY KEY (invitation_id, class_id, subject_id),
  CONSTRAINT account_invitation_subject_slot_unique UNIQUE (class_id, subject_id),
  CONSTRAINT account_invitation_subject_class_subject_fk
    FOREIGN KEY (class_id, subject_id)
    REFERENCES class_subjects (class_id, subject_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  CONSTRAINT password_reset_tokens_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, expires_at)
  WHERE used_at IS NULL;
