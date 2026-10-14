package acp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// Invoked before TestMain opens any databases; never runs real providers/tools.
func runACPProcessFixture() int {
	mode := os.Getenv("MEDIAGO_ACP_FIXTURE_MODE")
	if mode == "tree-child" {
		for {
			time.Sleep(time.Second)
		}
	}
	if mode == "tree-eof" || mode == "tree-stubborn" {
		child := exec.Command(os.Args[0])
		child.Env = append(os.Environ(), "MEDIAGO_ACP_FIXTURE_MODE=tree-child")
		if child.Start() != nil {
			return 5
		}
		if os.WriteFile(os.Getenv("MEDIAGO_ACP_FIXTURE_CHILD"), []byte(strconv.Itoa(child.Process.Pid)), 0o600) != nil {
			return 6
		}
		fmt.Println("ready")
		_, _ = io.Copy(io.Discard, os.Stdin)
		if mode == "tree-stubborn" {
			for {
				time.Sleep(time.Second)
			}
		}
		return 0
	}
	if mode == "eof" || mode == "delayed-eof" || mode == "stubborn" || mode == "exited" {
		fmt.Println("ready")
		if mode == "exited" {
			return 7
		}
		_, _ = io.Copy(io.Discard, os.Stdin)
		if mode == "delayed-eof" {
			time.Sleep(2 * time.Second)
		}
		if mode == "stubborn" {
			for {
				time.Sleep(time.Second)
			}
		}
		return 0
	}
	decoder := json.NewDecoder(os.Stdin)
	encoder := json.NewEncoder(os.Stdout)
	for {
		var request struct {
			ID     json.RawMessage `json:"id"`
			Method string          `json:"method"`
		}
		if err := decoder.Decode(&request); err != nil {
			if errors.Is(err, io.EOF) {
				return 0
			}
			return 2
		}
		if mode == "cancel" {
			_ = os.WriteFile(os.Getenv("MEDIAGO_ACP_FIXTURE_READY"), []byte("ready"), 0o600)
			for {
				time.Sleep(time.Second)
			}
		}
		response := map[string]any{"jsonrpc": "2.0", "id": request.ID}
		switch request.Method {
		case "initialize":
			if mode == "initialize-error" {
				response["error"] = map[string]any{"code": -32603, "message": "fixture initialization failed"}
			} else {
				response["result"] = map[string]any{"protocolVersion": 1, "agentCapabilities": map[string]any{}}
			}
		case "session/new":
			if mode == "auth-error" {
				response["error"] = map[string]any{"code": -32000, "message": "fixture authentication required"}
			} else {
				response["result"] = map[string]any{
					"sessionId": "fixture-session",
					"modes":     map[string]any{"currentModeId": "default", "availableModes": []map[string]string{{"id": "default", "name": "Default"}}},
				}
			}
		default:
			// Inspection must never authenticate, prompt or invoke a tool.
			return 3
		}
		if err := encoder.Encode(response); err != nil {
			return 4
		}
	}
}

type acpProcessTestLog struct {
	mu sync.Mutex
	bytes.Buffer
}

func (log *acpProcessTestLog) Write(data []byte) (int, error) {
	log.mu.Lock()
	defer log.mu.Unlock()
	return log.Buffer.Write(data)
}

func (log *acpProcessTestLog) snapshot() string {
	log.mu.Lock()
	defer log.mu.Unlock()
	return log.Buffer.String()
}

func captureACPProcessLog(t *testing.T) *acpProcessTestLog {
	t.Helper()
	// Child race instrumentation stays enabled; omit its artificial 1s exit
	// sleep so EOF termination can be tested within the product's grace period.
	t.Setenv("GORACE", strings.TrimSpace(os.Getenv("GORACE")+" atexit_sleep_ms=0"))
	previous := packageLogger.Load()
	log := &acpProcessTestLog{}
	SetLogger(slog.New(slog.NewJSONHandler(log, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { SetLogger(previous) })
	return log
}

func TestCleanupACPProcess(t *testing.T) {
	for _, test := range []struct {
		mode   string
		forced bool
		failed bool
	}{
		{mode: "eof"},
		{mode: "delayed-eof"},
		{mode: "exited", failed: true},
		{mode: "stubborn", forced: true, failed: true},
	} {
		t.Run(test.mode, func(t *testing.T) {
			log := captureACPProcessLog(t)
			t.Setenv("MEDIAGO_ACP_PROCESS_FIXTURE", "1")
			t.Setenv("MEDIAGO_ACP_FIXTURE_MODE", test.mode)
			executable, err := os.Executable()
			if err != nil {
				t.Fatal(err)
			}
			cmd := exec.Command(executable)
			stdin, err := cmd.StdinPipe()
			if err != nil {
				t.Fatal(err)
			}
			stdout, err := cmd.StdoutPipe()
			if err != nil {
				t.Fatal(err)
			}
			if err := cmd.Start(); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = cmd.Process.Kill() })
			reader := bufio.NewReader(stdout)
			if ready, err := reader.ReadString('\n'); err != nil || strings.TrimSpace(ready) != "ready" {
				t.Fatalf("ready = %q, %v", ready, err)
			}
			if test.mode == "exited" {
				// EOF proves the fixture already exited without calling Wait twice.
				if _, err := reader.ReadByte(); !errors.Is(err, io.EOF) {
					t.Fatalf("exit EOF = %v", err)
				}
			}
			started := time.Now()
			cleanupACPProcess(cmd, stdin, stdout, []any{"cleanup_reason", "test"}, cmd.Process.Pid, started, nil)
			if cmd.ProcessState == nil || !cmd.ProcessState.Exited() && !test.forced {
				t.Fatal("cleanup returned without reaping child")
			}
			if cmd.ProcessState.Success() == test.failed {
				t.Fatalf("process state = %v", cmd.ProcessState)
			}
			if time.Since(started) > 6*time.Second {
				t.Fatal("cleanup exceeded bound")
			}
			output := log.snapshot()
			if !strings.Contains(output, fmt.Sprintf(`"forced":%t`, test.forced)) || strings.Contains(output, "kill failed") {
				t.Fatalf("cleanup diagnostics = %s", output)
			}
			if test.failed && !strings.Contains(output, "wait_error") {
				t.Fatalf("nonzero exit lost: %s", output)
			}
		})
	}
}

func TestACPInspectCleanupAndFailures(t *testing.T) {
	log := captureACPProcessLog(t)
	t.Setenv("MEDIAGO_ACP_PROCESS_FIXTURE", "1")
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	workspace := t.TempDir()
	runner := NewACPAgentRunnerWithDocumentMCPConfigPathAndArgv(executable, workspace, "", nil, nil, func() []string { return []string{executable} })
	for _, test := range []struct {
		mode string
		want string
	}{
		{mode: "initialize-error", want: "fixture initialization failed"},
		{mode: "auth-error", want: "fixture authentication required"},
		{mode: "success"}, // A failed inspection must allow a fresh retry.
	} {
		t.Run(test.mode, func(t *testing.T) {
			t.Setenv("MEDIAGO_ACP_FIXTURE_MODE", test.mode)
			before := len(log.snapshot())
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			config, err := runner.InspectSessionConfig(ctx, "fixture", workspace)
			if test.want != "" {
				if err == nil || !strings.Contains(err.Error(), test.want) || config.Permission != nil {
					t.Fatalf("config/error = %#v, %v", config, err)
				}
			} else if err != nil || config.Permission == nil {
				t.Fatalf("inspection = %#v, %v", config, err)
			}
			output := log.snapshot()[before:]
			if !strings.Contains(output, "acp process cleaned up") || !strings.Contains(output, `"forced":false`) {
				t.Fatalf("inspection returned before graceful reap: %s", output)
			}
			if test.want != "" && !strings.Contains(output, `"cleanup_reason":"probe_failed"`) {
				t.Fatalf("failure reason missing: %s", output)
			}
			if test.want == "" && !strings.Contains(output, `"cleanup_reason":"probe_completed"`) {
				t.Fatalf("success reason missing: %s", output)
			}
		})
	}
}

func TestACPInspectCancellationReapsProcess(t *testing.T) {
	log := captureACPProcessLog(t)
	t.Setenv("MEDIAGO_ACP_PROCESS_FIXTURE", "1")
	t.Setenv("MEDIAGO_ACP_FIXTURE_MODE", "cancel")
	ready := filepath.Join(t.TempDir(), "ready")
	t.Setenv("MEDIAGO_ACP_FIXTURE_READY", ready)
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	workspace := t.TempDir()
	runner := NewACPAgentRunner(executable, workspace, nil, func() string { return executable })
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	finished := make(chan error, 1)
	go func() {
		_, err := runner.InspectSessionConfig(ctx, "fixture", workspace)
		finished <- err
	}()
	for {
		if _, err := os.Stat(ready); err == nil {
			break
		}
		select {
		case err := <-finished:
			t.Fatalf("probe exited before ready: %v", err)
		case <-ctx.Done():
			t.Fatal("fixture did not initialize")
		case <-time.After(10 * time.Millisecond):
		}
	}
	cancel()
	select {
	case err := <-finished:
		if err == nil {
			t.Fatal("cancelled inspection reported success")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("cancelled inspection did not return")
	}
	if output := log.snapshot(); !strings.Contains(output, "acp process cleaned up") || !strings.Contains(output, `"cleanup_reason":"probe_failed"`) {
		t.Fatalf("cancelled process not reaped before return: %s", output)
	}
}
