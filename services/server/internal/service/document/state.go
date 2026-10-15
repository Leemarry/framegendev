package document

import (
	"fmt"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
)

func (store *Service) load(projectID string) (workspaceStateResponse, error) {
	if store.initErr != nil {
		return workspaceStateResponse{}, store.initErr
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	state, err := store.loadUnlocked(projectID)
	if err != nil {
		return workspaceStateResponse{}, err
	}
	return state, nil
}

// LoadWorkspaceState returns complete workspace state for HTTP handlers.
func (store *Service) LoadWorkspaceState(projectID string) (workspaceStateResponse, error) {
	return store.load(projectID)
}

func (store *Service) save(projectID string, request workspaceStateRequest) (workspaceStateResponse, error) {
	if store.initErr != nil {
		return workspaceStateResponse{}, store.initErr
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	if request.ExpectedVersions != nil {
		current, err := store.loadUnlocked(projectID)
		if err != nil {
			return workspaceStateResponse{}, err
		}
		seen := make(map[string]bool, len(current.Documents))
		for _, document := range current.Documents {
			seen[document.ID] = true
			expected, ok := request.ExpectedVersions[document.ID]
			if !ok || expected != document.Version {
				return workspaceStateResponse{}, workspaceVersionConflictError{DocumentID: document.ID, Expected: expected, Current: document.Version}
			}
		}
		for id, expected := range request.ExpectedVersions {
			if !seen[id] {
				return workspaceStateResponse{}, workspaceVersionConflictError{DocumentID: id, Expected: expected, Current: 0}
			}
		}
	}
	return store.saveUnlocked(projectID, request)
}

// SaveWorkspaceState replaces complete workspace state for HTTP handlers.
func (store *Service) SaveWorkspaceState(projectID string, request workspaceStateRequest) (workspaceStateResponse, error) {
	return store.save(projectID, request)
}

func (store *Service) loadUnlocked(projectID string) (workspaceStateResponse, error) {
	projectID = domain.CleanProjectID(projectID)

	documents, folders, err := store.loadLocalMarkdownWorkspaceUnlocked(projectID)
	if err != nil {
		return workspaceStateResponse{}, err
	}
	operationLog, err := store.loadOperationLogFromDBUnlocked(projectID)
	if err != nil {
		return workspaceStateResponse{}, err
	}

	return workspaceStateResponse{
		WorkspaceDir: store.projectDir(projectID),
		ProjectID:    projectID,
		Documents:    documents,
		Folders:      folders,
		OperationLog: operationLog,
	}, nil
}

func (store *Service) requireReady() error {
	if store == nil {
		return fmt.Errorf("document store is not configured")
	}
	return store.initErr
}
