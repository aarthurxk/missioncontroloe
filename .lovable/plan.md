

## Plano: Mostrar quem disparou a execução (usuário ou agendamento) — incluindo no Push

### Situação atual
- A tabela `executions` já tem `triggered_by` (`manual`, `dashboard`, `schedule`) mas **não guarda qual usuário** disparou.
- O push notification só mostra `"Execução finalizada: success"` — sem informação de quem rodou.

### Alterações

**1. Adicionar coluna `triggered_by_user_id` na tabela `executions`**
- Nova coluna `triggered_by_user_id UUID` (nullable) para guardar o ID do usuário que disparou manualmente.
- Execuções por agendamento ficam com `NULL`.

**2. Salvar o user_id ao disparar execução no frontend**
- `AgentsList.tsx` (handleRunNow) e `RobotDetailDrawer.tsx` (handleExecute): incluir `triggered_by_user_id: user.id` no insert.

**3. Atualizar a Edge Function `notify-execution-complete`**
- Buscar o nome do usuário na tabela `profiles` usando `record.triggered_by_user_id`.
- Alterar o body do push para incluir a origem:
  - Manual: `"Rodado por João • status"` 
  - Agendamento: `"Agendamento • status"`

**4. Mostrar na UI (MissionQueue, Logs, ExecutionSummaryModal)**
- Exibir "por Fulano" ou "⏰ Agendado" junto ao card de execução.

### Detalhes técnicos

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | `ALTER TABLE executions ADD COLUMN triggered_by_user_id uuid` |
| `AgentsList.tsx` | Adicionar `triggered_by_user_id` no insert |
| `RobotDetailDrawer.tsx` | Adicionar `triggered_by_user_id` no insert |
| `notify-execution-complete/index.ts` | Buscar profile name, incluir no payload do push |
| `MissionQueue.tsx` | Mostrar quem disparou em cada card |
| `Logs.tsx` | Mostrar quem disparou na tabela |
| `ExecutionSummaryModal.tsx` | Mostrar quem disparou no modal |

