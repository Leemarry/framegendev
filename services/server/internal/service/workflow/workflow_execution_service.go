package workflow

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	serviceshared "github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ExecutionService handles workflow execution, output bindings, and asset tracking.
type ExecutionService struct {
	workflows WorkflowStore
	bindings  *repository.WorkflowOutputBindingRepository
	assets    *repository.WorkflowAssetRepository
	tasks     *repository.WorkflowNodeTaskRepository
	runner    *WorkflowRunner
	initErr   error
	newID     func() string
	now       func() time.Time
}

// NewExecutionService returns a workflow execution service.
func NewExecutionService(
	workflows WorkflowStore,
	bindings *repository.WorkflowOutputBindingRepository,
	assets *repository.WorkflowAssetRepository,
	tasks *repository.WorkflowNodeTaskRepository,
	runner *WorkflowRunner,
	initErr error,
) *ExecutionService {
	service := &ExecutionService{
		workflows: workflows,
		bindings:  bindings,
		assets:    assets,
		tasks:     tasks,
		runner:    runner,
		initErr:   initErr,
		newID: func() string {
			return serviceshared.MustRandomID("wf")
		},
		now: time.Now,
	}
	if service.initErr == nil && (workflows == nil || bindings == nil || assets == nil || tasks == nil) {
		service.initErr = errors.New("workflow execution dependencies are incomplete")
	}
	return service
}

func (service *ExecutionService) ready() error {
	return service.initErr
}

// --- Output Bindings ---

// CreateOutputBinding creates a new output binding for a workflow node.
func (service *ExecutionService) CreateOutputBinding(ctx context.Context, req dto.CreateOutputBindingRequest) (dto.OutputBindingDTO, error) {
	if err := service.ready(); err != nil {
		return dto.OutputBindingDTO{}, err
	}

	workflowID := strings.TrimSpace(req.WorkflowID)
	nodeID := strings.TrimSpace(req.NodeID)
	segmentName := strings.TrimSpace(req.SegmentName)
	displayName := strings.TrimSpace(req.DisplayName)

	if workflowID == "" || nodeID == "" || segmentName == "" || displayName == "" {
		return dto.OutputBindingDTO{}, validationError("workflowId, nodeId, segmentName 和 displayName 不能为空")
	}

	// Verify workflow exists
	_, err := service.workflows.GetByID(ctx, workflowID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return dto.OutputBindingDTO{}, ErrWorkflowNotFound
		}
		return dto.OutputBindingDTO{}, fmt.Errorf("verifying workflow: %w", err)
	}

	binding := domain.WorkflowOutputBinding{
		ID:          service.newID(),
		WorkflowID:  workflowID,
		NodeID:      nodeID,
		SegmentName: segmentName,
		DisplayName: displayName,
		SortOrder:   req.SortOrder,
		IsMain:      false,
		CreatedAt:   service.now(),
		UpdatedAt:   service.now(),
	}

	created, err := service.bindings.CreateBinding(ctx, binding)
	if err != nil {
		return dto.OutputBindingDTO{}, fmt.Errorf("creating output binding: %w", err)
	}

	return service.toOutputBindingDTO(created), nil
}

// ListOutputBindings lists all output bindings for a workflow, sorted by sortOrder.
func (service *ExecutionService) ListOutputBindings(ctx context.Context, workflowID string) (dto.ListOutputBindingsResponse, error) {
	if err := service.ready(); err != nil {
		return dto.ListOutputBindingsResponse{}, err
	}

	bindings, err := service.bindings.ListBindingsByWorkflow(ctx, workflowID)
	if err != nil {
		return dto.ListOutputBindingsResponse{}, fmt.Errorf("listing output bindings: %w", err)
	}

	dtos := make([]dto.OutputBindingDTO, len(bindings))
	for i, binding := range bindings {
		dtos[i] = service.toOutputBindingDTO(binding)
	}

	return dto.ListOutputBindingsResponse{Bindings: dtos}, nil
}

// UpdateOutputBinding updates a binding's display name or sort order.
func (service *ExecutionService) UpdateOutputBinding(ctx context.Context, id string, req dto.UpdateOutputBindingRequest) (dto.OutputBindingDTO, error) {
	if err := service.ready(); err != nil {
		return dto.OutputBindingDTO{}, err
	}

	binding, err := service.bindings.GetBindingByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return dto.OutputBindingDTO{}, validationError("output binding not found")
		}
		return dto.OutputBindingDTO{}, fmt.Errorf("getting output binding: %w", err)
	}

	if req.DisplayName != nil {
		binding.DisplayName = strings.TrimSpace(*req.DisplayName)
	}
	if req.SortOrder != nil {
		binding.SortOrder = *req.SortOrder
	}
	binding.UpdatedAt = service.now()

	if err := service.bindings.UpdateBinding(ctx, binding); err != nil {
		return dto.OutputBindingDTO{}, fmt.Errorf("updating output binding: %w", err)
	}

	return service.toOutputBindingDTO(binding), nil
}

// DeleteOutputBinding deletes an output binding.
func (service *ExecutionService) DeleteOutputBinding(ctx context.Context, id string) error {
	if err := service.ready(); err != nil {
		return err
	}

	err := service.bindings.DeleteBinding(ctx, id)
	if err != nil && !errors.Is(err, repository.ErrRecordNotFound) {
		return fmt.Errorf("deleting output binding: %w", err)
	}
	return nil
}

// SetMainBinding sets the main output binding for a workflow.
func (service *ExecutionService) SetMainBinding(ctx context.Context, workflowID string, bindingID string) error {
	if err := service.ready(); err != nil {
		return err
	}

	// Verify the binding exists and belongs to this workflow
	binding, err := service.bindings.GetBindingByID(ctx, bindingID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return validationError("output binding not found")
		}
		return fmt.Errorf("getting output binding: %w", err)
	}

	if binding.WorkflowID != workflowID {
		return validationError("output binding does not belong to this workflow")
	}

	if err := service.bindings.SetMainBinding(ctx, workflowID, bindingID); err != nil {
		return fmt.Errorf("setting main binding: %w", err)
	}

	return nil
}

// --- Assets ---

// RegisterAsset registers a new workflow asset.
func (service *ExecutionService) RegisterAsset(ctx context.Context, req dto.RegisterAssetRequest) (dto.WorkflowAssetDTO, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowAssetDTO{}, err
	}

	workflowID := strings.TrimSpace(req.WorkflowID)
	nodeID := strings.TrimSpace(req.NodeID)
	assetPath := strings.TrimSpace(req.AssetPath)
	assetType := strings.TrimSpace(req.AssetType)

	if workflowID == "" || nodeID == "" || assetPath == "" || assetType == "" {
		return dto.WorkflowAssetDTO{}, validationError("workflowId, nodeId, assetPath 和 assetType 不能为空")
	}

	asset := domain.WorkflowAsset{
		ID:         service.newID(),
		WorkflowID: workflowID,
		NodeID:     nodeID,
		AssetPath:  assetPath,
		AssetType:  assetType,
		SizeBytes:  req.SizeBytes,
		CreatedAt:  service.now(),
	}

	created, err := service.assets.CreateAsset(ctx, asset)
	if err != nil {
		return dto.WorkflowAssetDTO{}, fmt.Errorf("registering asset: %w", err)
	}

	return service.toWorkflowAssetDTO(created), nil
}

// ListAssets lists all assets for a workflow.
func (service *ExecutionService) ListAssets(ctx context.Context, workflowID string) (dto.ListWorkflowAssetsResponse, error) {
	if err := service.ready(); err != nil {
		return dto.ListWorkflowAssetsResponse{}, err
	}

	assets, err := service.assets.ListAssetsByWorkflow(ctx, workflowID)
	if err != nil {
		return dto.ListWorkflowAssetsResponse{}, fmt.Errorf("listing assets: %w", err)
	}

	dtos := make([]dto.WorkflowAssetDTO, len(assets))
	for i, asset := range assets {
		dtos[i] = service.toWorkflowAssetDTO(asset)
	}

	return dto.ListWorkflowAssetsResponse{Assets: dtos}, nil
}

// ListAssetsByNode lists all assets for a specific workflow node.
func (service *ExecutionService) ListAssetsByNode(ctx context.Context, workflowID string, nodeID string) (dto.ListWorkflowAssetsResponse, error) {
	if err := service.ready(); err != nil {
		return dto.ListWorkflowAssetsResponse{}, err
	}

	assets, err := service.assets.ListAssetsByNode(ctx, workflowID, nodeID)
	if err != nil {
		return dto.ListWorkflowAssetsResponse{}, fmt.Errorf("listing node assets: %w", err)
	}

	dtos := make([]dto.WorkflowAssetDTO, len(assets))
	for i, asset := range assets {
		dtos[i] = service.toWorkflowAssetDTO(asset)
	}

	return dto.ListWorkflowAssetsResponse{Assets: dtos}, nil
}

// DeleteAsset deletes a workflow asset record.
func (service *ExecutionService) DeleteAsset(ctx context.Context, id string) error {
	if err := service.ready(); err != nil {
		return err
	}

	err := service.assets.DeleteAsset(ctx, id)
	if err != nil && !errors.Is(err, repository.ErrRecordNotFound) {
		return fmt.Errorf("deleting asset: %w", err)
	}
	return nil
}

// --- Node Tasks ---

// ExecuteNode creates a new task for a workflow node execution.
func (service *ExecutionService) ExecuteNode(ctx context.Context, req dto.ExecuteNodeRequest) (dto.NodeTaskDTO, error) {
	if err := service.ready(); err != nil {
		return dto.NodeTaskDTO{}, err
	}

	workflowID := strings.TrimSpace(req.WorkflowID)
	nodeID := strings.TrimSpace(req.NodeID)

	if workflowID == "" || nodeID == "" {
		return dto.NodeTaskDTO{}, validationError("workflowId 和 nodeId 不能为空")
	}

	// Verify workflow exists
	_, err := service.workflows.GetByID(ctx, workflowID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return dto.NodeTaskDTO{}, ErrWorkflowNotFound
		}
		return dto.NodeTaskDTO{}, fmt.Errorf("verifying workflow: %w", err)
	}

	task := domain.WorkflowNodeTask{
		ID:         service.newID(),
		WorkflowID: workflowID,
		NodeID:     nodeID,
		Status:     domain.WorkflowNodeTaskStatusPending,
		Progress:   0.0,
		CreatedAt:  service.now(),
		UpdatedAt:  service.now(),
	}

	created, err := service.tasks.CreateTask(ctx, task)
	if err != nil {
		return dto.NodeTaskDTO{}, fmt.Errorf("creating node task: %w", err)
	}

	return service.toNodeTaskDTO(created), nil
}

// GetNodeTask retrieves the task for a specific node.
func (service *ExecutionService) GetNodeTask(ctx context.Context, workflowID string, nodeID string) (dto.NodeTaskDTO, error) {
	if err := service.ready(); err != nil {
		return dto.NodeTaskDTO{}, err
	}

	task, err := service.tasks.GetTaskByNode(ctx, workflowID, nodeID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return dto.NodeTaskDTO{}, validationError("node task not found")
		}
		return dto.NodeTaskDTO{}, fmt.Errorf("getting node task: %w", err)
	}

	return service.toNodeTaskDTO(task), nil
}

// ListNodeTasks lists all tasks for a workflow.
func (service *ExecutionService) ListNodeTasks(ctx context.Context, workflowID string) (dto.ListNodeTasksResponse, error) {
	if err := service.ready(); err != nil {
		return dto.ListNodeTasksResponse{}, err
	}

	tasks, err := service.tasks.ListTasksByWorkflow(ctx, workflowID)
	if err != nil {
		return dto.ListNodeTasksResponse{}, fmt.Errorf("listing node tasks: %w", err)
	}

	dtos := make([]dto.NodeTaskDTO, len(tasks))
	for i, task := range tasks {
		dtos[i] = service.toNodeTaskDTO(task)
	}

	return dto.ListNodeTasksResponse{Tasks: dtos}, nil
}

// UpdateNodeTaskStatus updates a node task's execution status.
func (service *ExecutionService) UpdateNodeTaskStatus(ctx context.Context, taskID string, req dto.UpdateNodeTaskStatusRequest) (dto.NodeTaskDTO, error) {
	if err := service.ready(); err != nil {
		return dto.NodeTaskDTO{}, err
	}

	task, err := service.tasks.GetTaskByNode(ctx, "", taskID)
	if err != nil {
		return dto.NodeTaskDTO{}, fmt.Errorf("getting task: %w", err)
	}

	if err := service.tasks.UpdateTaskStatus(ctx, taskID, req.Status, req.Progress, req.ErrorMsg); err != nil {
		return dto.NodeTaskDTO{}, fmt.Errorf("updating task status: %w", err)
	}

	// Reload task
	updated, err := service.tasks.GetTaskByNode(ctx, task.WorkflowID, task.NodeID)
	if err != nil {
		return dto.NodeTaskDTO{}, fmt.Errorf("reloading task: %w", err)
	}

	return service.toNodeTaskDTO(updated), nil
}

// --- DTOs ---

func (service *ExecutionService) toOutputBindingDTO(binding domain.WorkflowOutputBinding) dto.OutputBindingDTO {
	return dto.OutputBindingDTO{
		ID:          binding.ID,
		WorkflowID:  binding.WorkflowID,
		NodeID:      binding.NodeID,
		SegmentName: binding.SegmentName,
		DisplayName: binding.DisplayName,
		SortOrder:   binding.SortOrder,
		IsMain:      binding.IsMain,
		CreatedAt:   binding.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   binding.UpdatedAt.Format(time.RFC3339),
	}
}

func (service *ExecutionService) toWorkflowAssetDTO(asset domain.WorkflowAsset) dto.WorkflowAssetDTO {
	return dto.WorkflowAssetDTO{
		ID:         asset.ID,
		WorkflowID: asset.WorkflowID,
		NodeID:     asset.NodeID,
		AssetPath:  asset.AssetPath,
		AssetType:  asset.AssetType,
		SizeBytes:  asset.SizeBytes,
		CreatedAt:  asset.CreatedAt.Format(time.RFC3339),
	}
}

func (service *ExecutionService) toNodeTaskDTO(task domain.WorkflowNodeTask) dto.NodeTaskDTO {
	dto := dto.NodeTaskDTO{
		ID:         task.ID,
		WorkflowID: task.WorkflowID,
		NodeID:     task.NodeID,
		Status:     task.Status,
		Progress:   task.Progress,
		ErrorMsg:   task.ErrorMsg,
		CreatedAt:  task.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  task.UpdatedAt.Format(time.RFC3339),
	}

	if task.StartedAt != nil {
		started := task.StartedAt.Format(time.RFC3339)
		dto.StartedAt = &started
	}

	if task.FinishedAt != nil {
		finished := task.FinishedAt.Format(time.RFC3339)
		dto.FinishedAt = &finished
	}

	return dto
}

// ExecuteWorkflow starts full workflow execution.
func (service *ExecutionService) ExecuteWorkflow(ctx context.Context, workflowID string) error {
	if err := service.ready(); err != nil {
		return err
	}
	if service.runner == nil {
		return ErrExecutionUnavailable
	}

	// Get the workflow
	workflow, err := service.workflows.GetByID(ctx, workflowID)
	if err != nil {
		if errors.Is(err, repository.ErrRecordNotFound) {
			return ErrWorkflowNotFound
		}
		return fmt.Errorf("getting workflow: %w", err)
	}

	// Parse workflow
	parsed, err := domain.ParseWorkflow(*workflow)
	if err != nil {
		return fmt.Errorf("parsing workflow: %w", err)
	}

	// Create tasks for all nodes
	for _, node := range parsed.Nodes {
		task := domain.WorkflowNodeTask{
			ID:         service.newID(),
			WorkflowID: workflowID,
			NodeID:     node.ID,
			Status:     domain.WorkflowNodeTaskStatusPending,
			Progress:   0.0,
			CreatedAt:  service.now(),
			UpdatedAt:  service.now(),
		}
		if _, err := service.tasks.CreateTask(ctx, task); err != nil {
			// Ignore duplicate errors (task might already exist)
			if !strings.Contains(err.Error(), "duplicate") {
				return fmt.Errorf("creating task for node %s: %w", node.ID, err)
			}
		}
	}

	// Run workflow (blocking for now, could be async in future)
	if err := service.runner.RunWorkflow(ctx, parsed); err != nil {
		return fmt.Errorf("running workflow: %w", err)
	}

	return nil
}
