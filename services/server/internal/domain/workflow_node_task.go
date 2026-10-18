package domain

import "time"

// WorkflowNodeTask tracks the execution state of a single workflow node.
type WorkflowNodeTask struct {
	ID         string
	WorkflowID string
	NodeID     string
	Status     string
	Progress   float64
	ErrorMsg   string
	StartedAt  *time.Time
	FinishedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Workflow node task statuses.
const (
	WorkflowNodeTaskStatusPending   = "pending"
	WorkflowNodeTaskStatusRunning   = "running"
	WorkflowNodeTaskStatusCompleted = "completed"
	WorkflowNodeTaskStatusFailed    = "failed"
	WorkflowNodeTaskStatusCancelled = "cancelled"
)

// WorkflowNodeTaskModel is the GORM model backing the workflow_node_tasks table.
type WorkflowNodeTaskModel struct {
	ID         string     `gorm:"column:id;primaryKey"`
	WorkflowID string     `gorm:"column:workflow_id;not null;index:workflow_node_tasks_workflow_idx"`
	NodeID     string     `gorm:"column:node_id;not null;uniqueIndex:workflow_node_tasks_workflow_node_idx"`
	Status     string     `gorm:"column:status;not null;default:'pending'"`
	Progress   float64    `gorm:"column:progress;not null;default:0"`
	ErrorMsg   string     `gorm:"column:error_msg;not null;default:''"`
	StartedAt  *time.Time `gorm:"column:started_at"`
	FinishedAt *time.Time `gorm:"column:finished_at"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null;autoCreateTime:nano"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null;autoUpdateTime:nano"`

	Workflow WorkflowModel `gorm:"foreignKey:WorkflowID;references:ID;constraint:OnDelete:CASCADE"`
}

// TableName returns the backing table name.
func (WorkflowNodeTaskModel) TableName() string {
	return "workflow_node_tasks"
}
