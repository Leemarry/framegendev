package clitool

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestResolveReplaceablePackage(t *testing.T) {
	dir := t.TempDir()
	root := filepath.Join(dir, "dreamina")
	if err := os.MkdirAll(filepath.Join(root, "v2"), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"old", "v2/new"} {
		if err := os.WriteFile(filepath.Join(root, name), []byte("test"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	write := func(bin, version string) {
		t.Helper()
		data, _ := json.Marshal(map[string]string{"id": "dreamina", "bin": bin, "version": version, "platform": platformKey()})
		if err := os.WriteFile(filepath.Join(root, "tool.json"), data, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	for _, tc := range []struct{ bin, version string }{{"old", "1"}, {"v2/new", "2"}} {
		write(tc.bin, tc.version)
		got, err := Resolve("", dir, "dreamina", "dreamina")
		if err != nil || got.BinaryPath != filepath.Join(root, tc.bin) || got.Version != tc.version || got.Source != "packaged" {
			t.Fatalf("replacement = %+v, %v", got, err)
		}
	}
	got, err := Resolve(filepath.Join(root, "old"), dir, "dreamina", "dreamina")
	if err != nil || got.Source != "configured" || got.Version != "" {
		t.Fatalf("override = %+v, %v", got, err)
	}
}

func TestResolveRejectsInvalidSelectedPackage(t *testing.T) {
	for _, tc := range []struct{ name, manifest string }{
		{"malformed", "{"},
		{"wrong tool", `{"id":"other","bin":"cli"}`},
		{"escape", `{"id":"dreamina","bin":"../outside"}`},
		{"absolute", `{"id":"dreamina","bin":"/outside"}`},
		{"windows absolute", `{"id":"dreamina","bin":"C:/outside"}`},
		{"missing file", `{"id":"dreamina","bin":"missing"}`},
		{"wrong platform", `{"id":"dreamina","bin":"cli","platform":"other"}`},
		{"directory", `{"id":"dreamina","bin":"."}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.WriteFile(filepath.Join(dir, "tool.json"), []byte(tc.manifest), 0o600); err != nil {
				t.Fatal(err)
			}
			// A legacy executable must not hide a broken manifest.
			if err := os.WriteFile(filepath.Join(dir, executableName("dreamina")), []byte("test"), 0o755); err != nil {
				t.Fatal(err)
			}
			if _, err := Resolve("", dir, "dreamina", "dreamina"); err == nil {
				t.Fatal("accepted invalid package")
			}
		})
	}
}

func TestResolveLegacyAndPATH(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, executableName("test-local-cli"))
	if err := os.WriteFile(file, []byte("test"), 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := Resolve("", dir, "tool", "test-local-cli")
	if err != nil || got.BinaryPath != file || got.Source != "configured" {
		t.Fatalf("legacy = %+v, %v", got, err)
	}
	t.Setenv("PATH", dir)
	got, err = Resolve("", "", "tool", "test-local-cli")
	if err != nil || got.BinaryPath != file || got.Source != "path" {
		t.Fatalf("PATH = %+v, %v", got, err)
	}
	if _, err := Resolve(filepath.Join(dir, "missing"), dir, "tool", "test-local-cli"); err == nil {
		t.Fatal("invalid override fell back")
	}
}
