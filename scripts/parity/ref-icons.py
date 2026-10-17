"""Resolve minified lucide icon identifiers in the exported official bundle.

Usage: python scripts/parity/ref-icons.py <chunk-prefix> [IDENT ...]
Example: python scripts/parity/ref-icons.py workspace-bootstrap St He _t
Without identifiers, prints every icon import of the chunk.
"""

import glob
import re
import sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[2] / ".cache/ref/web/assets"


def ui_icons() -> dict[str, str]:
    ui = Path(glob.glob(str(ASSETS / "ui-*.js"))[0]).read_text(encoding="utf-8")
    local = dict(re.findall(r"([A-Za-z_$][\w$]{0,3})=\w{1,3}\(`([a-z][a-z0-9-]+)`,\[\[`", ui))
    exported = {}
    for body in re.findall(r"export\{([^}]+)\}", ui):
        for part in body.split(","):
            name, _, alias = part.partition(" as ")
            exported[(alias or name).strip()] = name.strip()
    return {e: local[n] for e, n in exported.items() if n in local}


def main() -> None:
    prefix, wanted = sys.argv[1], sys.argv[2:]
    icons = ui_icons()
    chunk = Path(glob.glob(str(ASSETS / f"{prefix}-*.js"))[0]).read_text(encoding="utf-8")
    mapping = {}
    for body in re.findall(r'import\{([^}]+)\}from"\./ui-[^"]+"', chunk[:200000]):
        for part in body.split(","):
            name, _, alias = part.partition(" as ")
            if name.strip() in icons:
                mapping[(alias or name).strip()] = icons[name.strip()]
    for ident in wanted or sorted(mapping):
        print(f"{ident}\t{mapping.get(ident, '?')}")


if __name__ == "__main__":
    main()
