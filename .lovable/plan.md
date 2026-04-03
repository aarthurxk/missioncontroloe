

## Análise do Problema

**Hoje, 3 de abril de 2026, é Sexta-feira Santa** — feriado nacional. Os 3 robôs rodaram mesmo assim, todos disparados por `triggered_by: 'schedule'`.

### Causa raiz (dois erros combinados)

1. **A correção de timezone de ontem causou o problema**: Quando corrigimos o bug dos horários (somando 3 horas ao `next_run_at`), a migration simplesmente fez `next_run_at = next_run_at + interval '3 hours'` — sem verificar se a nova data caía num feriado. O resultado: os 3 agendamentos ficaram com `next_run_at` apontando para hoje (sexta-feira santa).

2. **A edge function `trigger-schedules` NÃO verifica feriados**: Ela apenas checa `next_run_at <= now()` e dispara. A lógica de pular feriados só existe no **frontend** (no `getNextRunInfo` em `useSchedules.ts`), que é usada para exibição e para salvar o `next_run_at` quando um agendamento é criado ou editado pelo usuário. Mas a edge function, ao recalcular o próximo `next_run_at` após disparar, usa apenas `cron-parser` — que não conhece feriados brasileiros.

### Resumo do fluxo com falha

```text
Migration ontem → next_run_at = 2026-04-03 (sexta-feira santa)
                    ↓
pg_cron (1 min) → trigger-schedules verifica: next_run_at <= now()? SIM
                    ↓
Cria execução "pending" → agent_bridge roda o script ✗ (deveria ter pulado)
                    ↓
Recalcula next_run_at com cron-parser (sem verificar feriado)
```

## Correção

### 1. Recriar `trigger-schedules` com verificação de feriados

A edge function precisa ser recriada no repositório (foi deletada em algum momento) com lógica de feriados embutida:

- Antes de criar a execução, verificar se a data local (Recife, UTC-3) do `next_run_at` é feriado
- Se for feriado, **pular** — não criar execução, e avançar `next_run_at` para o próximo dia útil válido
- Ao recalcular o próximo `next_run_at`, aplicar a mesma lógica de pular feriados (replicar a lista de feriados do `holidays.ts` dentro da edge function)

### 2. Adicionar módulo de feriados para a edge function

Criar um arquivo compartilhado `supabase/functions/_shared/holidays.ts` com a mesma lógica de `src/lib/holidays.ts` (cálculo de Páscoa, feriados fixos e móveis, verificação de data).

### 3. Corrigir o `next_run_at` atual no banco

Os valores atuais (April 4) podem estar corretos agora, mas precisam ser verificados — April 4 é sábado, e os crons são `2,3,4,5,6` (seg-sáb). Sábado = 6, então pode estar certo. Verificar e corrigir se necessário.

### Arquivos afetados
- **Novo**: `supabase/functions/_shared/holidays.ts` — lógica de feriados para edge functions
- **Novo**: `supabase/functions/trigger-schedules/index.ts` — edge function recriada com verificação de feriados
- **Verificação**: dados atuais de `next_run_at` no banco

