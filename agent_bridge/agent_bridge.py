"""
Mission Control — Agent Bridge
Conecta automaticamente com os robôs cadastrados no portal.

Como usar:
  1. python3 agent_bridge.py
  2. Ou como serviço: systemctl start agent-bridge

Os caminhos dos scripts são configurados direto no portal (Config → Robôs → campo "Caminho do script").
Não é necessário editar este arquivo para adicionar novos robôs.
"""

import subprocess
import threading
import time
import socket
import platform
import os
import sys
import requests
from datetime import datetime, timezone

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://yzlvbarddjsrsbaffssm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHZiYXJkZGpzcnNiYWZmc3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjYyNTQsImV4cCI6MjA4ODY0MjI1NH0.mAP51Qsiy78GJYtjWfq851ZN_KmdrdYjmQBaDfB5rzA"

# ── Configurações ─────────────────────────────────────────────────────────────
POLL_INTERVAL      = 5   # segundos entre cada checagem
LOG_FLUSH_LINES    = 10  # envia log ao Supabase a cada N linhas
MAX_PARALLEL       = 3   # máximo de robôs rodando ao mesmo tempo
HEARTBEAT_INTERVAL = 30  # segundos entre cada heartbeat
PUSH_SECRET        = os.environ.get("MISSION_CONTROL_PUSH_SECRET", "")

# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

running_executions: set[str] = set()
lock = threading.Lock()
last_heartbeat: float = 0


def detect_host() -> str:
    system = platform.system()
    if system == "Windows":
        return "local-pc"
    hostname = socket.gethostname().lower()
    if "localhost" in hostname or "desktop" in hostname or "notebook" in hostname:
        return "local-pc"
    if system == "Linux" and not os.environ.get("DISPLAY"):
        return "vps-cloud"
    return "local-pc"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def patch_execution(exec_id: str, data: dict):
    try:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/executions?id=eq.{exec_id}",
            headers=HEADERS,
            json=data,
            timeout=10,
        )
    except Exception as e:
        print(f"[bridge] Erro ao atualizar execução {exec_id}: {e}", flush=True)


def get_status(exec_id: str) -> str:
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/executions?id=eq.{exec_id}&select=status",
            headers=HEADERS,
            timeout=10,
        )
        data = r.json()
        return data[0]["status"] if data else "unknown"
    except Exception:
        return "unknown"


def get_script_path(robot_id: str) -> str | None:
    """Busca o script_path do robô direto do Supabase."""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/robots?id=eq.{robot_id}&select=script_path,name",
            headers=HEADERS,
            timeout=10,
        )
        data = r.json()
        if data:
            return data[0].get("script_path")
        return None
    except Exception as e:
        print(f"[bridge] Erro ao buscar script_path: {e}", flush=True)
        return None


def send_heartbeat():
    """Avisa o portal que o bridge está vivo."""
    global last_heartbeat
    now = time.time()
    if now - last_heartbeat < HEARTBEAT_INTERVAL:
        return
    last_heartbeat = now
    try:
        ts = datetime.now(timezone.utc).isoformat()
        host = detect_host()
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/bridge_status?id=eq.singleton",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json={"last_seen": ts, "host": host, "updated_at": ts},
            timeout=5,
        )
        print(f"[bridge] ♥ Heartbeat enviado ({host})", flush=True)
    except Exception as e:
        print(f"[bridge] Heartbeat falhou: {e}", flush=True)


def poll_pending() -> list[dict]:
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/executions"
            f"?status=eq.pending&select=id,robot_id&order=started_at.asc&limit=10",
            headers=HEADERS,
            timeout=10,
        )
        return r.json() if r.ok else []
    except Exception as e:
        print(f"[bridge] Erro no poll: {e}", flush=True)
        return []


def build_command(script_path: str) -> list[str]:
    """Monta o comando certo para .py ou .bat."""
    ext = os.path.splitext(script_path)[1].lower()
    if ext == ".bat":
        return ["cmd.exe", "/c", script_path] if platform.system() == "Windows" else ["bash", script_path]
    if ext == ".sh":
        return ["bash", script_path]
    return [sys.executable, "-u", script_path]


def run_robot(exec_id: str, robot_id: str):
    with lock:
        running_executions.add(exec_id)

    source_host = detect_host()

    # ── Busca o script_path do Supabase ──
    script_path = get_script_path(robot_id)

    if not script_path:
        print(f"[bridge] ⚠️  Robô {robot_id[:8]} sem script configurado no portal", flush=True)
        patch_execution(exec_id, {
            "status": "error",
            "error_message": (
                "Nenhum script configurado para este robô.\n"
                "Vá em Config → Robôs → edite o robô e preencha o campo 'Caminho do script'."
            ),
            "source_host": source_host,
            "finished_at": now_iso(),
        })
        with lock:
            running_executions.discard(exec_id)
        return

    if not os.path.isfile(script_path):
        print(f"[bridge] ⚠️  Arquivo não encontrado: {script_path}", flush=True)
        patch_execution(exec_id, {
            "status": "error",
            "error_message": f"Arquivo não encontrado na VPS: {script_path}",
            "source_host": source_host,
            "finished_at": now_iso(),
        })
        with lock:
            running_executions.discard(exec_id)
        return

    print(f"[bridge] ▶  {robot_id[:8]} → {script_path}", flush=True)
    start_time = time.time()
    log_buffer = ""
    line_count = 0

    patch_execution(exec_id, {
        "status": "running",
        "started_at": now_iso(),
        "source_host": source_host,
    })

    try:
        cmd = build_command(script_path)
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        cancelled = False

        def stream_logs():
            nonlocal log_buffer, line_count, cancelled
            for line in process.stdout:
                print(f"  [{robot_id[:8]}] {line}", end="", flush=True)
                log_buffer += line
                line_count += 1

                if line_count % LOG_FLUSH_LINES == 0:
                    patch_execution(exec_id, {"log_output": log_buffer})

                if line_count % 5 == 0:
                    if get_status(exec_id) == "cancelling":
                        cancelled = True
                        process.terminate()
                        print(f"[bridge] ⏹  {robot_id[:8]} cancelado", flush=True)
                        break

            patch_execution(exec_id, {"log_output": log_buffer})

        log_thread = threading.Thread(target=stream_logs, daemon=True)
        log_thread.start()
        log_thread.join()
        process.wait()

        duration = int(time.time() - start_time)

        if cancelled or get_status(exec_id) == "cancelling":
            patch_execution(exec_id, {
                "status": "cancelled",
                "log_output": log_buffer,
                "duration_seconds": duration,
                "finished_at": now_iso(),
            })
            print(f"[bridge] ✓  {robot_id[:8]} cancelado ({duration}s)", flush=True)

        elif process.returncode == 0:
            patch_execution(exec_id, {
                "status": "success",
                "log_output": log_buffer,
                "duration_seconds": duration,
                "finished_at": now_iso(),
            })
            print(f"[bridge] ✅  {robot_id[:8]} sucesso ({duration}s)", flush=True)

        else:
            last_lines = "\n".join(log_buffer.strip().splitlines()[-10:])
            patch_execution(exec_id, {
                "status": "error",
                "log_output": log_buffer,
                "error_message": f"Código de saída {process.returncode}\n\nÚltimas linhas:\n{last_lines}",
                "duration_seconds": duration,
                "finished_at": now_iso(),
            })
            print(f"[bridge] ❌  {robot_id[:8]} erro código {process.returncode} ({duration}s)", flush=True)

    except Exception as e:
        duration = int(time.time() - start_time)
        patch_execution(exec_id, {
            "status": "error",
            "log_output": log_buffer,
            "error_message": str(e),
            "duration_seconds": duration,
            "finished_at": now_iso(),
        })
        print(f"[bridge] ❌  Exceção: {e}", flush=True)

    finally:
        with lock:
            running_executions.discard(exec_id)


def main():
    print("=" * 55, flush=True)
    print("  Mission Control — Agent Bridge", flush=True)
    print(f"  Host detectado : {detect_host()}", flush=True)
    print(f"  Poll interval  : {POLL_INTERVAL}s", flush=True)
    print(f"  Max paralelo   : {MAX_PARALLEL}", flush=True)
    print(f"  Scripts        : configurados pelo portal", flush=True)
    print("=" * 55, flush=True)

    while True:
        try:
            send_heartbeat()

            with lock:
                slots = MAX_PARALLEL - len(running_executions)

            if slots > 0:
                pending = poll_pending()
                for item in pending[:slots]:
                    exec_id  = item["id"]
                    robot_id = item["robot_id"]
                    with lock:
                        if exec_id in running_executions:
                            continue
                    t = threading.Thread(target=run_robot, args=(exec_id, robot_id), daemon=True)
                    t.start()

        except Exception as e:
            print(f"[bridge] Erro crítico: {e}", flush=True)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
