package document

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/platform/timestamp"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

const projectPackageSchemaVersion = 1

const (
	maxProjectPackageFiles        = 100000
	maxProjectPackageBytes        = 8 << 30
	maxProjectPackageManifestSize = 64 << 10
)

var (
	ErrInvalidProjectPackage  = errors.New("invalid project package")
	ErrProjectPackageConflict = errors.New("project package conflict")
)

type projectPackageManifest struct {
	SchemaVersion int    `json:"schemaVersion"`
	ProjectID     string `json:"projectId"`
	Name          string `json:"name"`
	Description   string `json:"description,omitempty"`
	CreatedAt     string `json:"createdAt"`
}

// ProjectPackagePreview is a read-only package inspection result.
type ProjectPackagePreview struct {
	Project     workspaceProjectRecord `json:"project"`
	Archive     string                 `json:"archive"`
	Fingerprint string                 `json:"fingerprint"`
	FileCount   int                    `json:"fileCount"`
	TotalBytes  int64                  `json:"totalBytes"`
}

// PreviewProjectPackage validates a package without writing to the workspace.
func (store *Service) PreviewProjectPackage(ctx context.Context, archivePath string) (ProjectPackagePreview, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	return store.previewProjectPackageUnlocked(ctx, archivePath)
}

// ExportProjectPackage writes a stable project package and returns its path.
func (store *Service) ExportProjectPackage(ctx context.Context, projectID, destinationDir string) (string, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	if store.initErr != nil {
		return "", store.initErr
	}
	if err := ctx.Err(); err != nil {
		return "", err
	}
	projectID = domain.CleanProjectID(projectID)
	if projectID == "" {
		return "", fmt.Errorf("projectId is required")
	}
	projectDir := store.projectDir(projectID)
	if projectDir == "" {
		return "", fmt.Errorf("project %s is not registered with projectDir", projectID)
	}
	project, err := store.workspace.GetProject(projectID)
	if err != nil {
		return "", fmt.Errorf("reading project %s: %w", projectID, err)
	}
	destinationDir, err = absoluteDirectory(destinationDir)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(destinationDir, 0o755); err != nil {
		return "", fmt.Errorf("creating export directory: %w", err)
	}
	files, totalBytes, err := packageFiles(projectDir)
	if err != nil {
		return "", err
	}
	archivePath := filepath.Join(destinationDir, safePackageName(project.ID)+".mediago-project.zip")
	if _, err := os.Stat(archivePath); err == nil {
		return "", fmt.Errorf("%w: export file already exists", ErrProjectPackageConflict)
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("checking export file: %w", err)
	}
	tmp, err := os.CreateTemp(destinationDir, ".mediago-project-*.tmp")
	if err != nil {
		return "", fmt.Errorf("creating export staging file: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)
	zw := zip.NewWriter(tmp)
	manifest := projectPackageManifest{SchemaVersion: projectPackageSchemaVersion, ProjectID: project.ID, Name: project.Name, Description: project.Description, CreatedAt: project.CreatedAt.Format(time.RFC3339Nano)}
	manifestData, err := json.Marshal(manifest)
	if err == nil && totalBytes+int64(len(manifestData)) > maxProjectPackageBytes {
		err = invalidPackage("project exceeds package size limit")
	}
	if err == nil {
		err = writeZipBytes(zw, "mediago-project.json", manifestData)
	}
	for _, file := range files {
		if err != nil {
			break
		}
		if err := ctx.Err(); err != nil {
			_ = zw.Close()
			_ = tmp.Close()
			return "", err
		}
		input, readErr := os.Open(filepath.Join(projectDir, filepath.FromSlash(file)))
		if readErr != nil {
			err = fmt.Errorf("reading project file %s: %w", file, readErr)
			break
		}
		header := &zip.FileHeader{Name: filepath.ToSlash(file), Method: zip.Deflate, Modified: time.Unix(0, 0).UTC()}
		var writer io.Writer
		writer, err = zw.CreateHeader(header)
		if err == nil {
			_, err = io.Copy(writer, input)
		}
		_ = input.Close()
	}
	if closeErr := zw.Close(); err == nil {
		err = closeErr
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return "", fmt.Errorf("writing project package: %w", err)
	}
	if err := os.Rename(tmpPath, archivePath); err != nil {
		return "", fmt.Errorf("finalizing project package: %w", err)
	}
	return archivePath, nil
}

// ImportProjectPackage validates and registers a package in destinationDir.
func (store *Service) ImportProjectPackage(ctx context.Context, archivePath, destinationDir, fingerprint string) (workspaceProjectRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if store.initErr != nil {
		return workspaceProjectRecord{}, store.initErr
	}
	preview, err := store.previewProjectPackageUnlocked(ctx, archivePath)
	if err != nil {
		return workspaceProjectRecord{}, err
	}
	if strings.TrimSpace(fingerprint) == "" || fingerprint != preview.Fingerprint {
		return workspaceProjectRecord{}, fmt.Errorf("%w: package changed, preview it again", ErrProjectPackageConflict)
	}
	destinationDir, err = absoluteDirectory(destinationDir)
	if err != nil {
		return workspaceProjectRecord{}, err
	}
	if err := os.MkdirAll(destinationDir, 0o755); err != nil {
		return workspaceProjectRecord{}, fmt.Errorf("creating import directory: %w", err)
	}
	target := filepath.Join(destinationDir, safePackageName(preview.Project.ID))
	if _, err := os.Stat(target); err == nil {
		return workspaceProjectRecord{}, fmt.Errorf("%w: destination already exists", ErrProjectPackageConflict)
	} else if !os.IsNotExist(err) {
		return workspaceProjectRecord{}, fmt.Errorf("checking import destination: %w", err)
	}
	models, err := store.workspace.ListProjectsByStatus(repository.ProjectStatusAll)
	if err != nil {
		return workspaceProjectRecord{}, err
	}
	for _, model := range models {
		if domain.CleanProjectID(model.ID) == preview.Project.ID {
			return workspaceProjectRecord{}, fmt.Errorf("%w: project identity already exists", ErrProjectPackageConflict)
		}
	}
	stage, err := os.MkdirTemp(destinationDir, ".mediago-import-*")
	if err != nil {
		return workspaceProjectRecord{}, fmt.Errorf("creating import staging directory: %w", err)
	}
	defer os.RemoveAll(stage)
	if err := extractProjectPackage(ctx, archivePath, stage); err != nil {
		return workspaceProjectRecord{}, err
	}
	if err := ctx.Err(); err != nil {
		return workspaceProjectRecord{}, err
	}
	if err := os.Rename(stage, target); err != nil {
		return workspaceProjectRecord{}, fmt.Errorf("committing imported project: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = os.RemoveAll(target)
		}
	}()
	now := timestamp.NowRFC3339Nano()
	project := preview.Project
	project.ProjectDir = target
	project.RelativeDir = shared.DisplayProjectDir(store.dir, target)
	project.UpdatedAt = now
	if err := ctx.Err(); err != nil {
		return workspaceProjectRecord{}, err
	}
	if err := store.workspace.RegisterProject(ctx, workspaceProjectModel{
		ID: project.ID, Name: project.Name, Description: project.Description,
		Category: persistedProjectCategory, Status: repository.ProjectStatusActive,
		ProjectDir: target, RelativeDir: project.RelativeDir,
		CreatedAt: domain.TimeFromString(project.CreatedAt), UpdatedAt: domain.TimeFromString(now),
	}); err != nil {
		return workspaceProjectRecord{}, err
	}
	committed = true
	return project, nil
}

func (store *Service) previewProjectPackageUnlocked(ctx context.Context, archivePath string) (ProjectPackagePreview, error) {
	if store.initErr != nil {
		return ProjectPackagePreview{}, store.initErr
	}
	if err := ctx.Err(); err != nil {
		return ProjectPackagePreview{}, err
	}
	archivePath, err := absoluteFile(archivePath)
	if err != nil {
		return ProjectPackagePreview{}, invalidPackage(err.Error())
	}
	archive, err := os.Open(archivePath)
	if err != nil {
		return ProjectPackagePreview{}, fmt.Errorf("reading project package: %w", err)
	}
	defer archive.Close()
	info, err := archive.Stat()
	if err != nil {
		return ProjectPackagePreview{}, fmt.Errorf("reading project package: %w", err)
	}
	hash := sha256.New()
	if _, err := io.Copy(hash, archive); err != nil {
		return ProjectPackagePreview{}, fmt.Errorf("hashing project package: %w", err)
	}
	if _, err := archive.Seek(0, io.SeekStart); err != nil {
		return ProjectPackagePreview{}, fmt.Errorf("seeking project package: %w", err)
	}
	r, err := zip.NewReader(archive, info.Size())
	if err != nil {
		return ProjectPackagePreview{}, invalidPackage("archive is not a ZIP file")
	}
	manifest, count, total, err := readPackageManifest(ctx, r)
	if err != nil {
		return ProjectPackagePreview{}, err
	}
	return ProjectPackagePreview{Project: workspaceProjectRecord{
		ID: manifest.ProjectID, Name: manifest.Name, Description: manifest.Description,
		Status: repository.ProjectStatusActive, CreatedAt: manifest.CreatedAt, UpdatedAt: manifest.CreatedAt,
	}, Archive: archivePath, Fingerprint: hex.EncodeToString(hash.Sum(nil)), FileCount: count, TotalBytes: total}, nil
}

func readPackageManifest(ctx context.Context, r *zip.Reader) (projectPackageManifest, int, int64, error) {
	var manifest projectPackageManifest
	seen := map[string]bool{}
	var manifestData []byte
	count := 0
	var total int64
	var projectManifestData []byte
	for _, file := range r.File {
		if err := ctx.Err(); err != nil {
			return manifest, 0, 0, err
		}
		name := filepath.ToSlash(file.Name)
		if !safePackagePath(name) || seen[name] || file.FileInfo().Mode()&os.ModeSymlink != 0 {
			return manifest, 0, 0, invalidPackage("archive contains an unsafe or duplicate path")
		}
		seen[name] = true
		if file.FileInfo().IsDir() {
			continue
		}
		if file.UncompressedSize64 > maxProjectPackageBytes {
			return manifest, 0, 0, invalidPackage("archive file is too large")
		}
		total += int64(file.UncompressedSize64)
		count++
		if count > maxProjectPackageFiles || total > maxProjectPackageBytes {
			return manifest, 0, 0, invalidPackage("package exceeds size or file-count limits")
		}
		if name == "mediago-project.json" {
			if file.UncompressedSize64 > maxProjectPackageManifestSize {
				return manifest, 0, 0, invalidPackage("package manifest is too large")
			}
			reader, err := file.Open()
			if err != nil {
				return manifest, 0, 0, invalidPackage("cannot read package manifest")
			}
			manifestData, err = io.ReadAll(io.LimitReader(reader, maxProjectPackageManifestSize+1))
			_ = reader.Close()
			if err != nil || len(manifestData) > maxProjectPackageManifestSize {
				return manifest, 0, 0, invalidPackage("cannot read package manifest")
			}
		} else if name == "project.media.json" {
			reader, err := file.Open()
			if err != nil {
				return manifest, 0, 0, invalidPackage("cannot read project manifest")
			}
			projectManifestData, err = io.ReadAll(io.LimitReader(reader, 1<<20+1))
			_ = reader.Close()
			if err != nil || len(projectManifestData) > 1<<20 {
				return manifest, 0, 0, invalidPackage("project manifest is too large or unreadable")
			}
		}
	}
	if len(manifestData) == 0 || json.Unmarshal(manifestData, &manifest) != nil || manifest.SchemaVersion != projectPackageSchemaVersion ||
		domain.CleanProjectID(manifest.ProjectID) != manifest.ProjectID || manifest.ProjectID == "" || strings.TrimSpace(manifest.Name) == "" {
		return manifest, 0, 0, invalidPackage("unsupported package schema")
	}
	if !seen["project.media.json"] {
		return manifest, 0, 0, invalidPackage("package is missing project.media.json")
	}
	var projectManifest shared.ProjectManifestFile
	if json.Unmarshal(projectManifestData, &projectManifest) != nil || projectManifest.SchemaVersion != 1 || projectManifest.ProjectID != manifest.ProjectID {
		return manifest, 0, 0, invalidPackage("project package identity does not match its project manifest")
	}
	if _, err := time.Parse(time.RFC3339Nano, manifest.CreatedAt); err != nil {
		return manifest, 0, 0, invalidPackage("invalid project creation time")
	}
	return manifest, count, total, nil
}

func extractProjectPackage(ctx context.Context, archivePath, target string) error {
	archive, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("reading project package: %w", err)
	}
	defer archive.Close()
	info, err := archive.Stat()
	if err != nil {
		return fmt.Errorf("reading project package: %w", err)
	}
	r, err := zip.NewReader(archive, info.Size())
	if err != nil {
		return invalidPackage("archive is not a ZIP file")
	}
	if _, _, _, err := readPackageManifest(ctx, r); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(target, "work"), 0o755); err != nil {
		return fmt.Errorf("creating project work directory: %w", err)
	}
	for _, file := range r.File {
		if file.FileInfo().IsDir() || file.Name == "mediago-project.json" {
			continue
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		path := filepath.Join(target, filepath.FromSlash(file.Name))
		if !isPathWithin(path, target) {
			return invalidPackage("archive path escapes destination")
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return fmt.Errorf("creating import path: %w", err)
		}
		reader, err := file.Open()
		if err != nil {
			return fmt.Errorf("opening archive entry: %w", err)
		}
		out, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
		if err == nil {
			_, err = io.Copy(out, io.LimitReader(reader, maxProjectPackageBytes+1))
			_ = out.Close()
		}
		_ = reader.Close()
		if err != nil {
			return fmt.Errorf("extracting archive entry: %w", err)
		}
	}
	manifest, err := shared.ReadProjectManifestFile(filepath.Join(target, "project.media.json"))
	packageManifest, _, _, packageErr := readPackageManifest(ctx, r)
	if err != nil || manifest.SchemaVersion != 1 || packageErr != nil || manifest.ProjectID != packageManifest.ProjectID {
		return invalidPackage("package is missing a valid project.media.json")
	}
	if _, err := os.Stat(filepath.Join(target, "work")); err != nil {
		return invalidPackage("package is missing the work directory")
	}
	return nil
}

func packageFiles(projectDir string) ([]string, int64, error) {
	manifestPath := filepath.Join(projectDir, "project.media.json")
	manifestInfo, err := os.Lstat(manifestPath)
	if err != nil || !manifestInfo.Mode().IsRegular() {
		return nil, 0, invalidPackage("project manifest must be a regular file")
	}
	files := []string{"project.media.json"}
	count := 2 // project manifest and package manifest
	totalBytes := manifestInfo.Size()
	for _, root := range []string{"work", "library"} {
		base := filepath.Join(projectDir, root)
		rootInfo, err := os.Lstat(base)
		if os.IsNotExist(err) {
			continue
		} else if err != nil {
			return nil, 0, fmt.Errorf("checking project %s: %w", root, err)
		} else if !rootInfo.IsDir() || rootInfo.Mode()&os.ModeSymlink != 0 {
			return nil, 0, invalidPackage("project roots must be directories")
		}
		err = filepath.WalkDir(base, func(path string, entry os.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if entry.Type()&os.ModeSymlink != 0 {
				return fmt.Errorf("project contains symlink: %s", path)
			}
			if entry.IsDir() {
				return nil
			}
			info, err := entry.Info()
			if err != nil {
				return err
			}
			if !info.Mode().IsRegular() {
				return invalidPackage("project files must be regular files")
			}
			count++
			totalBytes += info.Size()
			if count > maxProjectPackageFiles || totalBytes > maxProjectPackageBytes {
				return invalidPackage("project exceeds package size or file-count limits")
			}
			rel, err := filepath.Rel(projectDir, path)
			if err != nil {
				return err
			}
			files = append(files, filepath.ToSlash(rel))
			return nil
		})
		if err != nil {
			return nil, 0, fmt.Errorf("scanning project files: %w", err)
		}
	}
	sort.Strings(files)
	if count > maxProjectPackageFiles || totalBytes > maxProjectPackageBytes {
		return nil, 0, invalidPackage("project exceeds package size or file-count limits")
	}
	return files, totalBytes, nil
}

func writeZipBytes(zw *zip.Writer, name string, data []byte) error {
	header := &zip.FileHeader{Name: filepath.ToSlash(name), Method: zip.Deflate, Modified: time.Unix(0, 0).UTC()}
	writer, err := zw.CreateHeader(header)
	if err != nil {
		return err
	}
	_, err = writer.Write(data)
	return err
}

func safePackagePath(name string) bool {
	name = filepath.ToSlash(strings.TrimSpace(name))
	if name == "" || strings.HasPrefix(name, "/") || strings.Contains(name, "\\") {
		return false
	}
	directory := strings.HasSuffix(name, "/")
	path := strings.TrimSuffix(name, "/")
	clean := filepath.ToSlash(filepath.Clean(path))
	if clean != path || clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return false
	}
	if directory && (clean == "work" || clean == "library") {
		return true
	}
	return clean == "mediago-project.json" || clean == "project.media.json" || strings.HasPrefix(clean, "work/") || strings.HasPrefix(clean, "library/")
}

func absoluteDirectory(value string) (string, error) {
	value = filepath.Clean(strings.TrimSpace(value))
	if value == "." || !filepath.IsAbs(value) {
		return "", fmt.Errorf("destination must be an absolute directory")
	}
	return value, nil
}

func absoluteFile(value string) (string, error) {
	value = filepath.Clean(strings.TrimSpace(value))
	if value == "." || !filepath.IsAbs(value) {
		return "", fmt.Errorf("archive must be an absolute file")
	}
	info, err := os.Stat(value)
	if err != nil {
		return "", err
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("archive is not a regular file")
	}
	return value, nil
}

func safePackageName(value string) string {
	value = domain.CleanProjectID(value)
	if value == "" {
		return "project"
	}
	return value
}

func invalidPackage(message string) error {
	return fmt.Errorf("%w: %s", ErrInvalidProjectPackage, message)
}
