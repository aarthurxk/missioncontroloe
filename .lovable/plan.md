

## Diagnóstico

A edge function `check-bridge-offline` **está funcionando** — quando invoquei agora, ela retornou `"sent": 7, "failed": 0, "removed": 0`. Ou seja, os 7 pushes foram aceitos pelo serviço da Apple (APNs) sem erro.

### Por que você não recebeu?

O problema é que existem **7 subscriptions** na tabela `push_subscriptions`, todas do mesmo usuário e todas de "iPhone/iPad". Cada vez que você abre o PWA e se inscreve, uma nova subscription é criada com um endpoint diferente. Provavelmente apenas a **última** é válida — as outras 6 são tokens antigos que a Apple aceita silenciosamente mas não entrega.

Além disso, a Apple (APNs) tem comportamentos específicos:
- Tokens antigos são aceitos (não retornam 410 Gone imediatamente) mas a notificação não é entregue
- Se o app não está na Tela de Início ou o Safari fechou o Service Worker, o push pode ser descartado

### Dados atuais

- **Bridge offline há**: ~9 minutos (last_seen: 00:44 UTC)
- **Subscriptions**: 7 registros, todos iPhone/iPad, mesmo user_id
- **Alerta cooldown**: Configurado para 30 min entre alertas (funcionando)
- **pg_cron**: Rodando a cada 2 minutos (ativo)

## Plano de Correção

### 1. Limpar subscriptions duplicadas no banco
Manter apenas a subscription mais recente por `user_id` e deletar as antigas. Isso garante que o push vai para o token ativo.

### 2. Adicionar lógica de deduplicação no hook `usePushNotifications`
Ao fazer `subscribe()`, antes de inserir, deletar todas as subscriptions anteriores do mesmo `user_id` (exceto o endpoint atual). Isso evita acúmulo de tokens antigos no futuro.

### 3. Adicionar limpeza periódica na edge function
Na `check-bridge-offline` e `web-push`, após enviar pushes, verificar subscriptions duplicadas por user e manter apenas a mais recente.

### Arquivos afetados
- **Migration SQL**: DELETE subscriptions antigas (manter só a mais recente por user)
- `src/hooks/usePushNotifications.ts`: Limpar tokens antigos ao se inscrever
- `supabase/functions/check-bridge-offline/index.ts`: Deduplicação antes do envio

