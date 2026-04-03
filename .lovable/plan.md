
Objetivo: corrigir o fluxo inteiro de push no iPhone, eliminando o erro real de entrega e ajustando os pontos de UX e segurança que ainda ficaram inconsistentes.

1. Diagnóstico confirmado
- O cadastro da assinatura já acontece em parte: o card chega ao estado “ON” e há registros em `push_subscriptions`.
- O erro principal está no envio: os logs mostram repetidamente `400 BadWebPushRequest`.
- A causa mais provável está clara no código atual: `test-push`, `web-push` e `check-bridge-offline` enviam JSON bruto para o endpoint do navegador, mas não fazem a criptografia Web Push usando `keys_p256dh` e `keys_auth`.
- Hoje essas chaves são salvas no banco, porém nunca são usadas no envio. Isso quebra especialmente no ecossistema do iPhone/Safari.
- Há problemas secundários:
  - o card quebra no layout mobile (como no print);
  - o estado `no-vapid` e a documentação ainda falam de `VITE_VAPID_PUBLIC_KEY`, mas o app já busca a chave em runtime;
  - o `upsert`/`delete` do hook não valida `error`, então a UI pode parecer ativa mesmo se o backend falhar;
  - a tabela `push_subscriptions` está com policies amplas para `anon`, o que é desnecessário e inseguro.

2. O que vou corrigir
- Substituir a lógica manual de envio por uma implementação Web Push compatível de verdade, usando as chaves da assinatura (`p256dh` + `auth`) e VAPID corretamente.
- Centralizar essa lógica em um helper compartilhado para evitar três versões diferentes do mesmo bug:
  - `supabase/functions/test-push/index.ts`
  - `supabase/functions/web-push/index.ts`
  - `supabase/functions/check-bridge-offline/index.ts`
- Ajustar o fluxo do frontend para só marcar “ativado” quando a assinatura tiver sido salva no backend sem erro.
- Melhorar o card para iPhone:
  - layout responsivo;
  - feedback melhor no botão “Testar”;
  - mensagens consistentes com a implementação real.
- Atualizar a documentação para refletir o fluxo atual e remover instruções antigas.

3. Ajustes de backend
- Criar um helper compartilhado de envio push nas functions.
- Esse helper vai:
  - montar payload;
  - usar VAPID;
  - enviar para cada subscription com criptografia compatível;
  - remover subscriptions expiradas (`404/410`);
  - devolver contagem de `sent`, `failed`, `removed`.
- `test-push` continuará enviando apenas para o usuário autenticado.
- `web-push` continuará sendo chamado pelo bridge quando uma execução terminar.
- `check-bridge-offline` continuará disparando quando o heartbeat ficar antigo, mas vou ajustar o link da notificação para uma rota acessível ao usuário, em vez de depender de `/settings`.

4. Ajustes de segurança
- Fazer uma migration para remover as policies de `anon` em `push_subscriptions`.
- Deixar a tabela acessível assim:
  - usuário autenticado: lê/insere/remove apenas as próprias subscriptions;
  - functions: usam service role internamente para envio e limpeza.
- Isso mantém o comportamento atual, mas sem expor a tabela para leitura/deleção ampla.

5. Ajustes no frontend
- `src/hooks/usePushNotifications.ts`
  - validar retorno de `upsert` e `delete`;
  - só mudar para `subscribed` quando salvar no backend com sucesso;
  - mostrar erro real quando o cadastro falhar;
  - manter o teste de push com retorno mais claro.
- `src/components/PushNotificationsCard.tsx`
  - corrigir o layout quebrado no iPhone;
  - empilhar conteúdo/botões em telas estreitas;
  - melhorar o texto do estado ativo para incluir teste/manual;
  - corrigir a cópia do estado “backend não configurado”.
- Opcionalmente, se o registro local existir mas não estiver salvo no backend, o hook pode re-sincronizar automaticamente.

6. Documentação e consistência
- Atualizar `docs/PUSH_NOTIFICATIONS.md` para:
  - remover dependência de `VITE_VAPID_PUBLIC_KEY`;
  - explicar que a chave pública é buscada do backend;
  - documentar exatamente quais notificações o usuário recebe:
    - teste manual;
    - execução concluída com sucesso;
    - execução com erro;
    - execução cancelada;
    - bridge offline.

7. Validação que vou seguir após implementar
- Confirmar que `test-push` deixa de gerar `BadWebPushRequest`.
- Confirmar que o retorno da function mostra `sent > 0` quando houver dispositivo válido.
- Testar os 3 cenários de envio:
  - botão “Testar”;
  - finalização de execução;
  - bridge offline.
- Verificar no iPhone:
  - PWA instalada pela Tela de Início;
  - permissão ativa;
  - push chegando com app fechado;
  - toque na notificação abrindo o app corretamente.
- Verificar também que o card não estoura mais no layout mobile.

Se aprovado, vou implementar nesses arquivos:
- `supabase/functions/test-push/index.ts`
- `supabase/functions/web-push/index.ts`
- `supabase/functions/check-bridge-offline/index.ts`
- helper compartilhado em `supabase/functions/_shared/...`
- nova migration para endurecer RLS de `push_subscriptions`
- `src/hooks/usePushNotifications.ts`
- `src/components/PushNotificationsCard.tsx`
- `docs/PUSH_NOTIFICATIONS.md`
