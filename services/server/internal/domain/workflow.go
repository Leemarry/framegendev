package domain

import "time"

// Workflow is one workflow document owned by a project document shot.
type Workflow struct {
	ID            string
	ProjectID     string
	DocumentID    string
	ShotName      string
	Name          string
	Description   string
	SchemaVersion int
	GraphData     GraphData
	TemplateRef   *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// NodeCount returns the number of nodes in the workflow canvas.
func (workflow Workflow) NodeCount() int {
	return workflow.GraphData.NodeCount()
}

// WorkflowTemplate is a reusable canvas in the global template library.
type WorkflowTemplate struct {
	ID           string
	Name         string
	Description  string
	Category     string
	ThumbnailURL *string
	GraphData    GraphData
	UsageCount   int
	CreatedBy    *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// Workflow template categories.
const (
	WorkflowTemplateCategoryBuiltin = "builtin"
	WorkflowTemplateCategoryCustom  = "custom"
)

// WorkflowModel is the GORM model backing the workflows table.
type WorkflowModel struct {
	ID            string    `gorm:"column:id;primaryKey"`
	ProjectID     string    `gorm:"column:project_id;not null;index:workflows_project_shot_idx,priority:1"`
	DocumentID    string    `gorm:"column:document_id;not null;index:workflows_document_idx"`
	ShotName      string    `gorm:"column:shot_name;not null;index:workflows_project_shot_idx,priority:2"`
	Name          string    `gorm:"column:name;not null"`
	Description   string    `gorm:"column:description;not null;default:''"`
	SchemaVersion int       `gorm:"column:schema_version;not null;default:4"`
	GraphDataJSON string    `gorm:"column:graph_data;not null;type:text"`
	TemplateRef   *string   `gorm:"column:template_ref;index:workflows_template_ref_idx"`
	CreatedAt     time.Time `gorm:"column:created_at;not null;autoCreateTime:nano"`
	UpdatedAt     time.Time `gorm:"column:updated_at;not null;autoUpdateTime:nano;index:workflows_project_shot_idx,priority:3,sort:desc"`

	Project WorkspaceProjectModel `gorm:"foreignKey:ProjectID;references:ID;constraint:OnDelete:CASCADE"`
}

// TableName returns the backing table name.
func (WorkflowModel) TableName() string {
	return "workflows"
}

// WorkflowTemplateModel is the GORM model backing the workflow_templates table.
type WorkflowTemplateModel struct {
	ID            string    `gorm:"column:id;primaryKey"`
	Name          string    `gorm:"column:name;not null"`
	Description   string    `gorm:"column:description;not null;default:''"`
	Category      string    `gorm:"column:category;not null;default:'custom';index:workflow_templates_category_idx"`
	ThumbnailURL  *string   `gorm:"column:thumbnail_url"`
	GraphDataJSON string    `gorm:"column:graph_data;not null;type:text"`
	UsageCount    int       `gorm:"column:usage_count;not null;default:0"`
	CreatedBy     *string   `gorm:"column:created_by"`
	CreatedAt     time.Time `gorm:"column:created_at;not null;autoCreateTime:nano"`
	UpdatedAt     time.Time `gorm:"column:updated_at;not null;autoUpdateTime:nano"`
}

// TableName returns the backing table name.
func (WorkflowTemplateModel) TableName() string {
	return "workflow_templates"
}
