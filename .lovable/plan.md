

## Armazenar cron em horário de Recife (UTC-3)

### Situação atual
O sistema converte o horário local para UTC antes de salvar o cron (ex: 08:00 BRT → `0 11 * * ...`). Isso funciona, mas o cron bruto exibido no card confunde (mostra `0 11` em vez de `0 8`).

A edge function `trigger-schedules` provavelmente usa o campo `next_run_at` (TIMESTAMPTZ) para decidir quando disparar, não parseia o cron diretamente. Portanto, o cron pode ficar em horário local sem problemas — basta que o `next_run_at` esteja correto em UTC.

### Mudanças

**`src/hooks/useSchedules.ts`**

1. **`buildCronExpression()`** — remover a conversão local→UTC. Salvar o cron com a hora local diretamente (ex: 08:00 → `0 8 * * ...`).

2. **`parseCronToDisplay()`** — remover a conversão UTC→local. Ler a hora do cron diretamente como hora local.

3. **`cronToLocalTime()`** — remover a conversão, retornar a hora do cron diretamente.

4. **`getNextRunFromCron()`** — manter a lógica de calcular a próxima execução, mas agora tratar a hora do cron como horário de Recife (UTC-3) para gerar o `Date` correto em UTC. Usar offset fixo de -3h (Recife não tem horário de verão).

**Migração SQL** — reverter os crons para horário local e corrigir `next_run_at`:

```sql
-- Cron de volta para horário local (Recife)
UPDATE schedules SET cron_expression = '0 8 * * 2,3,4,5,6',
  next_run_at = '2026-04-03 11:00:00+00'
  WHERE id = 'ed46625c-fc1b-45ff-91fd-06c5301f0948';

UPDATE schedules SET cron_expression = '22 9 * * 2,3,4,5,6',
  next_run_at = '2026-04-03 12:22:00+00'
  WHERE id = '5d87ae5d-c3ad-41d8-a38a-221a036ae853';

UPDATE schedules SET cron_expression = '30 19 * * 2,3,4,5,6',
  next_run_at = '2026-04-02 22:30:00+00'
  WHERE id = '489693fa-e140-4db5-a083-feeb3f7db381';
```

### Detalhe técnico
Recife (America/Recife) é UTC-3 o ano inteiro, sem horário de verão. Então o offset é fixo: para converter hora local do cron para `next_run_at` UTC, basta somar 3 horas.

