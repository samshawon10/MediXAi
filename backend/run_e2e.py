"""Build first, then run browser tests with three supervised local services.

Run: .venv/Scripts/python.exe backend/run_e2e.py [Playwright arguments]
Uses existing healthy services when already running. Terminates only owned processes.
"""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".runtime"
RUNTIME.mkdir(exist_ok=True)


def ready(url):
    try:
        with urlopen(url, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def main():
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node is required")
    processes, logs = [], []
    services = [
        ("ml", ROOT, [sys.executable, "-m", "uvicorn", "main:app", "--app-dir", "backend/ml-service", "--host", "127.0.0.1", "--port", "8000", "--no-access-log"], "http://127.0.0.1:8000/health"),
        ("gateway", ROOT / "backend/express", [node, "--env-file-if-exists=.env", "server.js"], "http://127.0.0.1:5000/api/health"),
        ("frontend", ROOT / "frontend", [node, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"], "http://localhost:3000"),
    ]
    try:
        for name, cwd, command, url in services:
            if ready(url):
                print(f"Using healthy {name}", flush=True)
                continue
            log = open(RUNTIME / f"{name}-e2e.log", "w", encoding="utf-8")
            logs.append(log)
            proc = subprocess.Popen(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT,
                                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            processes.append(proc)
            deadline = time.monotonic() + 90
            while not ready(url):
                if proc.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError(f"{name} startup failed; see .runtime/{name}-e2e.log")
                time.sleep(0.5)
            print(f"Started {name}", flush=True)
        subprocess.run([sys.executable, "backend/integration_smoke.py"], cwd=ROOT, check=True)
        result = subprocess.run([node, "node_modules/@playwright/test/cli.js", "test", *sys.argv[1:]], cwd=ROOT / "frontend")
        return result.returncode
    finally:
        for proc in reversed(processes):
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
        for log in logs:
            log.close()


if __name__ == "__main__":
    sys.exit(main())
