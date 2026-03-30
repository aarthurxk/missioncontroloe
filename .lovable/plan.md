

## Bolinhas funcionais + Output real do terminal da VPS

### O que será feito

1. **Substituir as bolinhas decorativas por botões funcionais** no header do LiveTerminal:
   - 🔴 **Vermelha → Parar/Fechar**: Para a execução (se rodando) ou fecha o terminal
   - 🟡 **Amarela → Limpar output**: Limpa o log visível no terminal (visual only, não apaga do banco)
   - 🟢 **Verde → Scroll ao fim**: Rola até o final do output (equivalente ao "Ir ao fim" atual)

2. **O output já é do terminal da VPS** — o `agent_bridge.py` captura o `stdout` do script via `subprocess.Popen` e faz streaming para a coluna `log_output` da tabela `executions`. O LiveTerminal já exibe isso em tempo real via Realtime subscription. Não há mudança de arquitetura necessária aqui.

### Arquivo: `src/components/LiveTerminal.tsx`

**Mudanças no header do terminal:**
- Remover as 3 `div` decorativas com cores fixas
- No lugar, renderizar 3 botões circulares interativos com tooltips:
  - **Vermelho** (`onClick`): se `isRunning`, chama `handleStop()`; senão, não faz nada (ou fica desabilitado)
  - **Amarelo** (`onClick`): `setLog("")` — limpa o output visualmente
  - **Verde** (`onClick`): scroll to bottom + `setAutoScroll(true)`
- Cada bolinha mantém o visual (mesmo tamanho/cor) mas ganha `cursor-pointer`, `hover:brightness`, e um `Tooltip` explicativo
- Remover o botão "Ir ao fim" separado (agora é a bolinha verde)

