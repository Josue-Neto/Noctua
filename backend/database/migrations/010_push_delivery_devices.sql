CREATE TABLE push_device_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES notification_deliveries(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  UNIQUE(delivery_id, subscription_id)
);
CREATE INDEX push_device_pending_idx ON push_device_deliveries(next_attempt_at) WHERE status='pending';
ALTER TABLE push_device_deliveries ENABLE ROW LEVEL SECURITY;
