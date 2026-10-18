package codexapp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSessionInitializesCallsAndQueuesNotifications(t *testing.T) {
	binPath := writeFakeAppServer(t)

	session, err := Start(context.Background(), binPath)
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	defer session.Close()

	var response struct {
		Value string `json:"value"`
	}
	if err := session.Call(context.Background(), "test/call", map[string]string{"input": "ok"}, &response); err != nil {
		t.Fatalf("Call() error = %v", err)
	}
	if response.Value != "done" {
		t.Fatalf("Call() response = %#v", response)
	}
	message, err := session.Next(context.Background())
	if err != nil {
		t.Fatalf("Next() error = %v", err)
	}
	if message.Method != "test/notification" || !strings.Contains(string(message.Params), "queued") {
		t.Fatalf("Next() = %#v", message)
	}
}

func TestSessionReturnsRPCError(t *testing.T) {
	binPath := writeFakeAppServer(t)

	session, err := Start(context.Background(), binPath)
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	defer session.Close()

	err = session.Call(context.Background(), "test/fail", nil, nil)
	if err == nil || !strings.Contains(err.Error(), "request failed") {
		t.Fatalf("Call() error = %v", err)
	}
}

func TestSessionCloseBoundsInheritedStderrAndIsIdempotent(t *testing.T) {
	session, err := Start(context.Background(), writeFakeAppServer(t))
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	var child struct {
		PID int `json:"pid"`
	}
	if err := session.Call(context.Background(), "test/hold-stderr", nil, &child); err != nil {
		t.Fatal(err)
	}
	process, err := os.FindProcess(child.PID)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = process.Kill(); _, _ = process.Wait() })
	done := make(chan struct{})
	go func() { session.Close(); session.Close(); close(done) }()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Close blocked on inherited child stderr")
	}
}

func TestMain(m *testing.M) {
	if strings.HasPrefix(filepath.Base(os.Args[0]), "codex-fixture") {
		for _, arg := range os.Args[1:] {
			if arg == "--stdio" {
				os.Exit(2)
			}
		}
		if len(os.Args) > 1 && os.Args[1] == "hold-stderr" {
			time.Sleep(4 * time.Second)
			os.Exit(0)
		}
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			var request struct {
				ID     int    `json:"id"`
				Method string `json:"method"`
			}
			if json.Unmarshal(scanner.Bytes(), &request) != nil {
				os.Exit(2)
			}
			switch request.Method {
			case "initialize":
				fmt.Printf("{\"id\":%d,\"result\":{}}\n", request.ID)
			case "test/call":
				fmt.Println(`{"method":"test/notification","params":{"value":"queued"}}`)
				fmt.Printf("{\"id\":%d,\"result\":{\"value\":\"done\"}}\n", request.ID)
			case "test/fail":
				fmt.Printf("{\"id\":%d,\"error\":{\"code\":-32000,\"message\":\"request failed\"}}\n", request.ID)
			case "test/hold-stderr":
				child := exec.Command(os.Args[0], "hold-stderr")
				child.Stderr = os.Stderr
				if child.Start() != nil {
					os.Exit(3)
				}
				fmt.Printf("{\"id\":%d,\"result\":{\"pid\":%d}}\n", request.ID, child.Process.Pid)
			}
		}
		os.Exit(0)
	}
	os.Exit(m.Run())
}

func writeFakeAppServer(t *testing.T) string {
	t.Helper()
	source, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	binary, err := os.ReadFile(source)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "codex-fixture.exe")
	if err := os.WriteFile(path, binary, 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}
