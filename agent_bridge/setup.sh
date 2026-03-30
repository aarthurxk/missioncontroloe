#!/bin/bash
# Mission Control — Setup da VPS
# Execute com: bash setup.sh

set -e

# ── Configurações — altere se necessário ──
USER_HOME="/home/ubuntu"
INSTALL_DIR="$USER_HOME/missioncontrol"
SERVICE_USER="ubuntu"

echo ""
echo "==================================================="
echo "  Mission Control — Setup do Agent Bridge"
echo "==================================================="
echo ""

# 1. Instalar dependências Python
echo "[1/4] Instalando dependências Python..."
pip3 install requests --quiet
echo "      ✓ requests instalado"

# 2. Criar pasta de instalação
echo "[2/4] Criando pasta $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp agent_bridge.py "$INSTALL_DIR/agent_bridge.py"
echo "      ✓ agent_bridge.py copiado"

# 3. Instalar serviço systemd
echo "[3/4] Instalando serviço systemd..."
# Substituir usuário e caminho no arquivo de serviço
sed \
  -e "s|User=ubuntu|User=$SERVICE_USER|g" \
  -e "s|/home/ubuntu/missioncontrol|$INSTALL_DIR|g" \
  agent-bridge.service > /etc/systemd/system/agent-bridge.service

systemctl daemon-reload
systemctl enable agent-bridge
echo "      ✓ Serviço instalado e habilitado"

# 4. Iniciar serviço
echo "[4/4] Iniciando serviço..."
systemctl start agent-bridge
sleep 2

if systemctl is-active --quiet agent-bridge; then
  echo "      ✓ Serviço rodando!"
else
  echo "      ⚠️  Serviço não iniciou. Veja os logs: journalctl -u agent-bridge -n 30"
fi

echo ""
echo "==================================================="
echo "  Pronto! Próximos passos:"
echo ""
echo "  1. Edite ROBOT_SCRIPTS em:"
echo "     $INSTALL_DIR/agent_bridge.py"
echo ""
echo "  2. Ver logs ao vivo:"
echo "     sudo journalctl -u agent-bridge -f"
echo ""
echo "  3. Reiniciar após editar:"
echo "     sudo systemctl restart agent-bridge"
echo ""
echo "  4. Parar o serviço:"
echo "     sudo systemctl stop agent-bridge"
echo "==================================================="
echo ""
