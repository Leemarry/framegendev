package document

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ErrInvalidProjectDirectory identifies an unsupported local project directory.
var ErrInvalidProjectDirectory = errors.New("invalid project directory")

// ErrProjectDirectoryConflict identifies a changed source or registered identity collision.
var ErrProjectDirectoryConflict = errors.New("project directory conflict")

// ProjectDirectoryPreview describes a validated directory without modifying it.
type ProjectDirectoryPreview struct {
	Project     workspaceProjectRecord `json:"project"`
	Fingerprint string                 `json:"fingerprint"`
	Registered  bool                   `json:"registered"`
}

// PreviewProjectDirectory validates a local v1 project without registering it.
func (store *Service) PreviewProjectDirectory(ctx context.Context, directory string) (ProjectDirectoryPreview, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return store.previewProjectDirectoryUnlocked(ctx, directory)
}

// OpenProjectDirectory registers the confirmed directory without initializing documents.
func (store *Service) OpenProjectDirectory(ctx context.Context, directory, fingerprint string) (workspaceProjectRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	preview, err := store.previewProjectDirectoryUnlocked(ctx, directory)
	if err != nil {
		return workspaceProjectRecord{}, err
	}
	if fingerprint == "" || fingerprint != preview.Fingerprint {
		return workspaceProjectRecord{}, fmt.Errorf("%w: 项目配置已变化，请重新预览", ErrProjectDirectoryConflict)
	}
	if preview.Registered {
		return preview.Project, nil
	}
	if err := ctx.Err(); err != nil {
		return workspaceProjectRecord{}, err
	}
	p := preview.Project
	if err := store.workspace.RegisterProject(ctx, workspaceProjectModel{
		ID: p.ID, Name: p.Name, Description: p.Description, Category: persistedProjectCategory,
		Status: repository.ProjectStatusActive, ProjectDir: p.ProjectDir, RelativeDir: p.RelativeDir,
		CreatedAt: domain.TimeFromString(p.CreatedAt), UpdatedAt: domain.TimeFromString(p.UpdatedAt),
	}); err != nil {
		return workspaceProjectRecord{}, err
	}
	return p, nil
}

func (store *Service) previewProjectDirectoryUnlocked(ctx context.Context, directory string) (ProjectDirectoryPreview, error) {
	invalid := func(message string) (ProjectDirectoryPreview, error) {
		return ProjectDirectoryPreview{}, fmt.Errorf("%w: %s", ErrInvalidProjectDirectory, message)
	}
	if store.initErr != nil {
		return ProjectDirectoryPreview{}, store.initErr
	}
	if err := ctx.Err(); err != nil {
		return ProjectDirectoryPreview{}, err
	}
	if !filepath.IsAbs(directory) {
		return invalid("请选择完整的本地项目目录")
	}
	directory, err := filepath.EvalSymlinks(filepath.Clean(directory))
	if err != nil {
		return invalid("目录不存在或不可访问")
	}
	manifestPath := filepath.Join(directory, "project.media.json")
	info, err := os.Lstat(manifestPath)
	if err != nil || !info.Mode().IsRegular() || info.Size() > 1024*1024 {
		return invalid("目录中缺少有效的 project.media.json")
	}
	f, err := os.Open(manifestPath)
	if err != nil {
		return ProjectDirectoryPreview{}, fmt.Errorf("opening project manifest: %w", err)
	}
	data, err := io.ReadAll(io.LimitReader(f, 1024*1024+1))
	_ = f.Close()
	if err != nil {
		return ProjectDirectoryPreview{}, fmt.Errorf("reading project manifest: %w", err)
	}
	var manifest shared.ProjectManifestFile
	if len(data) > 1024*1024 || json.Unmarshal(data, &manifest) != nil || manifest.SchemaVersion != 1 ||
		manifest.ProjectID == "" || domain.CleanProjectID(manifest.ProjectID) != manifest.ProjectID || strings.TrimSpace(manifest.Name) == "" {
		return invalid("项目配置格式不受支持，需要有效的 v1 项目配置")
	}
	if _, err := time.Parse(time.RFC3339Nano, manifest.CreatedAt); err != nil {
		return invalid("项目创建时间无效")
	}
	work := filepath.Join(directory, "work")
	if info, err := os.Lstat(work); err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return invalid("项目缺少有效的 work 文档目录")
	}
	// Opening an arbitrary tree must not make the existing scanner follow file links.
	if err := filepath.WalkDir(directory, func(_ string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		if entry.Type()&os.ModeSymlink != 0 {
			return ErrInvalidProjectDirectory
		}
		return nil
	}); err != nil {
		return invalid("项目包含链接或无法读取的文件，请使用完整的本地项目目录")
	}
	models, err := store.workspace.ListProjectsByStatus(repository.ProjectStatusAll)
	if err != nil {
		return ProjectDirectoryPreview{}, err
	}
	preview := ProjectDirectoryPreview{Project: workspaceProjectRecord{
		ID: manifest.ProjectID, Name: manifest.Name, Description: manifest.Description,
		Status: repository.ProjectStatusActive, ProjectDir: directory,
		RelativeDir: shared.DisplayProjectDir(store.dir, directory),
		CreatedAt:   manifest.CreatedAt, UpdatedAt: manifest.CreatedAt,
	}}
	for _, model := range models {
		registeredDir := filepath.Clean(model.ProjectDir)
		if resolved, err := filepath.EvalSymlinks(registeredDir); err == nil {
			registeredDir = resolved
		}
		samePath := directory == registeredDir || (runtime.GOOS == "windows" && strings.EqualFold(directory, registeredDir))
		if model.ID != manifest.ProjectID && !samePath {
			continue
		}
		if model.ID != manifest.ProjectID || !samePath || model.Status != repository.ProjectStatusActive {
			return ProjectDirectoryPreview{}, fmt.Errorf("%w: 项目标识或目录已登记，或项目已归档/移入垃圾箱，请从项目列表处理", ErrProjectDirectoryConflict)
		}
		preview.Project = WorkspaceProjectRecordsFromModels([]workspaceProjectModel{model})[0]
		preview.Registered = true
	}
	tree, err := scanLocalMarkdownTree(work, newMarkdownFileCache(), nil)
	if err != nil {
		return ProjectDirectoryPreview{}, err
	}
	preview.Project.DocumentCount = len(tree.Files)
	hash := sha256.Sum256(data)
	preview.Fingerprint = hex.EncodeToString(hash[:])
	return preview, nil
}
