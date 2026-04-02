

## Reconhecimento de Feriados no Agendador

### Objetivo
Adicionar uma lista de feriados nacionais, estaduais (PE) e municipais (Recife) para que o agendador:
1. Pule feriados ao calcular `next_run_at` (não dispara execução)
2. Mostre um aviso visual no card quando a próxima execução cairia em feriado
3. Mostre os próximos feriados no formulário de criação/edição

### Mudanças

**Novo arquivo: `src/lib/holidays.ts`**

Criar um módulo com a lista completa de feriados para 2025-2027 (extensível), incluindo:

- **Nacionais**: Confraternização, Carnaval (seg+ter), Sexta-feira Santa, Tiradentes, Dia do Trabalho, Corpus Christi, Independência, Nossa Senhora Aparecida, Finados, Proclamação da República, Natal
- **Estaduais (PE)**: Revolução Pernambucana (6/mar), São João (24/jun)
- **Municipais (Recife)**: Nossa Senhora do Carmo (16/jul), emancipação e outros feriados locais

Feriados móveis (Carnaval, Páscoa, Corpus Christi) serão calculados programaticamente a partir da fórmula da Páscoa (algoritmo de Meeus/Jones/Butcher).

Exportar:
- `isHoliday(date: Date): { holiday: boolean; name?: string; scope?: string }`
- `getNextHolidays(count: number): { date: Date; name: string; scope: string }[]`

**Arquivo: `src/hooks/useSchedules.ts`**

- Modificar `getNextRunFromCron()` para pular datas que são feriado ao calcular a próxima execução — se o candidato cai em feriado, avança para o próximo dia válido
- Exportar uma função `getNextRunInfo()` que retorna `{ nextRun: Date; skippedHoliday?: { date: Date; name: string } }` para o UI mostrar avisos

**Arquivo: `src/pages/SchedulerPage.tsx`**

- No `ScheduleCard`: se a próxima execução originalmente cairia em feriado mas foi pulada, mostrar badge/aviso amarelo: "⚠️ Feriado pulado: [nome] em [data]"
- No `ScheduleForm`: mostrar alerta se algum dos próximos 3 dias úteis do agendamento é feriado
- Adicionar seção colapsável "Próximos feriados" no rodapé da página com os próximos 5 feriados

### Detalhes técnicos

- Feriados móveis calculados via algoritmo da Páscoa (puro JS, sem dependências externas)
- Comparação por data no fuso de Recife (UTC-3), usando o offset fixo já existente
- A lista de feriados cobre 2025-2027; para anos futuros, os feriados fixos são gerados automaticamente e os móveis são calculados
- O `next_run_at` salvo no banco já pula feriados, então a edge function `trigger-schedules` não precisa de mudanças

