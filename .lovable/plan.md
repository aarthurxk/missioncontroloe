

## Plano: Push Notifications disparadas pelo banco de dados (sem depender do Agent Bridge)

### Problema atual
Hoje, as notificações push só são enviadas quando o `agent_bridge.py` chama a Edge Function `web-push` após finalizar uma execução. Se o secret não estiver configurado na VPS ou o bridge falhar, nenhuma notificação chega.

### Solução
Criar um **Database Webhook** (Supabase) que dispara automaticamente a Edge Function `web-push` sempre que uma execução muda para um estado terminal (`success`, `error`, `cancelled`). Assim, a notificação é acionada diretamente pelo banco de dados, independente do Agent Bridge.

### Como funciona

```text
Robô finaliza → agent_bridge atualiza status no banco
                         ↓
              Database Webhook (trigger on UPDATE)
                         ↓
              Edge Function "web-push" é chamada
                         ↓
              Push chega no celular
```

### Passos de implementação

1. **Criar uma nova Edge Function `notify-execution-complete`**
   - Recebe o payload do webhook do Supabase (com o registro antigo e novo da tabela `executions`)
   - Verifica se o status mudou para `success`, `error` ou `cancelled`
   - Busca o nome do robô na tabela `robots`
   - Chama a mesma lógica de envio de push já existente em `web-push` (ou reutiliza internamente)
   - Autenticação via `service_role` (webhook interno, sem necessidade de shared secret)

2. **Criar Database Webhook via migração SQL**
   - Webhook na tabela `executions` para eventos `UPDATE`
   - Aponta para a nova Edge Function
   - Usa o `service_role_key` para autenticação

3. **Manter compatibilidade**
   - O `agent_bridge.py` continua funcionando normalmente (pode até remover a chamada de push dele no futuro)
   - As duas fontes de notificação não vão duplicar porque o push usa `tag` com o `execution_id` — o navegador deduplica automaticamente notificações com mesmo tag

### Benefícios
- Notificações funcionam mesmo que o Agent Bridge não tenha o `MISSION_CONTROL_PUSH_SECRET`
- Mais confiável — acionado diretamente pelo banco
- Zero configuração extra na VPS

