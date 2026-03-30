-- Adiciona campo script_path na tabela robots
-- Usado pelo agent_bridge para saber qual arquivo executar
ALTER TABLE robots ADD COLUMN IF NOT EXISTS script_path text;
