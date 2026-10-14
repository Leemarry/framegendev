"""Offline checks for the portable design bundle; never runs production tools."""
import argparse
import ast
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

from PIL import Image


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--source-root', type=Path, default=Path('E:/AI/framegendev'))
    args = parser.parse_args()
    root = args.bundle.resolve()
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8-sig'))
    failures, warnings, image_sizes = [], [], {}
    counts = {'files': 0, 'copies_checked': 0, 'images': 0, 'links': 0,
              'python_scripts': 0, 'code_anchors': 0, 'text_files_scanned': 0}
    declared = set()
    for entry in manifest['files']:
        relative = entry['path']
        target = (root / relative).resolve()
        if not target.is_relative_to(root) or relative in declared:
            failures.append(f'Invalid or duplicate manifest path: {relative}')
            continue
        declared.add(relative)
        if not target.is_file():
            failures.append(f'Missing: {relative}')
            continue
        counts['files'] += 1
        if sha256(target) != entry['sha256'] or target.stat().st_size != entry['bytes']:
            failures.append(f'Hash/size mismatch: {relative}')
        if entry.get('origin'):
            original = Path(entry['origin'])
            if original.is_file():
                if sha256(original) != entry['sha256']:
                    warnings.append(f'Source changed since snapshot: {relative}')
                else:
                    counts['copies_checked'] += 1
            else:
                warnings.append(f'Original unavailable; package hash checked: {relative}')
        if target.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
            try:
                with Image.open(target) as img:
                    size = list(img.size)
                    img.verify()
                image_sizes[relative] = size
                counts['images'] += 1
                if relative.startswith('03-designs/') and size != [1920, 1200]:
                    failures.append(f'Unexpected layout size: {relative}')
            except Exception as error:
                failures.append(f'Image cannot decode: {relative}: {type(error).__name__}')
        if target.suffix.lower() in {'.md', '.txt', '.json', '.csv', '.py', '.ps1'}:
            try:
                content = target.read_text(encoding='utf-8-sig')
            except UnicodeDecodeError:
                failures.append(f'Text cannot decode as UTF-8: {relative}')
                continue
            counts['text_files_scanned'] += 1
            if re.search(r'sk-[A-Za-z0-9_-]{20,}', content):
                failures.append(f'Possible plaintext credential: {relative}')
            if target.suffix == '.py':
                try:
                    ast.parse(content, filename=relative)
                    counts['python_scripts'] += 1
                except SyntaxError:
                    failures.append(f'Python syntax: {relative}')
            # Historical source copies retain their original repository links.
            if target.suffix == '.md' and not relative.startswith(('04-snapshots/', '02-references/')):
                for link in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', content):
                    link = link.strip().strip('<>').split('#', 1)[0]
                    if not link or re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', link):
                        continue
                    resolved = (target.parent / unquote(link)).resolve()
                    counts['links'] += 1
                    is_report = resolved == root / 'verification.json'
                    if not resolved.is_relative_to(root) or (not is_report and not resolved.exists()):
                        failures.append(f'Broken/nonportable link: {relative} -> {link}')
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    extra = actual - declared - {'manifest.json', 'verification.json'}
    if extra:
        failures.append('Unlisted files: ' + ', '.join(sorted(extra)))
    expected = {'02-references/user': 8, '03-designs/v1': 3, '03-designs/v2': 3}
    for directory, number in expected.items():
        found = sum(p.startswith(directory + '/') for p in image_sizes)
        if found != number:
            failures.append(f'Expected {number} images in {directory}, found {found}')
    evidence = json.loads((root / '05-evidence/code-evidence.json').read_text(encoding='utf-8'))
    for entry in evidence['entries']:
        source = args.source_root / entry['path']
        if not source.is_file():
            warnings.append('Code unavailable: ' + entry['path'])
            continue
        content = source.read_text(encoding='utf-8-sig')
        if entry['anchor'] not in content:
            warnings.append('Code anchor changed: ' + entry['path'])
        elif sha256(source) != entry['sha256']:
            warnings.append('Code changed since evidence: ' + entry['path'])
        else:
            counts['code_anchors'] += 1
    result = {
        'checked_at': datetime.now(timezone.utc).isoformat(),
        'status': 'passed' if not failures else 'failed', 'counts': counts,
        'image_sizes': image_sizes, 'failures': failures, 'warnings': warnings,
        'limitations': ['Offline archive checks only; no product build or runtime acceptance.',
                        'Historical reference/snapshot Markdown links are not portable-link checked.',
                        'Source changes are reported; frozen snapshots retain their captured content.',
                        'Credential check detects common plaintext key patterns, not all possible secrets.'],
    }
    (root / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'counts': counts, 'failures': failures,
                      'warnings': warnings}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
