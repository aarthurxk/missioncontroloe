CREATE TABLE IF NOT EXISTS bridge_status (
  id text PRIMARY KEY DEFAULT 'singleton',
  last_seen timestamptz,
  host text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bridge_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bridge_status"
  ON bridge_status FOR ALL
  USING (true) WITH CHECK (true);

INSERT INTO bridge_status (id) VALUES ('singleton') ON CONFLICT DO NOTHING;