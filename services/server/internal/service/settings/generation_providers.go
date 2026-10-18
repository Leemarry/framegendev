package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/clitool"
)

const generationProviderSettingsKeyPrefix = "generation.provider.settings."

// GenerationProvider describes one provider as shown by the model access page.
type GenerationProvider struct {
	APIKeyProvider
	Kind     string            `json:"kind"`
	Status   string            `json:"status"`
	Settings map[string]string `json:"settings,omitempty"`
	Runtime  *CLIRuntime       `json:"runtime,omitempty"`
}

// CLIRuntime reports installation independently of credentials or membership.
type CLIRuntime struct {
	clitool.Runtime
	Available bool   `json:"available"`
	Message   string `json:"message,omitempty"`
}

func (service *Settings) cliRuntime(providerID string) *CLIRuntime {
	var path, dir, tool, binary string
	switch providerID {
	case generation.ProviderJimeng:
		path, dir, tool, binary = service.jimengBinPath, service.jimengBinDir, "dreamina", "dreamina"
	case generation.ProviderLibTV:
		path, dir, tool, binary = service.libTVBinPath, service.libTVBinDir, "libtv", "libtv"
	case generation.ProviderXiaoyunque:
		path, dir, tool, binary = service.pippitBinPath, service.pippitBinDir, "pippit", "pippit-tool-cli"
	default:
		return nil
	}
	selected, err := clitool.Resolve(path, dir, tool, binary)
	if err != nil {
		return &CLIRuntime{Message: "CLI 未安装或工具包不可用，请检查工具包和路径配置。"}
	}
	if err := checkCLICredentialPermissions(); err != nil {
		return &CLIRuntime{Runtime: selected, Message: err.Error()}
	}
	return &CLIRuntime{Runtime: selected, Available: true}
}

// GenerationProvidersResponse combines provider credentials and platform metadata.
type GenerationProvidersResponse struct {
	Providers []GenerationProvider `json:"providers"`
	Platforms []ModelPlatform      `json:"platforms"`
}

// GenerationProviderSettingsMutation updates non-sensitive provider settings.
type GenerationProviderSettingsMutation struct {
	Revision string            `json:"revision,omitempty"`
	Values   map[string]string `json:"values"`
}

// ListGenerationProviders returns the provider catalog used by the model access page.
func (service *Settings) ListGenerationProviders(ctx context.Context) (GenerationProvidersResponse, error) {
	keys, err := service.ListAPIKeys(ctx)
	if err != nil {
		return GenerationProvidersResponse{}, err
	}
	platforms := service.ListModelPlatforms(ctx).Platforms

	kinds := make(map[string]string, len(platforms))
	for _, platform := range platforms {
		kind := platform.Kind
		if kind == "unified" {
			kind = "aggregator"
		}
		kinds[platform.APIKeyProviderID] = kind
	}
	for _, provider := range keys.Providers {
		if _, ok := kinds[provider.ID]; ok {
			continue
		}
		kinds[provider.ID] = generationProviderKind(provider.ID)
	}

	providers := make([]GenerationProvider, 0, len(keys.Providers))
	for _, provider := range keys.Providers {
		settings, err := service.loadGenerationProviderSettings(provider.ID)
		if err != nil {
			return GenerationProvidersResponse{}, err
		}
		providers = append(providers, GenerationProvider{
			APIKeyProvider: provider,
			Kind:           kinds[provider.ID],
			Status:         generationProviderStatus(provider, settings),
			Settings:       settings,
			Runtime:        service.cliRuntime(provider.ID),
		})
	}
	customProviders, err := service.ListCustomProviders(ctx)
	if err != nil {
		return GenerationProvidersResponse{}, err
	}
	for _, item := range customProviders {
		status := "unconfigured"
		if item.Configured {
			status = "configured"
		}
		if !item.Definition.Enabled {
			status = "disabled"
		}
		providers = append(providers, GenerationProvider{APIKeyProvider: APIKeyProvider{ID: item.Definition.ProviderID(), Label: item.Definition.Name, Description: item.Definition.BaseURL, Configured: item.Configured, CredentialKind: "apiKey", Masked: item.Masked}, Kind: "custom", Status: status})
	}
	return GenerationProvidersResponse{Providers: providers, Platforms: platforms}, nil
}

// SaveGenerationProviderSettings stores non-sensitive settings for one provider.
func (service *Settings) SaveGenerationProviderSettings(
	ctx context.Context,
	providerID string,
	input GenerationProviderSettingsMutation,
) (GenerationProvidersResponse, error) {
	providerID = strings.TrimSpace(providerID)
	if providerID == "" {
		return GenerationProvidersResponse{}, fmt.Errorf("%w: provider id is required", ErrAPIKeyProviderNotFound)
	}
	if _, ok := service.findAPIKeyProvider(providerID); !ok {
		return GenerationProvidersResponse{}, ErrAPIKeyProviderNotFound
	}
	if service.appSettings == nil {
		return GenerationProvidersResponse{}, ErrAppSettingStoreMissing
	}
	values := map[string]string{}
	for key, value := range input.Values {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		values[key] = value
	}
	raw, err := json.Marshal(values)
	if err != nil {
		return GenerationProvidersResponse{}, fmt.Errorf("encoding provider settings: %w", err)
	}
	if err := service.appSettings.SetAppSetting(generationProviderSettingsKeyPrefix+providerID, string(raw)); err != nil {
		return GenerationProvidersResponse{}, err
	}
	return service.ListGenerationProviders(ctx)
}

func (service *Settings) loadGenerationProviderSettings(providerID string) (map[string]string, error) {
	if service.appSettings == nil {
		return map[string]string{}, nil
	}
	raw, ok, err := service.appSettings.GetAppSetting(generationProviderSettingsKeyPrefix + providerID)
	if err != nil {
		return nil, err
	}
	if !ok || strings.TrimSpace(raw) == "" {
		return map[string]string{}, nil
	}
	values := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &values); err != nil {
		return nil, fmt.Errorf("decoding provider settings: %w", err)
	}
	return values, nil
}

func generationProviderStatus(provider APIKeyProvider, settings map[string]string) string {
	if provider.Status != "" {
		return provider.Status
	}
	if provider.Source == "managed" {
		return "managed"
	}
	if provider.Configured {
		if provider.CredentialKind == "oauth" {
			return "loggedIn"
		}
		return "configured"
	}
	if provider.CredentialKind == "oauth" {
		return "loggedOut"
	}
	if len(settings) > 0 {
		return "partial"
	}
	return "unconfigured"
}

func generationProviderKind(providerID string) string {
	switch providerID {
	case "jimeng", "libtv", "xiaoyunque":
		return "cli"
	case "mediago", "openrouter", "dmx":
		return "aggregator"
	default:
		return "official"
	}
}
