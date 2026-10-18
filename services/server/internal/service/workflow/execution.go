package workflow

import (
	"context"
	"errors"

	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
)

// ErrExecutionUnavailable reports that durable workflow execution is not wired yet.
var ErrExecutionUnavailable = errors.New("工作流执行待接入：执行记录、调度和取消尚未实现")

// StartExecution refuses to fabricate an execution before persistence and scheduling exist.
func (s *ExecutionService) StartExecution(ctx context.Context, workflowID string, triggerNodeIDs []string) (dto.WorkflowExecutionRecord, error) {
	return dto.WorkflowExecutionRecord{}, ErrExecutionUnavailable
}

// GetExecution does not synthesize progress for an unrecorded execution.
func (s *ExecutionService) GetExecution(ctx context.Context, workflowID, executionID string) (dto.WorkflowExecutionRecord, error) {
	return dto.WorkflowExecutionRecord{}, ErrExecutionUnavailable
}

// CancelExecution reports that execution cancellation is not implemented.
func (s *ExecutionService) CancelExecution(ctx context.Context, workflowID, executionID string) error {
	return ErrExecutionUnavailable
}

// RetryExecution reports that durable retries are not implemented.
func (s *ExecutionService) RetryExecution(ctx context.Context, workflowID, executionID string, failedNodeIDs []string) (dto.WorkflowExecutionRecord, error) {
	return dto.WorkflowExecutionRecord{}, ErrExecutionUnavailable
}
