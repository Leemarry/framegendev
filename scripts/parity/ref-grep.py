"""Find a string in the exported official bundle and print surrounding code.

Usage: python scripts/parity/ref-grep.py <text> [--before N] [--after N] [--max K] [--file GLOB]
Searches .cache/ref/web/assets/*.js (see export-official-web.py).
"""

import argparse
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("text")
    parser.add_argument("--before", type=int, default=400)
    parser.add_argument("--after", type=int, default=800)
    parser.add_argument("--max", type=int, default=3)
    parser.add_argument("--file", default="*.js")
    args = parser.parse_args()

    shown = 0
    for path in sorted(glob.glob(str(ROOT / ".cache/ref/web/assets" / args.file))):
        src = Path(path).read_text(encoding="utf-8", errors="replace")
        start = 0
        while shown < args.max:
            i = src.find(args.text, start)
            if i < 0:
                break
            print(f"== {Path(path).name} @{i}")
            print(src[max(0, i - args.before) : i + len(args.text) + args.after])
            print()
            shown += 1
            start = i + len(args.text)
        if shown >= args.max:
            break


if __name__ == "__main__":
    main()
