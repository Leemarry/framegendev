"""Verify task-owned design artifacts; does not run app or provider requests."""
import ast
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'docs/superpowers/specs/2026-10-14-automation-workbench'
DOCUMENTS = [
    ROOT / 'AGENTS.md',
    ROOT / '.trellis/spec/guides/index.md',
    ROOT / '.trellis/spec/guides/comic-production.md',
    ROOT / 'docs/superpowers/specs/2026-10-14-automation-workbench-design.md',
    *[ROOT / 'docs/parity-0.1.17' / name for name in ['README.md', 'REQUIREMENTS.md', 'TASKS.md', 'DECISIONS.md', 'CURRENT-HANDOFF.md']],
    *[Path(__file__).parent / name for name in ['prd.md', 'design.md', 'implement.md', 'result.md']],
]

def main():
    images = []
    for name in ['04-character-linkage-v2.png', '05-editable-storyboard-v2.png', '06-media-canvas-v2.png', 'toonflow-live-nodes.png', 'toonflow-live-selected.png']:
        with Image.open(ART / name) as image:
            image.verify()
        with Image.open(ART / name) as image:
            images.append({'name': name, 'size': list(image.size), 'mode': image.mode})
            if 'v2' in name:
                assert image.size == (1920, 1200)
    for name in ['render-layouts-v2.py', 'references.py']:
        ast.parse((ART / name).read_text(encoding='utf-8'))
    for document in DOCUMENTS:
        for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
            if '://' in target or target.startswith('#'):
                continue
            target = target.split('#')[0].strip('<>')
            assert (document.parent / target).exists(), f'{document}: {target}'
    for filename, prefix in [('REQUIREMENTS.md', 'REQ'), ('TASKS.md', 'TASK')]:
        text = (ROOT / 'docs/parity-0.1.17' / filename).read_text(encoding='utf-8')
        ids = re.findall(r'^\| (' + prefix + r'-\d+)\s*\|', text, re.M)
        assert len(ids) == len(set(ids)), f'duplicate {prefix} row'
    report = {'images': images, 'python_ast': 'passed', 'document_links': 'passed', 'requirement_task_row_ids': 'unique', 'product_checks': 'not run', 'provider_calls_this_revision': 0}
    (ART / 'v2-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__':
    main()
