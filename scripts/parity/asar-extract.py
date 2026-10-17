#!/usr/bin/env python3
"""Extract files from an Electron .asar archive without extra dependencies.

The official MediaGo Drama desktop shell ships its main process inside
`resources/app.asar`. Reading it is part of the 0.1.17 parity work, so this
script implements the (small) asar container format directly:

* bytes 0..3   uint32 little-endian: pickle header size (always 4)
* bytes 4..7   uint32: size of the directory pickle payload
* bytes 8..11  uint32: size of the directory pickle payload (duplicated)
* bytes 12..15 uint32: size of the JSON directory string
* bytes 16..   the JSON directory tree
* data area starts at 16 + json size; every file entry has offset/size

Usage:
  python scripts/parity/asar-extract.py <app.asar> --list
  python scripts/parity/asar-extract.py <app.asar> --out DIR main.js preload.cjs
  python scripts/parity/asar-extract.py <app.asar> --out DIR --all
"""

from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path

HEADER_BYTES = 16


def read_tree(blob: bytes) -> tuple[dict, int]:
    """Decode the directory tree and return it with the data-area offset."""
    pickle_size = struct.unpack("<I", blob[0:4])[0]
    if pickle_size != 4:
        raise SystemExit(f"unexpected pickle header size: {pickle_size}")
    json_size = struct.unpack("<I", blob[12:16])[0]
    header = blob[HEADER_BYTES:HEADER_BYTES + json_size].decode("utf-8", "replace")
    return json.loads(header), HEADER_BYTES + json_size


def walk(node: dict, prefix: str = "") -> list[tuple[str, int, int]]:
    entries: list[tuple[str, int, int]] = []
    for name, entry in node.get("files", {}).items():
        path = f"{prefix}/{name}" if prefix else name
        if "files" in entry:
            entries.extend(walk(entry, path))
        else:
            entries.append((path, int(entry.get("offset", 0)), int(entry.get("size", 0))))
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description="List or extract files from an asar archive")
    parser.add_argument("archive", type=Path)
    parser.add_argument("--out", type=Path, help="directory to write extracted files into")
    parser.add_argument("--list", action="store_true", help="print every entry path and size")
    parser.add_argument("--all", action="store_true", help="extract every entry")
    parser.add_argument("names", nargs="*", help="entry paths to extract, e.g. main.js")
    args = parser.parse_args()

    blob = args.archive.read_bytes()
    tree, data_start = read_tree(blob)
    entries = walk(tree)
    print(f"{args.archive.name}: {len(entries)} entries, data starts at {data_start}", file=sys.stderr)

    if args.list or (not args.out and not args.names):
        for path, _offset, size in sorted(entries):
            print(f"{size:>10}  {path}")
        return 0

    if not args.out:
        raise SystemExit("--out is required when extracting")

    wanted = None if args.all else set(args.names)
    if not args.all and not wanted:
        raise SystemExit("pass entry names, or --all")

    written = 0
    for path, offset, size in entries:
        if wanted is not None and path not in wanted:
            continue
        target = args.out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        start = data_start + offset
        target.write_bytes(blob[start:start + size])
        print(f"wrote {target} ({size} bytes)", file=sys.stderr)
        written += 1

    if written == 0:
        raise SystemExit("no entry matched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
