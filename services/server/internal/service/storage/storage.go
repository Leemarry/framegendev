package storage

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

const previewLifetime = 10 * time.Minute

type ProjectRoot struct {
	ID   string
	Path string
}

type CategoryUsage struct {
	ID           string `json:"id"`
	Bytes        int64  `json:"bytes"`
	FileCount    int64  `json:"fileCount"`
	SkippedCount int64  `json:"skippedCount"`
	UnknownCount int64  `json:"unknownCount"`
	ErrorCount   int64  `json:"errorCount"`
}

type Snapshot struct {
	Categories []CategoryUsage `json:"categories"`
	Bytes      int64           `json:"bytes"`
	FileCount  int64           `json:"fileCount"`
	Skipped    int64           `json:"skippedCount"`
	Unknown    int64           `json:"unknownCount"`
	Errors     int64           `json:"errorCount"`
	MeasuredAt time.Time       `json:"measuredAt"`
}

type Candidate struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Bytes      int64  `json:"bytes"`
	Active     bool   `json:"active"`
	CategoryID string `json:"categoryId"`
}

type Preview struct {
	Candidates []Candidate `json:"candidates"`
	Bytes      int64       `json:"bytes"`
	MeasuredAt time.Time   `json:"measuredAt"`
}

type Outcome struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Bytes  int64  `json:"bytes"`
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type CleanupResult struct {
	Outcomes []Outcome `json:"outcomes"`
	Removed  int64     `json:"removed"`
	Skipped  int64     `json:"skipped"`
	Failed   int64     `json:"failed"`
	Bytes    int64     `json:"bytes"`
}

type candidateRecord struct {
	Candidate
	root    string
	rel     string
	modTime int64
	expires time.Time
}

type Service struct {
	paths      shared.WorkspacePaths
	mu         sync.Mutex
	candidates map[string]candidateRecord
}

func New(workspaceRoot string) *Service {
	return &Service{paths: shared.WorkspacePathsFor(workspaceRoot)}
}

func (service *Service) Scan(projects []ProjectRoot) Snapshot {
	projectRoots, unknown := normalizeProjects(projects)
	posterRoots := []string{service.paths.MediaPosterCacheDir()}
	for _, project := range projectRoots {
		posterRoots = append(posterRoots, shared.ProjectMediaPosterCacheDir(project.Path))
	}
	posterRoots = uniquePaths(posterRoots)
	allProjectPaths := projectRootsToPaths(projectRoots)
	metadataRoot := service.paths.GlobalMetadataDir()
	libraryRoot := service.paths.LibraryAssetsDir()

	categories := []CategoryUsage{
		{ID: "projects", UnknownCount: unknown},
		{ID: "media-library"},
		{ID: "application-metadata"},
		{ID: "poster-cache"},
	}
	for _, project := range projectRoots {
		nested := false
		for _, other := range projectRoots {
			if other.Path != project.Path && pathContains(other.Path, project.Path) {
				nested = true
				break
			}
		}
		if nested {
			continue
		}
		categories[0] = walkCategory(categories[0], project.Path, nestedPaths(project.Path, append(append([]string{}, posterRoots...), libraryRoot, metadataRoot)))
	}
	if !containsExactPath(allProjectPaths, libraryRoot) {
		categories[1] = walkCategory(categories[1], libraryRoot, nestedPaths(libraryRoot, append(append([]string{}, allProjectPaths...), posterRoots...)))
	}
	metadataExcludes := append(append([]string{}, allProjectPaths...), libraryRoot)
	metadataExcludes = append(metadataExcludes, posterRoots...)
	if !containsExactPath(allProjectPaths, metadataRoot) {
		categories[2] = walkCategory(categories[2], metadataRoot, nestedPaths(metadataRoot, metadataExcludes))
	}
	for _, root := range posterRoots {
		categories[3] = walkCategory(categories[3], root, nil)
	}
	var snapshot Snapshot
	snapshot.Categories = categories
	snapshot.MeasuredAt = time.Now().UTC()
	for _, category := range categories {
		snapshot.Bytes += category.Bytes
		snapshot.FileCount += category.FileCount
		snapshot.Skipped += category.SkippedCount
		snapshot.Unknown += category.UnknownCount
		snapshot.Errors += category.ErrorCount
	}
	return snapshot
}

func (service *Service) Preview(projects []ProjectRoot) (Preview, error) {
	roots := []struct {
		path, category string
	}{{service.paths.MediaPosterCacheDir(), "workspace"}}
	normalizedProjects, _ := normalizeProjects(projects)
	for _, project := range normalizedProjects {
		if strings.TrimSpace(project.Path) != "" {
			roots = append(roots, struct{ path, category string }{
				path: shared.ProjectMediaPosterCacheDir(project.Path), category: project.ID,
			})
		}
	}
	service.mu.Lock()
	defer service.mu.Unlock()
	service.candidates = make(map[string]candidateRecord)
	result := Preview{Candidates: make([]Candidate, 0), MeasuredAt: time.Now().UTC()}
	for _, root := range roots {
		rootPath := filepath.Clean(root.path)
		info, err := os.Lstat(rootPath)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			service.candidates = make(map[string]candidateRecord)
			return Preview{}, fmt.Errorf("checking poster cache: %w", err)
		}
		if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
			continue
		}
		if err := filepath.WalkDir(rootPath, func(path string, entry fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if entry.Type()&os.ModeSymlink != 0 {
				if entry.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
			if entry.IsDir() {
				return nil
			}
			if !strings.HasSuffix(strings.ToLower(entry.Name()), ".poster.jpg") {
				return nil
			}
			fileInfo, err := entry.Info()
			if err != nil {
				return err
			}
			if !fileInfo.Mode().IsRegular() {
				return nil
			}
			rel, err := filepath.Rel(rootPath, path)
			if err != nil || rel == "." || filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
				return nil
			}
			id, err := opaqueID()
			if err != nil {
				return err
			}
			candidate := Candidate{ID: id, Name: filepath.Base(path), Bytes: fileInfo.Size(), Active: shared.MediaPosterInUse(path), CategoryID: root.category}
			service.candidates[id] = candidateRecord{
				Candidate: candidate, root: rootPath, rel: rel,
				modTime: fileInfo.ModTime().UnixNano(), expires: result.MeasuredAt.Add(previewLifetime),
			}
			result.Candidates = append(result.Candidates, candidate)
			result.Bytes += candidate.Bytes
			return nil
		}); err != nil {
			service.candidates = make(map[string]candidateRecord)
			return Preview{}, fmt.Errorf("reading poster cache: %w", err)
		}
	}
	sort.Slice(result.Candidates, func(i, j int) bool { return result.Candidates[i].Name < result.Candidates[j].Name })
	return result, nil
}

func (service *Service) Cleanup(ids []string) CleanupResult {
	service.mu.Lock()
	defer service.mu.Unlock()
	result := CleanupResult{Outcomes: make([]Outcome, 0, len(ids))}
	for _, id := range ids {
		record, ok := service.candidates[id]
		outcome := Outcome{ID: id}
		if !ok || time.Now().After(record.expires) {
			outcome.Status, outcome.Reason = "skipped", "preview expired or unknown"
			result.Skipped++
			result.Outcomes = append(result.Outcomes, outcome)
			continue
		}
		outcome.Name, outcome.Bytes = record.Name, record.Bytes
		unlock, acquired := shared.TryAcquireMediaPosterCleanup(filepath.Join(record.root, record.rel))
		if !acquired {
			outcome.Status, outcome.Reason = "skipped", "poster is in use"
			result.Skipped++
			result.Outcomes = append(result.Outcomes, outcome)
			continue
		}
		status, reason := removeCandidate(record)
		unlock()
		outcome.Status, outcome.Reason = status, reason
		switch status {
		case "removed":
			result.Removed++
			result.Bytes += record.Bytes
			delete(service.candidates, id)
		case "skipped":
			result.Skipped++
		case "failed":
			result.Failed++
		}
		result.Outcomes = append(result.Outcomes, outcome)
	}
	return result
}

func removeCandidate(record candidateRecord) (string, string) {
	rootInfo, err := os.Lstat(record.root)
	if err != nil || !rootInfo.IsDir() || rootInfo.Mode()&os.ModeSymlink != 0 {
		return "skipped", "cache root changed"
	}
	rel := filepath.Clean(record.rel)
	if rel == "." || filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "skipped", "candidate escaped cache root"
	}
	root, err := os.OpenRoot(record.root)
	if err != nil {
		return "failed", "cache root unavailable"
	}
	defer root.Close()
	info, err := root.Lstat(rel)
	if err != nil {
		return "skipped", "candidate no longer exists"
	}
	if !info.Mode().IsRegular() || !strings.HasSuffix(strings.ToLower(filepath.Base(rel)), ".poster.jpg") {
		return "skipped", "candidate is not a regular poster file"
	}
	if info.Size() != record.Bytes || info.ModTime().UnixNano() != record.modTime {
		return "skipped", "candidate changed after preview"
	}
	if err := root.Remove(rel); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "skipped", "candidate no longer exists"
		}
		return "failed", "remove failed"
	}
	return "removed", ""
}

func walkCategory(category CategoryUsage, root string, excluded []string) CategoryUsage {
	root = filepath.Clean(root)
	info, err := os.Lstat(root)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			category.SkippedCount++
		} else {
			category.ErrorCount++
		}
		return category
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		category.SkippedCount++
		return category
	}
	excluded = normalizedPaths(excluded)
	_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			category.ErrorCount++
			return nil
		}
		path = filepath.Clean(path)
		if path != root && containsPath(excluded, path) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.Type()&os.ModeSymlink != 0 {
			category.SkippedCount++
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			return nil
		}
		fileInfo, err := entry.Info()
		if err != nil {
			category.ErrorCount++
			return nil
		}
		if !fileInfo.Mode().IsRegular() {
			category.SkippedCount++
			return nil
		}
		category.Bytes += fileInfo.Size()
		category.FileCount++
		return nil
	})
	return category
}

func normalizeProjects(projects []ProjectRoot) ([]ProjectRoot, int64) {
	var result []ProjectRoot
	var unknown int64
	for _, project := range projects {
		path := strings.TrimSpace(project.Path)
		if path == "" {
			unknown++
			continue
		}
		result = append(result, ProjectRoot{ID: project.ID, Path: filepath.Clean(shared.ResolveWorkspaceDir(path))})
	}
	sort.Slice(result, func(i, j int) bool { return len(result[i].Path) < len(result[j].Path) })
	var unique []ProjectRoot
	for _, candidate := range result {
		duplicate := false
		for _, existing := range unique {
			if existing.Path == candidate.Path {
				duplicate = true
				break
			}
		}
		if !duplicate {
			unique = append(unique, candidate)
		}
	}
	return unique, unknown
}

func projectRootsToPaths(projects []ProjectRoot) []string {
	paths := make([]string, 0, len(projects))
	for _, project := range projects {
		paths = append(paths, project.Path)
	}
	return paths
}

func normalizedPaths(paths []string) []string {
	result := make([]string, 0, len(paths))
	for _, path := range paths {
		if strings.TrimSpace(path) != "" {
			result = append(result, filepath.Clean(path))
		}
	}
	return result
}

func uniquePaths(paths []string) []string {
	paths = normalizedPaths(paths)
	seen := make(map[string]struct{}, len(paths))
	result := make([]string, 0, len(paths))
	for _, path := range paths {
		if _, exists := seen[path]; exists {
			continue
		}
		seen[path] = struct{}{}
		result = append(result, path)
	}
	return result
}

func nestedPaths(root string, paths []string) []string {
	var nested []string
	for _, path := range uniquePaths(paths) {
		if path != root && pathContains(root, path) {
			nested = append(nested, path)
		}
	}
	return nested
}

func containsExactPath(paths []string, target string) bool {
	for _, path := range paths {
		if filepath.Clean(path) == filepath.Clean(target) {
			return true
		}
	}
	return false
}

func containsPath(paths []string, target string) bool {
	for _, path := range paths {
		if pathContains(path, target) {
			return true
		}
	}
	return false
}

func pathContains(root, target string) bool {
	rel, err := filepath.Rel(root, target)
	return err == nil && (rel == "." || (rel != ".." && !filepath.IsAbs(rel) && !strings.HasPrefix(rel, ".."+string(filepath.Separator))))
}

func opaqueID() (string, error) {
	var bytes [24]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", fmt.Errorf("creating candidate ID: %w", err)
	}
	return hex.EncodeToString(bytes[:]), nil
}
