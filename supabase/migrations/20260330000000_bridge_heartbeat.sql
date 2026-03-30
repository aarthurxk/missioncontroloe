-- Heartbeat do agent_bridge
-- O bridge atualiza este valor a cada 30s para o portal saber que está vivo
INSERT INTO app_settings (key, value, updated_at)
VALUES ('bridge_last_seen', '', now()::text)
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, updated_at)
VALUES ('bridge_host', '', now()::text)
ON CONFLICT (key) DO NOTHING;
