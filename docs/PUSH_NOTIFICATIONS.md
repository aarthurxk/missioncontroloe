# Push Notifications — Guia de Deploy

## Visão Geral

O Mission Control envia push notifications para todos os dispositivos cadastrados quando uma execução de robô termina (success, error ou cancelled). Funciona em iPhone (iOS 16.4+), Android e Desktop.

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

---

## Passo 3: Configurar variável no frontend

No Lovable, adicione ao `.env` do projeto:

```
VITE_VAPID_PUBLIC_KEY=BNq-sua-chave-publica-aqui
```

> ⚠️ Esta é a chave **pública** — seguro colocar no frontend.

---

## Passo 4: Configurar o Agent Bridge

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

## Passo 5: Deploy da Edge Function

A função `web-push` é deployada automaticamente pelo Lovable. Nenhum comando manual necessário.

---

## Passo 6: Testar no iPhone

1. Publique o app no Lovable
2. Abra o site no **Safari** do iPhone (iOS 16.4+)
3. Toque em **Compartilhar → Adicionar à Tela de Início**
4. Abra o app pela Tela de Início
5. Vá em **Configurações → Geral** e toque em **Ativar** nas Notificações Push
6. Aceite a permissão do sistema
7. Execute um robô — você receberá uma notificação quando terminar

---

## Variáveis de ambiente resumo

### Backend (Edge Function secrets)
| Variável | Descrição |
|----------|-----------|
| `VAPID_PUBLIC_KEY` | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID |
| `VAPID_SUBJECT` | Email de contato (formato `mailto:...`) |
| `MISSION_CONTROL_PUSH_SECRET` | Shared secret para autenticação bridge→function |

### Frontend (.env)
| Variável | Descrição |
|----------|-----------|
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID (mesma do backend) |

### Host do Agent Bridge
| Variável | Descrição |
|----------|-----------|
| `MISSION_CONTROL_PUSH_SECRET` | Shared secret (mesmo do backend) |

---

## Troubleshooting

- **"Instale o app primeiro"**: No iPhone, push só funciona em PWA standalone. Adicione à Tela de Início.
- **"Backend não configurado"**: `VITE_VAPID_PUBLIC_KEY` não está no `.env` do frontend.
- **"Permissão negada"**: O usuário bloqueou notificações. Ir em Ajustes → Notificações do app.
- **Notificações não chegam**: Verifique os logs da edge function `web-push` no Lovable Cloud.
- **410 Gone nos logs**: Normal — a subscription expirou e foi removida automaticamente.
