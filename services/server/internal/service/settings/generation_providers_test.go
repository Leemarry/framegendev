package settings

import (
	"context"
	"errors"
	"testing"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
)

func TestListGenerationProvidersIncludesKindsAndCredentialStatus(t *testing.T) {
	service := NewSettingsWithStores(
		&memoryAPIKeyStore{values: map[string]string{generation.ProviderOpenAI: "sk-openai"}},
		nil,
		&memoryAppSettingStore{values: map[string]string{}},
	)
	service.SetGenerationCLIs([]string{"jimeng", "libtv", "xiaoyunque"})

	response, err := service.ListGenerationProviders(context.Background())
	if err != nil {
		t.Fatalf("ListGenerationProviders returned error: %v", err)
	}
	providers := make(map[string]GenerationProvider, len(response.Providers))
	for _, provider := range response.Providers {
		providers[provider.ID] = provider
	}

	for _, test := range []struct {
		id     string
		kind   string
		status string
	}{
		{id: generation.ProviderOpenAI, kind: "official", status: "configured"},
		{id: generation.ProviderJimeng, kind: "cli", status: "loggedOut"},
		{id: generation.ProviderMediago, kind: "aggregator", status: "unconfigured"},
	} {
		provider, ok := providers[test.id]
		if !ok {
			t.Fatalf("provider %q missing from %#v", test.id, response.Providers)
		}
		if provider.Kind != test.kind || provider.Status != test.status {
			t.Fatalf("provider %q = kind=%q status=%q, want %q/%q", test.id, provider.Kind, provider.Status, test.kind, test.status)
		}
	}
}

func TestSaveGenerationProviderSettingsPersistsNonSecretValues(t *testing.T) {
	service := NewSettingsWithStores(
		&memoryAPIKeyStore{values: map[string]string{}},
		nil,
		&memoryAppSettingStore{values: map[string]string{}},
	)

	response, err := service.SaveGenerationProviderSettings(context.Background(), generation.ProviderOpenAI, GenerationProviderSettingsMutation{
		Revision: "v1",
		Values:   map[string]string{"baseURL": "https://example.test/v1"},
	})
	if err != nil {
		t.Fatalf("SaveGenerationProviderSettings returned error: %v", err)
	}
	for _, provider := range response.Providers {
		if provider.ID == generation.ProviderOpenAI {
			if provider.Settings["baseURL"] != "https://example.test/v1" {
				t.Fatalf("openai settings = %#v", provider.Settings)
			}
			if provider.Masked != "" {
				t.Fatalf("settings response unexpectedly exposed API key: %q", provider.Masked)
			}
			return
		}
	}
	t.Fatal("openai provider missing from settings response")
}

func TestSaveGenerationProviderSettingsRejectsUnknownProvider(t *testing.T) {
	service := NewSettingsWithStores(
		&memoryAPIKeyStore{values: map[string]string{}},
		nil,
		&memoryAppSettingStore{values: map[string]string{}},
	)
	_, err := service.SaveGenerationProviderSettings(context.Background(), "missing", GenerationProviderSettingsMutation{})
	if !errors.Is(err, ErrAPIKeyProviderNotFound) {
		t.Fatalf("unknown provider error = %v, want ErrAPIKeyProviderNotFound", err)
	}
}
