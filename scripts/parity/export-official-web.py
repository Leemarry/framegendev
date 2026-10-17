"""Export the official MediaGo Drama 0.1.17 web bundle as a local reference.

The official renderer is embedded in resources/bin/drama-server.exe. This script
starts that server against an isolated workspace, downloads index.html and every
embedded asset, then stops the server. Output goes to .cache/ref/web (gitignored).

Usage: python scripts/parity/export-official-web.py [--exe PATH] [--port 56990]
"""

import argparse
import re
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EXE = Path("E:/AI/MediaGo Drama/resources/bin/drama-server.exe")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=DEFAULT_EXE)
    parser.add_argument("--port", type=int, default=56990)
    args = parser.parse_args()

    out = ROOT / ".cache/ref/web"
    workspace = ROOT / ".cache/ref/official-ws"
    (out / "assets").mkdir(parents=True, exist_ok=True)
    workspace.mkdir(parents=True, exist_ok=True)

    names = sorted(
        {m.group(0).decode() for m in re.finditer(rb"assets/[\w\-.]+\.(?:js|css)", args.exe.read_bytes())}
    )
    env = {"MEDIAGO_SERVER_PORT": str(args.port), "MEDIAGO_SERVER_HOST": "127.0.0.1"}
    server = subprocess.Popen(
        [str(args.exe), "serve", "-workspace", str(workspace)],
        env={**__import__("os").environ, **env},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{args.port}/"
    try:
        for _ in range(30):
            try:
                (out / "index.html").write_bytes(urllib.request.urlopen(base, timeout=2).read())
                break
            except OSError:
                time.sleep(1)
        else:
            raise SystemExit("official server did not start")
        for name in names:
            (out / name).write_bytes(urllib.request.urlopen(base + name, timeout=10).read())
        print(f"exported {len(names)} assets to {out}")
    finally:
        server.terminate()


if __name__ == "__main__":
    main()
