package settings

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
)

const customProviderPrefix = "generation.custom-provider."

// ErrCustomProviderNotFound is returned for deleted or unknown custom connections.
var ErrCustomProviderNotFound = errors.New("自定义供应商不存在")

type customProviderStore interface {
	ListAppSettingsByPrefix(context.Context, string) ([]string, error)
	CompareAndSwapAppSettingWithKey(context.Context, string, *string, *string, string, *string) error
}

// CustomProviderTest records one model operation against one exact configuration revision.
type CustomProviderTest struct {
	ModelID   string    `json:"modelId"`
	Protocol  string    `json:"protocol"`
	Operation string    `json:"operation"`
	Passed    bool      `json:"passed"`
	Message   string    `json:"message"`
	TestedAt  time.Time `json:"testedAt"`
}

// CustomProvider contains the portable definition and local, credential-free status.
type CustomProvider struct {
	Definition custom.Definition    `json:"definition"`
	Revision   string               `json:"revision"`
	Configured bool                 `json:"configured"`
	Masked     string               `json:"masked,omitempty"`
	Tests      []CustomProviderTest `json:"tests"`
}

// CustomProviderMutation saves a definition and optionally replaces its credential.
type CustomProviderMutation struct {
	Definition custom.Definition `json:"definition"`
	Revision   string            `json:"revision"`
	APIKey     *string           `json:"apiKey,omitempty"`
}

func newCustomRevision() (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(value[:]), nil
}

// ListCustomProviders returns definitions without exposing credentials.
func (service *Settings) ListCustomProviders(ctx context.Context) ([]CustomProvider, error) {
	result := []CustomProvider{}
	store, ok := service.appSettings.(customProviderStore)
	if !ok {
		return result, nil
	}
	values, err := store.ListAppSettingsByPrefix(ctx, customProviderPrefix)
	if err != nil {
		return nil, err
	}
	for _, value := range values {
		var item CustomProvider
		if err := json.Unmarshal([]byte(value), &item); err != nil {
			return nil, fmt.Errorf("reading custom provider: %w", err)
		}
		key, _, err := service.apiKeys.Get(custom.KeyName(item.Definition.ID))
		if err != nil {
			return nil, err
		}
		item.Configured = strings.TrimSpace(key) != ""
		if item.Configured {
			item.Masked = "••••••••"
		}
		if item.Tests == nil {
			item.Tests = []CustomProviderTest{}
		}
		result = append(result, item)
	}
	return result, nil
}

func (service *Settings) customProviderRecord(id string) (CustomProvider, string, error) {
	if service.appSettings == nil {
		return CustomProvider{}, "", ErrAppSettingStoreMissing
	}
	raw, found, err := service.appSettings.GetAppSetting(customProviderPrefix + id)
	if err != nil {
		return CustomProvider{}, "", err
	}
	if !found {
		return CustomProvider{}, "", ErrCustomProviderNotFound
	}
	var item CustomProvider
	if err := json.Unmarshal([]byte(raw), &item); err != nil {
		return item, "", err
	}
	return item, raw, nil
}

// SaveCustomProvider atomically creates or revises a definition and credential.
func (service *Settings) SaveCustomProvider(ctx context.Context, id string, input CustomProviderMutation) (CustomProvider, error) {
	if err := input.Definition.Validate(); err != nil {
		return CustomProvider{}, err
	}
	store, ok := service.appSettings.(customProviderStore)
	if !ok {
		return CustomProvider{}, ErrAppSettingStoreMissing
	}
	if input.APIKey != nil {
		key := strings.TrimSpace(*input.APIKey)
		if strings.ContainsAny(key, "\r\n") {
			return CustomProvider{}, fmt.Errorf("%w: API Key 格式无效", custom.ErrInvalid)
		}
		input.APIKey = &key
	}
	var previous *string
	if id != "" {
		if id != input.Definition.ID {
			return CustomProvider{}, fmt.Errorf("%w: 创建后不能更改供应商 ID", custom.ErrInvalid)
		}
		current, raw, err := service.customProviderRecord(id)
		if err != nil {
			return CustomProvider{}, err
		}
		if input.Revision == "" || current.Revision != input.Revision {
			return CustomProvider{}, domain.ErrSettingsRevisionConflict
		}
		previous = &raw
	}
	revision, err := newCustomRevision()
	if err != nil {
		return CustomProvider{}, err
	}
	item := CustomProvider{Definition: input.Definition, Revision: revision, Tests: []CustomProviderTest{}}
	encoded, err := json.Marshal(item)
	if err != nil {
		return item, err
	}
	next := string(encoded)
	if err := store.CompareAndSwapAppSettingWithKey(ctx, customProviderPrefix+input.Definition.ID, previous, &next, custom.KeyName(input.Definition.ID), input.APIKey); err != nil {
		return CustomProvider{}, err
	}
	key, _, err := service.apiKeys.Get(custom.KeyName(input.Definition.ID))
	if err != nil {
		return CustomProvider{}, err
	}
	item.Configured = strings.TrimSpace(key) != ""
	if item.Configured {
		item.Masked = "••••••••"
	}
	return item, nil
}

// DeleteCustomProvider deletes its definition and credential with revision checking.
func (service *Settings) DeleteCustomProvider(ctx context.Context, id, revision string) error {
	item, raw, err := service.customProviderRecord(id)
	if err != nil {
		return err
	}
	if revision == "" || item.Revision != revision {
		return domain.ErrSettingsRevisionConflict
	}
	store, ok := service.appSettings.(customProviderStore)
	if !ok {
		return ErrAppSettingStoreMissing
	}
	return store.CompareAndSwapAppSettingWithKey(ctx, customProviderPrefix+id, &raw, nil, custom.KeyName(id), nil)
}

// SetCustomProviderKey changes credentials and invalidates previous verification.
func (service *Settings) SetCustomProviderKey(ctx context.Context, id, revision, key string) (CustomProvider, error) {
	item, _, err := service.customProviderRecord(id)
	if err != nil {
		return CustomProvider{}, err
	}
	return service.SaveCustomProvider(ctx, id, CustomProviderMutation{Definition: item.Definition, Revision: revision, APIKey: &key})
}

// ResolveCustomRoute returns a definition/model/key snapshot for an enabled route.
func (service *Settings) ResolveCustomRoute(ctx context.Context, routeID string) (custom.Definition, custom.Model, string, error) {
	items, err := service.ListCustomProviders(ctx)
	if err != nil {
		return custom.Definition{}, custom.Model{}, "", err
	}
	for _, item := range items {
		for _, model := range item.Definition.Models {
			if item.Definition.RouteID(model) != routeID {
				continue
			}
			if !item.Definition.Enabled {
				return custom.Definition{}, custom.Model{}, "", fmt.Errorf("供应商已停用")
			}
			key, _, err := service.apiKeys.Get(custom.KeyName(item.Definition.ID))
			if err != nil {
				return custom.Definition{}, custom.Model{}, "", err
			}
			// Verify a consistent snapshot if a concurrent writer changed the key or definition.
			latest, _, err := service.customProviderRecord(item.Definition.ID)
			if err != nil {
				return custom.Definition{}, custom.Model{}, "", err
			}
			if latest.Revision != item.Revision {
				return custom.Definition{}, custom.Model{}, "", domain.ErrSettingsRevisionConflict
			}
			if strings.TrimSpace(key) == "" {
				return custom.Definition{}, custom.Model{}, "", ErrAPIKeyRequired
			}
			return item.Definition, model, key, nil
		}
	}
	return custom.Definition{}, custom.Model{}, "", ErrCustomProviderNotFound
}
