package generation

import (
	"context"
	"fmt"
	"strings"

	core "github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/runtime"
)

func (workflow *GenerationService) appendCustomCatalog(catalog *core.ModelCatalog) {
	if workflow.settings == nil {
		return
	}
	items, err := workflow.settings.ListCustomProviders(context.Background())
	if err != nil {
		return
	}
	for _, item := range items {
		d := item.Definition
		catalog.Providers = append(catalog.Providers, core.ProviderInfo{ID: d.ProviderID(), Label: d.Name, ProviderType: core.ProviderTypeAggregator})
		for _, model := range d.Models {
			route := d.Route(model)
			route.Configured = d.Enabled && item.Configured
			if !d.Enabled {
				route.Status = core.RouteStatusGated
				route.StatusReason = "供应商已停用"
			}
			catalog.Routes = append(catalog.Routes, route)
			catalog.Families = append(catalog.Families, core.ModelFamily{ID: route.FamilyID, Label: d.Name + " · " + model.Name, Kind: model.Kind})
			catalog.Versions = append(catalog.Versions, core.ModelVersion{ID: route.VersionID, FamilyID: route.FamilyID, Label: model.Name, Kind: model.Kind, CanonicalModel: model.ID, Capabilities: core.Capabilities{SupportsReferenceURLs: route.SupportsReferenceURLs}})
			catalog.Models = append(catalog.Models, core.ModelSpec{ID: route.ID, Label: model.Name, Kind: model.Kind, Provider: route.Provider, Model: model.ID, Adapter: model.Protocol, Params: route.Params, SupportsReferenceURLs: route.SupportsReferenceURLs})
		}
	}
}

func (workflow *GenerationService) resolveGenerationRoute(request GenerationMessageRequest) (core.ModelRoute, error) {
	id := request.RouteID
	if id == "" {
		id = request.ModelID
	}
	if !strings.HasPrefix(id, "custom-") {
		return ResolveGenerationRoute(request)
	}
	if workflow.settings == nil {
		return core.ModelRoute{}, fmt.Errorf("自定义供应商存储不可用")
	}
	d, m, key, err := workflow.settings.ResolveCustomRoute(context.Background(), id)
	if err != nil {
		return core.ModelRoute{}, err
	}
	route := d.Route(m)
	if request.Kind != "" && request.Kind != string(m.Kind) || request.Provider != "" && request.Provider != d.ProviderID() || request.Model != "" && request.Model != m.ID || request.FamilyID != "" && request.FamilyID != route.FamilyID || request.VersionID != "" && request.VersionID != route.VersionID {
		return core.ModelRoute{}, fmt.Errorf("请求与自定义模型配置不一致")
	}
	if m.Kind == core.KindText {
		route.RuntimeProvider, err = runtime.NewMultimodalTextProvider(&custom.TextProvider{Definition: d, Model: m, APIKey: key})
	} else {
		route.RuntimeProvider = &custom.ImageProvider{Definition: d, Model: m, APIKey: key}
	}
	route.Configured = true
	return route, err
}

func (workflow *GenerationService) findGenerationRoute(id string) (core.ModelRoute, bool) {
	if !strings.HasPrefix(id, "custom-") {
		return core.FindRoute(id)
	}
	route, err := workflow.resolveGenerationRoute(GenerationMessageRequest{RouteID: id})
	return route, err == nil
}

// TextRouteForAgentRuntimeModel resolves both built-in and dynamic OpenCode model selections.
func (workflow *GenerationService) TextRouteForAgentRuntimeModel(value string) (string, string, bool) {
	provider, model, ok := strings.Cut(strings.TrimSpace(value), "/")
	if !ok || !strings.HasPrefix(provider, "custom-") {
		return TextRouteForAgentRuntimeModel(value)
	}
	if workflow.settings == nil {
		return "", "", false
	}
	items, err := workflow.settings.ListCustomProviders(context.Background())
	if err != nil {
		return "", "", false
	}
	for _, item := range items {
		for _, candidate := range item.Definition.Models {
			if candidate.Kind == core.KindText && item.Definition.ProviderID()+"-"+candidate.Protocol == provider && candidate.ID == model {
				return item.Definition.RouteID(candidate), model, true
			}
		}
	}
	return "", "", false
}

func (workflow *GenerationService) validatePromptOptimization(request *GenerationPromptOptimizationRequest) error {
	if request == nil || !strings.HasPrefix(request.RouteID, "custom-") {
		return ValidateGenerationPromptOptimizationRequest(request)
	}
	copy := *request
	copy.RouteID = ""
	if err := ValidateGenerationPromptOptimizationRequest(&copy); err != nil {
		return err
	}
	route, err := workflow.resolveGenerationRoute(GenerationMessageRequest{RouteID: request.RouteID, Kind: "text"})
	if err != nil {
		return err
	}
	if route.Kind != core.KindText {
		return fmt.Errorf("提示词优化需要文本模型")
	}
	return nil
}
