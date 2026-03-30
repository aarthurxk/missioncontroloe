

## Adicionar botões "Limpar" em cada coluna da Mission Queue

### O que será feito
Adicionar um botão de deletar/limpar no header de cada coluna (Pendentes, In Progress, Concluídas Hoje) que apaga todas as execuções daquela coluna. O botão só aparece quando há itens na coluna, e exibe um diálogo de confirmação antes de deletar.

### Implementação

**Arquivo: `src/components/MissionQueue.tsx`**

1. Importar `Trash2` do lucide-react e `AlertDialog` components
2. Atualizar o componente `Column` para aceitar uma prop `onClear` opcional e o count
3. Quando `onClear` está presente e `count > 0`, renderizar um botão com ícone de lixeira no header da coluna
4. Criar um `AlertDialog` de confirmação ("Tem certeza que deseja deletar X execuções?")
5. No `MissionQueue`, criar 3 handlers:
   - `clearPending`: deleta execuções com `status = 'pending'` dos IDs filtrados
   - `clearRunning`: deleta execuções com `status in ('running', 'cancelling')` dos IDs filtrados
   - `clearCompleted`: deleta execuções concluídas hoje dos IDs filtrados
6. Cada handler faz `supabase.from('executions').delete().in('id', ids)` e invalida o query cache
7. No mobile, adicionar o mesmo botão no feed

### Detalhes técnicos
- Deletar por array de IDs (não por status genérico) para evitar apagar dados de outros dias
- Usar `AlertDialog` já existente no projeto para confirmação
- Invalidar `queryKey: ["executions"]` após delete
- Toast de sucesso após limpar

