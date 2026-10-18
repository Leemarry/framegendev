package domain

import "time"

// WorkflowOutputBinding marks a workflow node as a shot segment output.
// When a node is bound, its final video becomes a candidate for the shot's timeline.
type WorkflowOutputBinding struct {
	ID          string
	WorkflowID  string
	NodeID      string
	SegmentName string
	DisplayName string
	SortOrder   int
	IsMain      bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// WorkflowOutputBindingModel is the GORM model backing the workflow_output_bindings table.
type WorkflowOutputBindingModel struct {
	ID          string    `gorm:"column:id;primaryKey"`
	WorkflowID  string    `gorm:"column:workflow_id;not null;index:workflow_output_bindings_workflow_idx"`
	NodeID      string    `gorm:"column:node_id;not null;index:workflow_output_bindings_node_idx"`
	SegmentName string    `gorm:"column:segment_name;not null"`
	DisplayName string    `gorm:"column:display_name;not null"`
	SortOrder   int       `gorm:"column:sort_order;not null;default:0"`
	IsMain      bool      `gorm:"column:is_main;not null;default:false"`
	CreatedAt   time.Time `gorm:"column:created_at;not null;autoCreateTime:nano"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null;autoUpdateTime:nano"`

	Workflow WorkflowModel `gorm:"foreignKey:WorkflowID;references:ID;constraint:OnDelete:CASCADE"`
}

// TableName returns the backing table name.
func (WorkflowOutputBindingModel) TableName() string {
	return "workflow_output_bindings"
}
