

## Implementação Completa de Push Notifications para iPhone

### Situação atual

Depois de auditar o projeto, **nenhum dos arquivos de push notification existe**. Não há manifest, service worker, hook, componente, edge function nem tabela `push_subscriptions`. Tudo precisa ser criado do zero, mas sem alterar o que já funciona.

### O que será criado

#### 1. PWA Base (instalável no iPhone)

**`public/manifest.webmanifest`**
- Manifest com `display: "standalone"`, nome "Mission Control", tema escuro
- Referência aos ícones que serão gerados a partir do favicon existente
- Será linkado no `index.html` junto com `<meta name="apple-mobile-web-app-capable">`

**`public/icon-192.png`** e **`public/icon-512.png`**
- Gerados programaticamente a partir do favicon atual (robô dentista)

**`public/apple-touch-icon.png`**
- Ícone 180x180 para iOS

**`index.html`**
- Adicionar `<link rel="manifest">`, `<meta name="apple-mobile-web-app-capable">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`

#### 2. Service Worker

**`public/sw.js`**
- Escuta evento `push`, exibe notificação nativa com título/body/icon
- Escuta `notificationclick` para abrir o app
- Sem cache offline (evita problemas no preview do Lovable)

**`src/main.tsx`**
- Registra o service worker apenas em produção e fora de iframe (seguindo as regras de PWA do Lovable)

#### 3. Tabela de subscriptions (migração SQL)

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  device_label text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```
- RLS: usuários autenticados podem inserir/deletar/selecionar apenas suas próprias subscriptions

#### 4. Hook React

**`src/hooks/usePushNotifications.ts`**
- Detecta suporte a push (incluindo Safari/iOS 16.4+)
- Gerencia subscription VAPID via `PushManager.subscribe()`
- Salva/remove subscription no banco
- Expõe estados: `supported`, `subscribed`, `loading`, `error`
- Lê `VITE_VAPID_PUBLIC_KEY` do environment

#### 5. Componente UI

**`src/components/PushNotificationsCard.tsx`**
- Card para a aba "Geral" das Settings
- Estados visuais: não suportado, não instalado como PWA (com instruções iPhone), pronto para ativar, ativo, erro
- Instruções curtas para iPhone: "Adicione à Tela de Início primeiro"
- Aviso quando VAPID key não está configurada
- Botão Ativar/Desativar com feedback visual

**`src/pages/SettingsPage.tsx`**
- Adicionar o `PushNotificationsCard` na aba "Geral"

#### 6. Edge Function `web-push`

**`supabase/functions/web-push/index.ts`**
- Recebe `{ execution_id, robot_name, status }` via POST
- Busca todas as subscriptions dos usuários
- Envia push usando Web Push Protocol (RFC 8030) com biblioteca `web-push`
- Autenticação via secret `MISSION_CONTROL_PUSH_SECRET` (shared secret com o bridge)
- CORS headers inclusos
- Remove subscriptions inválidas (410 Gone)

**`supabase/functions/web-push/deno.json`**
- Import map para dependência `web-push`

#### 7. Agent Bridge — disparo de push

**`agent_bridge/agent_bridge.py`**
- Após setar status final (success/error/cancelled), faz POST para a edge function `web-push`
- Busca o nome do robô para incluir na notificação
- Usa secret `MISSION_CONTROL_PUSH_SECRET` do ambiente
- Falha silenciosa (push é best-effort, não bloqueia o fluxo)

#### 8. Documentação

**`docs/PUSH_NOTIFICATIONS.md`**
- Passo a passo completo: gerar VAPID keys, configurar secrets, deployar, testar no iPhone
- Variáveis necessárias listadas
- Comandos exatos

### Secrets necessários (a serem configurados)

| Secret | Onde | Descrição |
|--------|------|-----------|
| `VAPID_PUBLIC_KEY` | Edge Function + `.env` como `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Edge Function | Chave privada VAPID |
| `VAPID_SUBJECT` | Edge Function | Email ou URL (ex: `mailto:admin@seudominio.com`) |
| `MISSION_CONTROL_PUSH_SECRET` | Edge Function + host do bridge | Shared secret para autenticar o bridge |

### Arquivos modificados

- `index.html` — meta tags PWA
- `src/main.tsx` — registro do SW
- `src/pages/SettingsPage.tsx` — incluir PushNotificationsCard

### Arquivos criados

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- `src/hooks/usePushNotifications.ts`
- `src/components/PushNotificationsCard.tsx`
- `supabase/functions/web-push/index.ts`
- `supabase/functions/web-push/deno.json`
- `docs/PUSH_NOTIFICATIONS.md`
- Migração SQL para `push_subscriptions`

### Arquivos NÃO modificados

- `agent_bridge/agent_bridge.py` — será modificado para adicionar o disparo de push
- Ícone do robô dentista (favicon.ico) — preservado intacto
- Nenhum componente visual existente será alterado

### Requisitos para funcionar no iPhone

- iOS 16.4+ com Safari
- App instalado na Tela de Início (obrigatório para push no iOS)
- Manifest com `display: "standalone"`
- Service worker registrado
- Permissão de notificação concedida pelo usuário via gesto (tap no botão)

