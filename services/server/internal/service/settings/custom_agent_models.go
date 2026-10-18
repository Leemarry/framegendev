package settings

import (
	"context"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
)

func customAgentNPM(protocol string) string {
	switch protocol {
	case custom.Responses:
		return "@ai-sdk/openai"
	case custom.Anthropic:
		return "@ai-sdk/anthropic"
	default:
		return "@ai-sdk/openai-compatible"
	}
}

func (service *Settings) appendCustomAgentProfiles(ctx context.Context, profiles []domainAgentModelProfile, env map[string]string) ([]domainAgentModelProfile, map[string]string, error) {
	items, err := service.ListCustomProviders(ctx)
	if err != nil {
		return nil, nil, err
	}
	for _, item := range items {
		if !item.Definition.Enabled || !item.Configured {
			continue
		}
		for _, model := range item.Definition.Models {
			if model.Kind != generation.KindText {
				continue
			}
			d, m, key, err := service.ResolveCustomRoute(ctx, item.Definition.RouteID(model))
			if err != nil {
				return nil, nil, err
			}
			profile := domainAgentModelProfile{ID: d.RouteID(m), Name: m.Name, ProviderID: d.ProviderID() + "-" + m.Protocol, ProviderLabel: d.Name, BaseURL: d.BaseURL, Model: m.ID, ModelDisplayName: m.Name, Enabled: true, SupportsImages: m.Vision, SupportsTools: m.Tools, ContextWindow: m.ContextWindow, MaxOutputTokens: m.MaxOutputTokens, Protocol: m.Protocol}
			profiles = append(profiles, profile)
			env[AgentModelProfileEnvName(profile.ID)] = key
		}
	}
	return profiles, env, nil
}
