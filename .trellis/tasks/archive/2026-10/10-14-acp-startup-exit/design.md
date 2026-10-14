# TASK-003 ACP cleanup investigation

REQ-011/016; user explicitly requests completion of this bounded task. Apply Superpowers brainstorming to the existing process lifecycle, with inline implementation under the standing authorization. TASK-010 remains awaiting review.

## Evidence and boundary

Dedicated ACP JSON logs show `acp config probe completed` with model/permission options before every observed pipe-close/exit1. InspectSessionConfig starts a CommandContext process, then defers an asynchronous cleanup. Cleanup closes both pipes and immediately kills, while HTTP context cancellation may also kill after return. This is intentional teardown after a successful inspection, not evidence of failed initialization or authentication.

Change only the existing inspector, shared process startup/cleanup, its resident caller and native regression tests. Keep the API/config/SDK and resident ownership unchanged. No model-page work, login, prompts, generation, new dependencies or production data access.

## Design

Inspector cleanup completes synchronously before the request returns, with purpose=config_probe and cleanup_reason=probe_completed/probe_failed. Record probe failures with a safe stage and original error through the existing logger; keep error propagation unchanged. Metadata success does not assert authentication or prompt readiness.

Shared cleanup closes stdin, starts its sole Wait, and allows 3s for EOF exit. The vendored adapter has its own 2s app-server shutdown fallback, so a shorter grace can interrupt it. Only a process still waiting is killed; ignore only os.ErrProcessDone, preserve other kill failures. Close stdout after Wait (or the existing 2s bounded forced-wait timeout) rather than racing the SDK reader. Log cleanup start/completion, whether forced, and retain wait_error including nonzero EOF exits. Resident callers keep their existing ownership and gain the same graceful-before-force behavior. No blanket suppression of Access denied or nonzero exits.

## Acceptance

Native subprocess fixtures cover EOF exit, already-exited nonzero, stubborn-process forced termination; real SDK inspection fixtures cover successful metadata, initialization/session authentication errors, cancellation, and retry. Inspect returns only after its child has been reaped; cancellation remains bounded. Existing resident close/cancel tests and complete backend gates must pass.

Rebuild isolated binaries, replace only the verified isolated 31430 service after gates pass, repeat read-only runtime-config and inspect correlated logs/remaining child processes. Compare the four existing documents' version/body hash/updatedAt before and after. No UI changes; no browser, login, prompt or generation acceptance claimed.

## Native evidence refinement

The first three real probes returned HTTP200 but the adapter did not exit within the 500ms EOF grace; cleanup successfully called Kill, then Wait reported exit status1 (Windows TerminateProcess uses exit code1). No Access denied, timeout or remaining child was observed. The first acceptance script incorrectly required forced=false/exit0 and failed; keep that evidence. The product fallback is working as designed. Final acceptance permits a correlated probe_completed + forced=true + exit1 with confirmed reap; it rejects nonzero unforced exits, Kill/cleanup warnings, failed probes and residual processes. Retain raw wait_error rather than changing it to make the check pass.

A second immediate process snapshot briefly caught the adapter's Codex/MCP descendants draining after its own Wait; subsequent read-only inspection found both gone without intervention. Final runtime verification observes descendant shutdown for at most 3s, preserving all samples and failing if any remain. Parent cleanup still completes synchronously; no process-tree kill or new product policy was added.

The 3s descendant check also failed on the first implementation; do not extend that acceptance window again. Downloaded official npm 1.1.2 source into ignored task cache, verified npm SHA512 integrity, and found stdin-close handling waits 2s before its own child termination (dist/index.js:30026), with a Windows shell spawn at :21886. Therefore initial 500ms product grace was too short. A delayed-EOF native fixture reproduces the early kill and fails before the 3s product fix. Rerun full gates and rebuild runtime before final acceptance. Source archive/integrity remain in .cache/parity/task-003/upstream; no vendored binary/dependency was changed.

## Windows descendant ownership refinement

The 3s product grace still left Codex/MCP descendants beyond the fixed 3s observation window. Merely killing the shell/adapter cannot ensure Windows descendant shutdown. This is an actual lifecycle gap within TASK-003, not an authentication issue. Add acp_process_windows.go and acp_process_other.go, with one native job regression file. Reuse the existing x/sys/windows version.

`startACPProcess(cmd *exec.Cmd) (func() error, error)` creates a private kill-on-close Job Object on Windows, starts the process suspended, assigns it to the job before any descendant can spawn, then resumes its primary thread through documented Toolhelp/OpenThread/ResumeThread APIs. Return an idempotent close function; fail startup and reap the suspended process if containment or resume fails. Non-Windows delegates to the unchanged cmd.Start behavior and returns no tree closer. Both inspector and resident use this launcher. The common cleanup takes the returned tree closer and closes the job on every exit, including timeout; no name-based kill, unrelated PID enumeration/termination, new dependency or upstream binary patch.

Native fixtures retain a stubborn child after parent EOF/force/context cancellation. They must prove the child was living before cleanup and signaled after job closure; real runtime must meet the original 3s descendant observation bound. Earlier 500ms/3s-only runtime failures and binaries remain preserved. Complete backend gates must pass again before the final isolated replacement.
