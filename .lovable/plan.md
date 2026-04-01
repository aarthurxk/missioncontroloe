

## Corrigir overflow do texto de erro nos cards do Mission Queue

### Problema
A mensagem de erro nos cards de execução concluída está saindo da coluna porque o card não está respeitando os limites de largura da coluna do grid.

### Mudanças

**Arquivo: `src/components/MissionQueue.tsx`**

1. **ExecutionCard** (linha 89-94): Adicionar `min-w-0` ao container raiz do card para que ele respeite o limite de largura do parent (grid column):
   ```
   "rounded-lg border bg-card overflow-hidden transition-colors min-w-0"
   ```

2. **Linha do conteúdo principal** (linha 97): Garantir que a row inteira também tem `overflow-hidden`:
   ```
   "flex items-center gap-1.5 px-2.5 py-1.5 min-w-0 overflow-hidden"
   ```

Essas duas mudanças garantem que o `truncate` na mensagem de erro e no nome do robô funcionem corretamente dentro das colunas do grid de 3 colunas.

