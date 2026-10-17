"""Dump DOM outlines (tag.class + text) and screenshots of several routes via browser-harness.

Usage (git bash):
  export BU_NAME=parity BU_CDP_URL=http://127.0.0.1:31599 PYTHONUTF8=1 MSYS_NO_PATHCONV=1
  BASE=http://127.0.0.1:56990 PREFIX=off ROUTES="root library history" browser-harness < scripts/parity/dom-dump.py
Output: .cache/ref/dom/<prefix>-<route>.txt and .png. Routes have no leading slash ("root" = /).
"""
import os, time

JS = r"""
(() => {
  const out = [];
  const walk = (el, d) => {
    if (d > 40 || ['SCRIPT','STYLE','svg','path'].includes(el.tagName)) return;
    const cls = (el.getAttribute('class') || '').trim();
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').slice(0, 40);
    const attrs = ['role','aria-label','placeholder','type','data-state'].map(a => el.getAttribute(a) ? `${a}=${el.getAttribute(a)}` : '').filter(Boolean).join(' ');
    out.push(`${'  '.repeat(d)}<${el.tagName.toLowerCase()}${cls ? ' .' + cls : ''}${attrs ? ' ' + attrs : ''}>${txt ? ' ' + txt : ''}`);
    for (const c of el.children) walk(c, d + 1);
  };
  walk(document.querySelector('#root'), 0);
  return out.join('\n');
})()
"""

base, prefix = os.environ["BASE"], os.environ["PREFIX"]
outdir = r"E:/AI/framegendev/.cache/ref/dom"
os.makedirs(outdir, exist_ok=True)
for route in os.environ["ROUTES"].split():
    path = "" if route == "root" else route.strip("/")
    goto_url(base + "/" + path)
    wait_for_load()
    time.sleep(2.5)
    name = prefix + "-" + (path.replace("/", "_") or "root")
    open(f"{outdir}/{name}.txt", "w", encoding="utf-8").write(js(JS))
    capture_screenshot(f"{outdir}/{name}.png")
    print("ok", name)
