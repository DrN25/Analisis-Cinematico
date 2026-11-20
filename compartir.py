import os
import re
import sys
import time
import shutil
import subprocess
import threading
import urllib.request
import webbrowser

CLOUDFLARED_EXE = "cloudflared.exe"
CLOUDFLARED_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
FRONTEND_PORT = 5175
BACKEND_PORT = 8002


def kill_process_on_port(port: int):
    try:
        subprocess.call(
            f'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :{port} ^| findstr LISTENING\') do taskkill /f /pid %a >nul 2>&1',
            shell=True,
        )
    except Exception:
        pass


def download_cloudflared():
    global CLOUDFLARED_EXE
    if os.path.exists(CLOUDFLARED_EXE):
        return True
    if shutil.which("cloudflared"):
        CLOUDFLARED_EXE = "cloudflared"
        return True

    print("--> Descargando cloudflared.exe desde Cloudflare...")
    try:
        urllib.request.urlretrieve(CLOUDFLARED_URL, CLOUDFLARED_EXE)
        print("--> cloudflared.exe descargado.")
        return True
    except Exception as exc:
        print(f"Error al descargar cloudflared: {exc}")
        return False


def start_tunnel():
    print(f"--> Iniciando túnel de Cloudflare para Frontend (puerto {FRONTEND_PORT})...")
    cmd = [
        CLOUDFLARED_EXE,
        "tunnel",
        "--protocol", "http2",
        "--url", f"http://127.0.0.1:{FRONTEND_PORT}",
        "--no-autoupdate",
        "--edge-ip-version", "4",
    ]
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        bufsize=1,
    )

    tunnel_url = None
    start_time = time.time()
    while time.time() - start_time < 45:
        line = process.stderr.readline()
        if not line:
            time.sleep(0.2)
            continue
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            tunnel_url = match.group(0)
            break

    if not tunnel_url:
        process.terminate()
        raise RuntimeError("No se pudo obtener la URL del túnel de Cloudflare en 45 segundos.")

    def consume_stderr(proc):
        try:
            for _ in proc.stderr:
                pass
        except Exception:
            pass

    threading.Thread(target=consume_stderr, args=(process,), daemon=True).start()
    return process, tunnel_url


def main():
    print("=" * 72)
    print("   GEMA-CINEMÁTICO — COMPARTIR TEMPORALMENTE CON CLOUDFLARE TUNNEL")
    print("=" * 72)

    kill_process_on_port(FRONTEND_PORT)
    kill_process_on_port(BACKEND_PORT)
    subprocess.call("taskkill /f /im cloudflared.exe >nul 2>&1", shell=True)

    if not download_cloudflared():
        sys.exit(1)

    tunnel_proc = None
    try:
        py_cmd = r"venv\Scripts\python.exe" if os.path.exists(r"backend\venv\Scripts\python.exe") else "python"
        print("--> Iniciando Backend (FastAPI :8002)...")
        subprocess.Popen(
            f'start "GEMA-Cinemático Backend" cmd /k "cd backend && {py_cmd} run.py"',
            shell=True,
        )

        print("--> Iniciando Frontend (React + Vite :5175)...")
        subprocess.Popen(
            'start "GEMA-Cinemático Frontend" cmd /k "cd frontend && npm run dev"',
            shell=True,
        )

        time.sleep(3)
        tunnel_proc, tunnel_url = start_tunnel()

        print("\n" + "=" * 72)
        print("   URL PÚBLICA TEMPORAL:")
        print(f"   {tunnel_url}")
        print("=" * 72)
        print("   Usuario inicial: ADMIN  |  Clave inicial: Admin2026!")
        print("   Mantén esta ventana abierta. Presiona ENTER para detener todo...")

        webbrowser.open(tunnel_url)
        input()
    except KeyboardInterrupt:
        print("\nDetenido por el usuario.")
    finally:
        if tunnel_proc:
            tunnel_proc.terminate()
        kill_process_on_port(FRONTEND_PORT)
        kill_process_on_port(BACKEND_PORT)
        subprocess.call("taskkill /f /im cloudflared.exe >nul 2>&1", shell=True)
        print("--> Servidores y túnel detenidos.")


if __name__ == "__main__":
    main()
