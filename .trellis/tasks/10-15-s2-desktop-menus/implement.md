# Execution

- [x] Read official screenshots07/10 and baseline review; inspect existing native
  window, IPC trust, close guard and renderer navigation callbacks.
- [x] Implement menu roles / typed command subscription / about dialog.
- [x] Run relevant tests, Electron compile, workspace lint/format/build.
- [x] Isolated desktop native and renderer workflow acceptance; record evidence.
- [ ] Review explicit paths and commit; keep whole090 limitations visible.

Official already runs in own MediaGoParitySession2 desktop/CDP9243. Development
browser CDP9241/backend31452/frontend31453 is ours. Native development desktop
must use a distinct profile/APPDATA/workspace and another free CDP port.
