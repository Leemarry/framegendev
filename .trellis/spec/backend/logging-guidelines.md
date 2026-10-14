# Logging Guidelines

Use current `log/slog` and `services/server/internal/platform/logger`,
including component/file handlers. Follow surrounding code; do not introduce
Zap merely because the generic template mentions it.

`internal/http/response/response.go` logs method, route, status, request ID and
internal error. Add useful service/CLI context without repeated per-layer noise.
Never log credentials, Authorization headers, device codes or secret configs.
Use safe response helpers for user-visible errors.

## ACP inspection and teardown (TASK-003)

`InspectSessionConfig(ctx, projectID, projectDir)` reads ACP metadata. Success
means initialize/session-new returned options; it does not attest to login,
provider access, prompt execution or generation. Preserve the existing error
return and handler 503/authentication guidance for failed probes.

Complete the probe's deferred cleanup before returning, so HTTP context
cancellation cannot race an asynchronous cleanup Kill. The common
`cleanupACPProcess(cmd, stdin, stdout, logArgs, pid, startedAt, closeProcessTree)` owns exactly
one Wait: close stdin, wait up to 3s for EOF termination, then Kill if needed
and wait at most 2s more. Leave stdout available to the protocol reader until
Wait or the bound; never interpret a locally closed pipe as proof of auth failure.

| Evidence | Meaning / expected diagnostic |
| --- | --- |
| probe completed then cleanup | purpose=config_probe; cleanup_reason=probe_completed |
| prepare/start/initialize/session_new error | failed probe with stage; cleanup_reason=probe_failed after start |
| resident Close/eviction/disconnect | cleanup_reason=resident_closed; ownership stays with resident closeOnce |
| EOF exit in grace | forced=false; preserve any nonzero wait_error |
| No exit in grace | forced=true; retain Kill failures except os.ErrProcessDone |
| No Wait completion within forced bound | cleanup still waiting warning; never log cleaned up prematurely |

Windows TerminateProcess can return Access denied for an already terminated
process. Do not broadly suppress this error or nonzero exits. Avoid the needless
Kill via EOF grace and correlate the result with preceding probe/cleanup records.
Native fixture checks must cover EOF exit, prior nonzero exit, unresponsive
child, successful probe/retry, initialize/auth errors and cancellation. Child
race fixtures may set only atexit_sleep_ms=0 to avoid the race detector's
artificial 1s exit delay; keep detection enabled. Runtime evidence uses vendored
ACP and isolated read-only runtime-config calls; no real prompts are needed.

codex-acp 1.1.2 has a 2s stdin-close child shutdown fallback (official npm
dist/index.js startAcpServer); allow it to finish. A delayed-2s EOF fixture must
exit successfully without force. The vendored Windows adapter may still stay
alive past EOF grace. A successful probe
followed by forced=true and wait_error=exit status1 can be the intended Kill
(Go's Windows TerminateProcess uses code1). Confirm preceding completion,
successful reap and no Kill/timeout warning or residual child; do not require
exit0 or remove wait_error to claim success. An unforced nonzero exit remains
independent evidence to investigate.

Windows ACP starts through `startACPProcess(cmd) (func() error, error)` in
acp_process_windows.go. Create a private JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE job,
launch with CREATE_SUSPENDED, assign before spawning descendants, then resume
the primary thread using documented thread APIs. On failure kill/reap the
suspended process and close all handles; propagate the startup error rather
than silently launching uncontained. The returned closer is idempotent and
belongs to the same owner as Wait; common cleanup defers it on all paths, even
parent EOF or forced-wait timeout. This terminates shell/Codex/MCP descendants
without process-name/PID-wide searches. Non-Windows uses cmd.Start with nil
closer. Reuse the existing x/sys/windows dependency; do not patch vendored agents.

Required Windows native tests hold a real descendant handle, prove it alive
before cleanup, then wait for signaled termination after EOF/forced parent exit
and context cancellation. Runtime acceptance must also observe descendants;
parent Wait alone is insufficient. Keep a fixed 3s drain observation bound and
preserve failed samples instead of increasing it until tests pass.
