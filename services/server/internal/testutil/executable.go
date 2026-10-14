package testutil

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"
)

// ExecutableFixture defines a native test subprocess without external accounts.
type ExecutableFixture struct {
	Mode           string
	ArgsPath       string
	PIDsPath       string
	CurrentPIDPath string
}

// WriteExecutable copies the current test binary and attaches its fixture data.
// The calling package must invoke RunExecutableFixture at the start of TestMain.
func WriteExecutable(t testing.TB, path string, fixture ExecutableFixture) string {
	t.Helper()
	if runtime.GOOS == "windows" && !strings.HasSuffix(strings.ToLower(path), ".exe") {
		path += ".exe"
	}
	source, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	binary, err := os.ReadFile(source)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, binary, 0o755); err != nil {
		t.Fatal(err)
	}
	config, err := json.Marshal(fixture)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path+".fixture.json", config, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

// RunExecutableFixture exits early only for a copied executable with fixture data.
func RunExecutableFixture() {
	executable, err := os.Executable()
	if err != nil {
		return
	}
	data, err := os.ReadFile(executable + ".fixture.json")
	if os.IsNotExist(err) {
		return
	}
	var fixture ExecutableFixture
	if err != nil || json.Unmarshal(data, &fixture) != nil {
		os.Exit(2)
	}
	if err := runExecutableFixture(fixture, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	os.Exit(0)
}

func runExecutableFixture(fixture ExecutableFixture, args []string) error {
	if fixture.ArgsPath != "" {
		if err := appendFixtureLog(fixture.ArgsPath, strings.Join(args, " ")+"\n"); err != nil {
			return err
		}
	}
	if fixture.Mode == "ffmpeg" && len(args) > 0 {
		last := args[len(args)-1]
		if last == "pipe:1" {
			_, err := fmt.Fprint(os.Stdout, "fragmented-mp4")
			return err
		}
		return os.WriteFile(last, []byte("rendered-mp4"), 0o600)
	}
	command := strings.Join(args, " ")
	if command == "logout" {
		return nil
	}
	if command == "login --headless" {
		switch fixture.Mode {
		case "jimeng-reuse":
			fmt.Println("Local OAuth session reused")
			return nil
		case "jimeng-challenge":
			fmt.Println("verification_uri: https://example.test/device\nuser_code: ABCD-EFGH\ndevice_code: device-123")
			return nil
		}
	}
	if fixture.Mode == "jimeng-challenge" && len(args) >= 2 && args[0] == "login" && args[1] == "checklogin" {
		fmt.Println("Local login available")
		return nil
	}
	if command == "login web" && strings.HasPrefix(fixture.Mode, "libtv-") {
		if fixture.CurrentPIDPath != "" {
			if previous, err := os.ReadFile(fixture.CurrentPIDPath); err == nil {
				pid, _ := strconv.Atoi(strings.TrimSpace(string(previous)))
				if processAlive(pid) {
					return fmt.Errorf("LibTV login is already running")
				}
			}
			if err := os.WriteFile(fixture.CurrentPIDPath, []byte(strconv.Itoa(os.Getpid())), 0o600); err != nil {
				return err
			}
		}
		if fixture.PIDsPath != "" {
			if err := appendFixtureLog(fixture.PIDsPath, strconv.Itoa(os.Getpid())+"\n"); err != nil {
				return err
			}
		}
		fmt.Println("Open https://libtv.example.test/login in your browser")
		if fixture.Mode == "libtv-block" {
			for {
				time.Sleep(time.Second)
			}
		}
		time.Sleep(200 * time.Millisecond)
		return nil
	}
	return fmt.Errorf("unexpected %s fixture arguments: %v", fixture.Mode, args)
}

func appendFixtureLog(path string, line string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	_, writeErr := file.WriteString(line)
	closeErr := file.Close()
	if writeErr != nil {
		return writeErr
	}
	return closeErr
}
