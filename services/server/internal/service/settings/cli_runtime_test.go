package settings

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/jimeng"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func TestCLIPackageUsedByLoginAndGeneration(t *testing.T) {
	dir := t.TempDir()
	bin := testutil.WriteExecutable(t, filepath.Join(dir, "replacement"), testutil.ExecutableFixture{Mode: "jimeng-challenge"})
	manifest, _ := json.Marshal(map[string]string{"id": "dreamina", "bin": filepath.Base(bin), "version": "test-version"})
	if err := os.WriteFile(filepath.Join(dir, "tool.json"), manifest, 0o600); err != nil {
		t.Fatal(err)
	}
	service := NewSettings(&memoryAPIKeyStore{values: map[string]string{}})
	service.SetJimengCLIPaths("", dir)
	runtime := service.cliRuntime("jimeng")
	if !runtime.Available || runtime.Version != "test-version" || runtime.BinaryPath != bin {
		t.Fatalf("runtime = %+v", runtime)
	}
	path, err := jimeng.ResolveBinaryPath("", dir)
	if err != nil || path != runtime.BinaryPath {
		t.Fatalf("generation path = %q, %v", path, err)
	}
	login, err := service.BeginJimengLogin(context.Background(), false)
	if err != nil || login.Login.Status != "pending" {
		t.Fatalf("package login = %+v, %v", login.Login, err)
	}
	if err := os.Remove(bin); err != nil {
		t.Fatal(err)
	}
	if service.cliRuntime("jimeng").Available {
		t.Fatal("deleted binary still marked available")
	}
}

func TestMissingCLIDoesNotImplyUsableCredential(t *testing.T) {
	service := NewSettings(&memoryAPIKeyStore{values: map[string]string{"xiaoyunque": "secret-test-key"}})
	service.SetGenerationCLIs([]string{"pippit"})
	service.SetPippitCLIPaths(filepath.Join(t.TempDir(), "missing"), "")
	result, err := service.ListGenerationProviders(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for _, provider := range result.Providers {
		if provider.ID != "xiaoyunque" {
			continue
		}
		if !provider.Configured || provider.Runtime == nil || provider.Runtime.Available || provider.Runtime.Message == "" {
			t.Fatalf("credential and installation state = %+v", provider)
		}
		encoded, _ := json.Marshal(provider.Runtime)
		if string(encoded) == "" {
			t.Fatal("missing runtime metadata")
		}
		return
	}
	t.Fatal("missing pippit provider")
}
