package workflow

import (
	"context"
	"fmt"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
)

// ListTemplates returns the global workflow template library.
func (service *Service) ListTemplates(ctx context.Context, category string) (dto.WorkflowTemplateListResponse, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowTemplateListResponse{}, err
	}

	category = strings.ToLower(strings.TrimSpace(category))
	switch category {
	case "", domain.WorkflowTemplateCategoryBuiltin, domain.WorkflowTemplateCategoryCustom:
	default:
		return dto.WorkflowTemplateListResponse{}, validationError("category 必须为 builtin 或 custom")
	}

	templates, err := service.templates.List(ctx, category)
	if err != nil {
		return dto.WorkflowTemplateListResponse{}, fmt.Errorf("listing workflow templates: %w", err)
	}

	summaries := make([]dto.WorkflowTemplateSummary, 0, len(templates))
	for _, template := range templates {
		summaries = append(summaries, workflowTemplateSummaryFromDomain(*template))
	}
	return dto.WorkflowTemplateListResponse{Templates: summaries}, nil
}

func workflowTemplateSummaryFromDomain(template domain.WorkflowTemplate) dto.WorkflowTemplateSummary {
	return dto.WorkflowTemplateSummary{
		ID:           template.ID,
		Name:         template.Name,
		Description:  template.Description,
		Category:     template.Category,
		ThumbnailURL: template.ThumbnailURL,
		UsageCount:   template.UsageCount,
		UpdatedAt:    domain.StringFromTime(template.UpdatedAt),
	}
}
