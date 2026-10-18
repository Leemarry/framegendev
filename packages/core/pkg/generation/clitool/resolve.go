// Package clitool resolves replaceable local CLI packages shared by login and generation.
package clitool

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// Runtime describes the selected local executable without executing it.
type Runtime struct {
	BinaryPath string `json:"binaryPath"`
	Version    string `json:"version,omitempty"`
	Source     string `json:"source"`
}

// Resolve reads the existing vendor tool.json contract. Explicit paths take
// precedence; an invalid selected package fails closed instead of using PATH.
func Resolve(explicitPath, binDir, toolID, binaryName string) (Runtime, error) {
	if path := strings.TrimSpace(explicitPath); path != "" {
		return executable(path, "configured", "")
	}
	if dir := strings.TrimSpace(binDir); dir != "" {
		for _, root := range []string{filepath.Join(dir, toolID), dir} {
			raw, err := os.ReadFile(filepath.Join(root, "tool.json"))
			if err == nil {
				var manifest struct {
					ID       string `json:"id"`
					Bin      string `json:"bin"`
					Version  string `json:"version"`
					Platform string `json:"platform"`
				}
				if err := json.Unmarshal(raw, &manifest); err != nil {
					return Runtime{}, fmt.Errorf("reading %s tool manifest: %w", toolID, err)
				}
				if manifest.ID != toolID || !filepath.IsLocal(manifest.Bin) || strings.ContainsAny(manifest.Bin, ":\\") {
					return Runtime{}, fmt.Errorf("invalid %s tool manifest id or relative bin", toolID)
				}
				if manifest.Platform != "" && manifest.Platform != platformKey() {
					return Runtime{}, fmt.Errorf("%s package platform %q does not match %s", toolID, manifest.Platform, platformKey())
				}
				path := filepath.Join(root, manifest.Bin)
				resolved, err := filepath.EvalSymlinks(path)
				if err != nil {
					return Runtime{}, fmt.Errorf("resolving %s package entry: %w", toolID, err)
				}
				realRoot, err := filepath.EvalSymlinks(root)
				if err != nil {
					return Runtime{}, err
				}
				rel, err := filepath.Rel(realRoot, resolved)
				if err != nil || !filepath.IsLocal(rel) {
					return Runtime{}, fmt.Errorf("%s package entry escapes package", toolID)
				}
				return executable(resolved, "packaged", manifest.Version)
			}
			if !os.IsNotExist(err) {
				return Runtime{}, fmt.Errorf("reading %s tool manifest: %w", toolID, err)
			}
			path := filepath.Join(root, executableName(binaryName))
			if _, err := os.Stat(path); err == nil {
				return executable(path, "configured", "")
			} else if !os.IsNotExist(err) {
				return Runtime{}, err
			}
		}
	}
	path, err := exec.LookPath(executableName(binaryName))
	if err != nil {
		return Runtime{}, fmt.Errorf("%s CLI not found: %w", toolID, err)
	}
	return executable(path, "path", "")
}

// ResolvePath returns the same executable selected by Resolve for execution.
func ResolvePath(explicitPath, binDir, toolID, binaryName string) (string, error) {
	selected, err := Resolve(explicitPath, binDir, toolID, binaryName)
	return selected.BinaryPath, err
}

func executableName(name string) string {
	if runtime.GOOS == "windows" && filepath.Ext(name) == "" {
		return name + ".exe"
	}
	return name
}

func platformKey() string {
	platform, arch := runtime.GOOS, runtime.GOARCH
	if platform == "windows" {
		platform = "win32"
	}
	if arch == "amd64" {
		arch = "x64"
	}
	return platform + "-" + arch
}

func executable(path, source, version string) (Runtime, error) {
	resolved, err := filepath.Abs(path)
	if err != nil {
		return Runtime{}, err
	}
	info, err := os.Stat(resolved)
	if err != nil {
		return Runtime{}, err
	}
	if !info.Mode().IsRegular() || (runtime.GOOS != "windows" && info.Mode().Perm()&0o111 == 0) {
		return Runtime{}, fmt.Errorf("CLI path %s is not an executable file", resolved)
	}
	return Runtime{BinaryPath: resolved, Source: source, Version: version}, nil
}
