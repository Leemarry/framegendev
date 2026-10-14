package acp

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"golang.org/x/sys/windows"
)

func TestACPWindowsJobCleansDescendants(t *testing.T) {
	for _, mode := range []string{"tree-eof", "tree-stubborn", "cancel"} {
		t.Run(mode, func(t *testing.T) {
			log := captureACPProcessLog(t)
			t.Setenv("MEDIAGO_ACP_PROCESS_FIXTURE", "1")
			fixtureMode := mode
			if mode == "cancel" {
				fixtureMode = "tree-stubborn"
			}
			t.Setenv("MEDIAGO_ACP_FIXTURE_MODE", fixtureMode)
			pidFile := filepath.Join(t.TempDir(), "child.pid")
			t.Setenv("MEDIAGO_ACP_FIXTURE_CHILD", pidFile)
			executable, err := os.Executable()
			if err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, executable)
			stdin, err := cmd.StdinPipe()
			if err != nil {
				t.Fatal(err)
			}
			stdout, err := cmd.StdoutPipe()
			if err != nil {
				t.Fatal(err)
			}
			closeTree, err := startACPProcess(cmd)
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := closeTree(); err != nil {
					t.Error(err)
				}
			})
			if line, err := bufio.NewReader(stdout).ReadString('\n'); err != nil || strings.TrimSpace(line) != "ready" {
				t.Fatalf("fixture ready = %q, %v", line, err)
			}
			data, err := os.ReadFile(pidFile)
			if err != nil {
				t.Fatal(err)
			}
			childPID, err := strconv.Atoi(string(data))
			if err != nil {
				t.Fatal(err)
			}
			child, err := windows.OpenProcess(windows.SYNCHRONIZE|windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(childPID))
			if err != nil {
				t.Fatalf("opening living descendant: %v", err)
			}
			defer closeACPWindowsHandle(child)
			var exitCode uint32
			if err := windows.GetExitCodeProcess(child, &exitCode); err != nil || exitCode != 259 {
				t.Fatalf("descendant was not alive before cleanup: exit=%d error=%v", exitCode, err)
			}
			if mode == "cancel" {
				cancel()
			}
			cleanupACPProcess(cmd, stdin, stdout, nil, cmd.Process.Pid, time.Now(), closeTree)
			status, err := windows.WaitForSingleObject(child, 2000)
			if err != nil || status != windows.WAIT_OBJECT_0 {
				t.Fatalf("descendant %d survived cleanup: status=%d error=%v", childPID, status, err)
			}
			if strings.Contains(log.snapshot(), "job close failed") {
				t.Fatal(log.snapshot())
			}
		})
	}
}
