-- Tabela de status do agent_bridge
-- Usa RLS permissiva (igual a robots/executions) para o bridge escrever com anon key
CREATE TABLE IF NOT EXISTS bridge_status (
  id text PRIMARY KEY DEFAULT 'singleton',
  last_seen timestamptz,
  host text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bridge_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bridge_status"
  ON bridge_status FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir registro inicial
INSERT INTO bridge_status (id, last_seen, host)
VALUES ('singleton', null, null)
ON CONFLICT (id) DO NOTHING;
