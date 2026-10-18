package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/platform/codexapp"
	"github.com/pelletier/go-toml/v2"
)

// SetCodexAccountHome isolates account operations from the desktop client's state.
// Call during startup, after SetCodexCLIPath.
func (service *Settings) SetCodexAccountHome(home string) {
	if service.codexAccount == nil {
		return
	}
	service.codexAccount.homePath = home
	service.codexAccount.newSession = func(ctx context.Context, bin string) (codexapp.Client, error) {
		if err := os.MkdirAll(home, 0o700); err != nil {
			return nil, err
		}
		return codexapp.StartWithHome(ctx, bin, home)
	}
}

// ImportLocalCodex imports credentials into managed settings without changing the source home.
func (service *Settings) ImportLocalCodex(ctx context.Context) (CodexRelaySettingsResponse, error) {
	return service.importLocalCodex(ctx, effectiveCodexHome())
}

func (service *Settings) importLocalCodex(ctx context.Context, source string) (CodexRelaySettingsResponse, error) {
	var config struct {
		Model     string `toml:"model"`
		Provider  string `toml:"model_provider"`
		Providers map[string]struct {
			BaseURL string `toml:"base_url"`
			WireAPI string `toml:"wire_api"`
			EnvKey  string `toml:"env_key"`
			Bearer  string `toml:"experimental_bearer_token"`
		} `toml:"model_providers"`
	}
	raw, err := os.ReadFile(filepath.Join(source, "config.toml"))
	if err != nil && !os.IsNotExist(err) {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 无法读取本地 Codex 配置", ErrCodexRelayInvalid)
	}
	if len(raw) > 0 && toml.Unmarshal(raw, &config) != nil {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地 Codex 配置格式错误", ErrCodexRelayInvalid)
	}
	auth, err := os.ReadFile(filepath.Join(source, "auth.json"))
	if err != nil && !os.IsNotExist(err) {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 无法读取本地 Codex 登录凭据", ErrCodexRelayInvalid)
	}
	var credential struct {
		APIKey string `json:"OPENAI_API_KEY"`
		Tokens struct {
			Access string `json:"access_token"`
		} `json:"tokens"`
	}
	if len(auth) > 0 && json.Unmarshal(auth, &credential) != nil {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地 Codex 凭据格式错误", ErrCodexRelayInvalid)
	}
	if config.Provider == "" || config.Provider == "openai" {
		if credential.Tokens.Access == "" {
			return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地没有 ChatGPT 登录凭据，请使用 ChatGPT 登录", ErrCodexRelayInvalid)
		}
		if service.codexAccount == nil || service.codexAccount.homePath == "" {
			return CodexRelaySettingsResponse{}, ErrCodexAccountUnavailable
		}
		home := service.codexAccount.homePath
		if err := os.MkdirAll(home, 0o700); err != nil {
			return CodexRelaySettingsResponse{}, err
		}
		if err := os.WriteFile(filepath.Join(home, "auth.json"), auth, 0o600); err != nil {
			return CodexRelaySettingsResponse{}, err
		}
		return service.SetCodexRelayChannel(ctx, CodexRelayChannelMutation{Type: "official"})
	}
	provider, ok := config.Providers[config.Provider]
	if !ok || provider.WireAPI != "responses" || provider.BaseURL == "" {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地中转必须配置 Responses API 和 Base URL", ErrCodexRelayInvalid)
	}
	key := strings.TrimSpace(provider.Bearer)
	if key == "" && provider.EnvKey != "" {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地中转使用环境变量凭据，请在中转配置中手动填写 API Key", ErrCodexRelayInvalid)
	}
	if key == "" {
		key = strings.TrimSpace(credential.APIKey)
	}
	if key == "" {
		return CodexRelaySettingsResponse{}, fmt.Errorf("%w: 本地中转没有可读取的 API Key，请手动添加中转", ErrCodexRelayInvalid)
	}
	stored, err := service.loadCodexRelayStoredSettings()
	if err != nil {
		return CodexRelaySettingsResponse{}, err
	}
	profile := CodexRelayProfileMutation{ID: "local-codex", Name: "本地 Codex · " + config.Provider, BaseURL: provider.BaseURL, Model: config.Model, Protocol: CodexRelayProtocolResponses, Enabled: true}
	found := false
	for i := range stored.Profiles {
		if stored.Profiles[i].ID == profile.ID {
			stored.Profiles[i] = profile
			found = true
		}
	}
	if !found {
		stored.Profiles = append(stored.Profiles, profile)
	}
	if _, err := service.SaveCodexRelaySettings(ctx, CodexRelaySettingsMutation{Enabled: stored.Enabled, ActiveProfileID: stored.ActiveProfileID, Profiles: stored.Profiles}); err != nil {
		return CodexRelaySettingsResponse{}, err
	}
	if _, err := service.SetCodexRelayProfileAPIKey(ctx, profile.ID, key); err != nil {
		return CodexRelaySettingsResponse{}, err
	}
	return service.SetCodexRelayChannel(ctx, CodexRelayChannelMutation{Type: "relay", ProfileID: profile.ID})
}
