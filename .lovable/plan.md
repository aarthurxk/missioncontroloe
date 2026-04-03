

## Problema

Os horários de "Próxima execução" estão aparecendo 3 horas a menos do que o agendado (08:00 → 05:00, 09:22 → 06:22, 19:30 → 16:30). A causa tem duas partes:

1. **Valores antigos no banco**: O campo `next_run_at` foi salvo com horário local de Recife tratado como UTC (ex: `08:00:00+00` em vez de `11:00:00+00`). Quando o `date-fns format()` converte para o fuso do navegador (Recife, UTC-3), subtrai 3 horas e mostra 05:00.

2. **Exibição usa `next_run_at` do banco em vez de recalcular**: O card prefere o valor armazenado (`schedule.next_run_at`) sobre o cálculo dinâmico (`getNextRunInfo`), perpetuando o erro.

## Correção

### 1. Sempre usar cálculo dinâmico na exibição (SchedulerPage.tsx)
- No `ScheduleCard`, ignorar `schedule.next_run_at` e usar apenas `getNextRunInfo(schedule.cron_expression)` para exibir a próxima execução. Isso garante que o horário mostrado é sempre correto independente do que está salvo.

### 2. Corrigir o salvamento de `next_run_at` (SchedulerPage.tsx)
- Ao salvar/atualizar um agendamento, garantir que `next_run_at` recebe o Date UTC correto via `getNextRunFromCron()`, que já aplica o offset de +3h.

### 3. Corrigir exibição na AnalyticsPage
- A mesma correção de exibição se aplica em `AnalyticsPage.tsx` onde `next_run_at` é formatado diretamente.

### 4. Migration para atualizar dados existentes
- Executar um UPDATE nas 3 schedules existentes para corrigir o `next_run_at` armazenado (somar 3 horas), para que outras partes do sistema (como o bridge) usem o valor correto.

### Arquivos afetados
- `src/pages/SchedulerPage.tsx` — card usa cálculo dinâmico, form salva UTC correto
- `src/pages/AnalyticsPage.tsx` — exibição corrigida
- Migration SQL para corrigir dados existentes

