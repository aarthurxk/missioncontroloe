

## Problema: Horário do agendamento em UTC vs horário do Brasil

O sistema salva o cron com a hora que você digita (ex: `08:00`), mas o mecanismo que dispara as execuções interpreta essa hora como **UTC**. Resultado: 08:00 UTC = 05:00 no horário de Brasília.

### Solução

Converter a hora local (BRT, UTC-3) para UTC antes de salvar o cron expression, e converter de volta para horário local ao exibir.

### Mudanças

**`src/hooks/useSchedules.ts`**

1. `buildCronExpression()` — receber a hora em horário local e converter para UTC antes de montar o cron:
   - Ex: usuário digita 08:00 BRT → cron salva `0 11 * * ...` (UTC)

2. `parseCronToDisplay()` — converter a hora UTC do cron de volta para horário local ao exibir:
   - Ex: cron `0 11 * * ...` → exibe "08:00" para quem está em UTC-3

3. `getNextRunFromCron()` — já usa `new Date()` (local), mas precisa considerar que o cron agora está em UTC

**`src/pages/SchedulerPage.tsx`**

4. `parsedTime()` no formulário de edição — converter a hora UTC do cron de volta para horário local para preencher o campo de hora corretamente

### Detalhes técnicos

- Usar `Date` para converter: criar uma data UTC com a hora do cron e extrair `.getHours()` / `.getMinutes()` locais (e vice-versa)
- Não mexe no banco de dados nem nas migrações
- Os agendamentos existentes precisarão ser re-salvos pelo usuário (ou podemos fazer uma correção em lote via SQL adicionando +3h aos cron expressions existentes)

### Correção dos agendamentos existentes

Opcionalmente, uma query SQL para corrigir os 3 agendamentos atuais, adicionando 3 horas à hora UTC do cron (ex: `0 8` → `0 11`, `22 9` → `22 12`, `30 19` → `30 22`).

