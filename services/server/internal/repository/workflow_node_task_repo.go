package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
)

// WorkflowNodeTaskRepository manages workflow node execution tasks.
type WorkflowNodeTaskRepository struct {
	db *gorm.DB
}

// NewWorkflowNodeTaskRepository returns a workflow node task repository.
func NewWorkflowNodeTaskRepository(db *gorm.DB) *WorkflowNodeTaskRepository {
	return &WorkflowNodeTaskRepository{db: db}
}

// CreateTask creates a new workflow node task.
func (repo WorkflowNodeTaskRepository) CreateTask(ctx context.Context, task domain.WorkflowNodeTask) (domain.WorkflowNodeTask, error) {
	if task.ID == "" {
		task.ID = uuid.NewString()
	}
	if task.Status == "" {
		task.Status = domain.WorkflowNodeTaskStatusPending
	}
	model := repo.toModel(task)
	if err := repo.db.WithContext(ctx).Create(&model).Error; err != nil {
		return domain.WorkflowNodeTask{}, fmt.Errorf("creating workflow node task: %w", err)
	}
	return repo.toDomain(model), nil
}

// GetTaskByNode retrieves the task for a specific node.
func (repo WorkflowNodeTaskRepository) GetTaskByNode(ctx context.Context, workflowID string, nodeID string) (domain.WorkflowNodeTask, error) {
	var model domain.WorkflowNodeTaskModel
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ? AND node_id = ?", workflowID, nodeID).
		First(&model).Error
	if err != nil {
		if IsRecordNotFound(err) {
			return domain.WorkflowNodeTask{}, ErrRecordNotFound
		}
		return domain.WorkflowNodeTask{}, fmt.Errorf("getting workflow node task: %w", err)
	}
	return repo.toDomain(model), nil
}

// ListTasksByWorkflow returns all tasks for a workflow.
func (repo WorkflowNodeTaskRepository) ListTasksByWorkflow(ctx context.Context, workflowID string) ([]domain.WorkflowNodeTask, error) {
	var models []domain.WorkflowNodeTaskModel
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Order("created_at DESC").
		Find(&models).Error
	if err != nil {
		return nil, fmt.Errorf("listing workflow node tasks: %w", err)
	}
	tasks := make([]domain.WorkflowNodeTask, len(models))
	for i, model := range models {
		tasks[i] = repo.toDomain(model)
	}
	return tasks, nil
}

// UpdateTask updates an existing task.
func (repo WorkflowNodeTaskRepository) UpdateTask(ctx context.Context, task domain.WorkflowNodeTask) error {
	model := repo.toModel(task)
	result := repo.db.WithContext(ctx).
		Model(&domain.WorkflowNodeTaskModel{}).
		Where("id = ?", task.ID).
		Updates(model)
	if result.Error != nil {
		return fmt.Errorf("updating workflow node task: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// UpdateTaskStatus updates the task status and related timing fields.
func (repo WorkflowNodeTaskRepository) UpdateTaskStatus(ctx context.Context, taskID string, status string, progress float64, errorMsg string) error {
	updates := map[string]interface{}{
		"status":   status,
		"progress": progress,
	}
	if errorMsg != "" {
		updates["error_msg"] = errorMsg
	}
	result := repo.db.WithContext(ctx).
		Model(&domain.WorkflowNodeTaskModel{}).
		Where("id = ?", taskID).
		Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("updating workflow node task status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// DeleteTask deletes a task by ID.
func (repo WorkflowNodeTaskRepository) DeleteTask(ctx context.Context, id string) error {
	result := repo.db.WithContext(ctx).Delete(&domain.WorkflowNodeTaskModel{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("deleting workflow node task: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// DeleteTasksByWorkflow deletes all tasks for a workflow.
func (repo WorkflowNodeTaskRepository) DeleteTasksByWorkflow(ctx context.Context, workflowID string) error {
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Delete(&domain.WorkflowNodeTaskModel{}).Error
	if err != nil {
		return fmt.Errorf("deleting workflow node tasks: %w", err)
	}
	return nil
}

func (repo WorkflowNodeTaskRepository) toDomain(model domain.WorkflowNodeTaskModel) domain.WorkflowNodeTask {
	return domain.WorkflowNodeTask{
		ID:         model.ID,
		WorkflowID: model.WorkflowID,
		NodeID:     model.NodeID,
		Status:     model.Status,
		Progress:   model.Progress,
		ErrorMsg:   model.ErrorMsg,
		StartedAt:  model.StartedAt,
		FinishedAt: model.FinishedAt,
		CreatedAt:  model.CreatedAt,
		UpdatedAt:  model.UpdatedAt,
	}
}

func (repo WorkflowNodeTaskRepository) toModel(task domain.WorkflowNodeTask) domain.WorkflowNodeTaskModel {
	return domain.WorkflowNodeTaskModel{
		ID:         task.ID,
		WorkflowID: task.WorkflowID,
		NodeID:     task.NodeID,
		Status:     task.Status,
		Progress:   task.Progress,
		ErrorMsg:   task.ErrorMsg,
		StartedAt:  task.StartedAt,
		FinishedAt: task.FinishedAt,
		CreatedAt:  task.CreatedAt,
		UpdatedAt:  task.UpdatedAt,
	}
}
