# Push Notifications — Guia de Deploy

## Visão Geral

O Mission Control envia push notifications para todos os dispositivos cadastrados quando:
- Uma execução de robô termina (success, error ou cancelled)
- O Agent Bridge fica offline (sem heartbeat por mais de 2 minutos)
- O usuário dispara um teste manual pelo botão "Testar"

Funciona em iPhone (iOS 16.4+), Android e Desktop.

## Pré-requisitos

- App publicado em HTTPS (obrigatório para push)
- iPhone: app instalado na Tela de Início (PWA standalone)

---

## Passo 1: Gerar chaves VAPID

No terminal (precisa de Node.js instalado):

```bash
npx web-push generate-vapid-keys
```

Você receberá:
- **Public Key**: string base64url (ex: `BNq-...`)
- **Private Key**: string base64url (ex: `0GQ-...`)

Guarde ambas.

---

## Passo 2: Configurar secrets no backend

No painel do Lovable Cloud (Settings → Secrets), adicione:

| Secret | Valor |
|--------|-------|
| `VAPID_PUBLIC_KEY` | Sua chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Sua chave privada VAPID |
| `VAPID_SUBJECT` | `mailto:seu-email@dominio.com` |
| `MISSION_CONTROL_PUSH_SECRET` | Uma string aleatória forte (ex: `openssl rand -hex 32`) |

> ℹ️ A chave pública é buscada automaticamente pelo frontend através da edge function `vapid-public-key`. Não é necessário configurar variáveis de ambiente no frontend.

---

## Passo 3: Configurar o Agent Bridge

Na máquina onde o `agent_bridge.py` roda, defina a variável de ambiente:

```bash
export MISSION_CONTROL_PUSH_SECRET="mesmo-valor-do-secret-no-backend"
```

Ou adicione ao arquivo de serviço systemd:

```ini
[Service]
Environment=MISSION_CONTROL_PUSH_SECRET=mesmo-valor-do-secret-no-backend
```

Reinicie o serviço:

```bash
sudo systemctl restart agent-bridge
```

---

## Passo 4: Deploy

As edge functions (`web-push`, `test-push`, `check-bridge-offline`, `vapid-public-key`) são deployadas automaticamente pelo Lovable. Nenhum comando manual necessário.

---

## Passo 5: Testar no iPhone

1. Publique o app no Lovable
2. Abra o site no **Safari** do iPhone (iOS 16.4+)
3. Toque em **Compartilhar → Adicionar à Tela de Início**
4. Abra o app pela Tela de Início
5. Vá em **Configurações → Geral** e toque em **Ativar** nas Notificações Push
6. Aceite a permissão do sistema
7. Toque em **Testar** para receber uma notificação de teste
8. Execute um robô — você receberá uma notificação quando terminar

---

## Arquitetura

### Fluxo de criptografia

O envio de push usa a biblioteca `@negrel/webpush` (RFC 8291 + RFC 8292), que:
1. Criptografa o payload com AES-128-GCM usando ECDH (chave p256dh do dispositivo)
2. Autentica o servidor com VAPID (JWT assinado com chave privada)
3. Envia para o push service do navegador (Apple, Google, Mozilla)

### Edge Functions

| Função | Chamada por | Autenticação |
|--------|------------|--------------|
| `vapid-public-key` | Frontend (GET) | Nenhuma |
| `test-push` | Frontend (POST) | JWT do usuário |
| `web-push` | Agent Bridge | Shared secret (`x-push-secret`) |
| `check-bridge-offline` | pg_cron (2 min) | Service role |

---

## Variáveis de ambiente resumo

### Backend (Edge Function secrets)
| Variável | Descrição |
|----------|-----------|
| `VAPID_PUBLIC_KEY` | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID |
| `VAPID_SUBJECT` | Email de contato (formato `mailto:...`) |
| `MISSION_CONTROL_PUSH_SECRET` | Shared secret para autenticação bridge→function |

### Host do Agent Bridge
| Variável | Descrição |
|----------|-----------|
| `MISSION_CONTROL_PUSH_SECRET` | Shared secret (mesmo do backend) |

---

## Troubleshooting

- **"Instale o app primeiro"**: No iPhone, push só funciona em PWA standalone. Adicione à Tela de Início.
- **"Backend não configurado"**: As chaves VAPID não estão configuradas nos secrets do backend.
- **"Permissão negada"**: O usuário bloqueou notificações. Ir em Ajustes → Notificações do app.
- **Notificações não chegam**: Verifique os logs da edge function nos logs do Lovable Cloud.
- **410 Gone nos logs**: Normal — a subscription expirou e foi removida automaticamente.
- **400 BadWebPushRequest**: Verifique se as chaves VAPID estão corretas e no formato base64url.
