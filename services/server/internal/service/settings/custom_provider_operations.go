package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/multimodal"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
)

// CustomModelDiscovery describes an unsaved or existing connection to inspect.
type CustomModelDiscovery struct {
	ProviderID string  `json:"providerId,omitempty"`
	Revision   string  `json:"revision,omitempty"`
	BaseURL    string  `json:"baseURL"`
	Protocol   string  `json:"protocol"`
	APIKey     *string `json:"apiKey,omitempty"`
}

// DiscoveredCustomModel deliberately excludes unverified capability claims.
type DiscoveredCustomModel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// DiscoverCustomModels fetches protocol model listings without saving a definition.
func (service *Settings) DiscoverCustomModels(ctx context.Context, input CustomModelDiscovery) ([]DiscoveredCustomModel, error) {
	if err := custom.ValidateURL(input.BaseURL); err != nil {
		return nil, err
	}
	if input.Protocol != custom.Chat && input.Protocol != custom.Responses && input.Protocol != custom.Anthropic && input.Protocol != custom.Images {
		return nil, fmt.Errorf("%w: 不支持的协议", custom.ErrInvalid)
	}
	key := ""
	if input.APIKey != nil {
		key = strings.TrimSpace(*input.APIKey)
	} else if input.ProviderID != "" {
		item, _, err := service.customProviderRecord(input.ProviderID)
		if err != nil {
			return nil, err
		}
		if input.Revision != item.Revision {
			return nil, domain.ErrSettingsRevisionConflict
		}
		if strings.TrimRight(input.BaseURL, "/") != strings.TrimRight(item.Definition.BaseURL, "/") {
			return nil, fmt.Errorf("%w: 更改地址后请重新填写密钥再获取模型", custom.ErrInvalid)
		}
		key, _, err = service.apiKeys.Get(custom.KeyName(input.ProviderID))
		if err != nil {
			return nil, err
		}
	}
	if key == "" || strings.ContainsAny(key, "\r\n") {
		return nil, ErrAPIKeyRequired
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	result := []DiscoveredCustomModel{}
	seen := map[string]bool{}
	cursor := ""
	for page := 0; page < 20; page++ {
		path := "/models"
		if cursor != "" {
			path += "?after_id=" + url.QueryEscape(cursor)
		}
		resp, err := custom.Request(ctx, nil, input.BaseURL, path, input.Protocol, key, "", nil)
		if err != nil {
			return nil, err
		}
		var payload struct {
			Data []struct {
				ID          string `json:"id"`
				DisplayName string `json:"display_name"`
			} `json:"data"`
			HasMore bool   `json:"has_more"`
			LastID  string `json:"last_id"`
		}
		err = json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&payload)
		_ = resp.Body.Close()
		if err != nil || payload.Data == nil {
			return nil, fmt.Errorf("模型列表格式无效，可手动添加模型")
		}
		for _, item := range payload.Data {
			if item.ID == "" || seen[item.ID] {
				continue
			}
			seen[item.ID] = true
			name := item.DisplayName
			if name == "" {
				name = item.ID
			}
			result = append(result, DiscoveredCustomModel{ID: item.ID, Name: name})
		}
		if input.Protocol != custom.Anthropic || !payload.HasMore {
			return result, nil
		}
		if payload.LastID == "" || payload.LastID == cursor {
			return nil, fmt.Errorf("模型列表分页游标无效")
		}
		cursor = payload.LastID
	}
	return nil, fmt.Errorf("模型列表分页过多，可手动添加模型")
}

// CustomProviderTestRequest explicitly selects a model, revision and billable operation.
type CustomProviderTestRequest struct {
	Revision      string         `json:"revision"`
	ModelID       string         `json:"modelId"`
	Protocol      string         `json:"protocol"`
	Operation     string         `json:"operation"`
	Prompt        string         `json:"prompt"`
	ReferenceURLs []string       `json:"referenceURLs,omitempty"`
	Params        map[string]any `json:"params,omitempty"`
}

// TestCustomProvider records only the selected model operation, never a platform-wide success.
func (service *Settings) TestCustomProvider(ctx context.Context, id string, input CustomProviderTestRequest) (CustomProviderTest, error) {
	item, raw, err := service.customProviderRecord(id)
	if err != nil {
		return CustomProviderTest{}, err
	}
	if item.Revision != input.Revision {
		return CustomProviderTest{}, domain.ErrSettingsRevisionConflict
	}
	var selected custom.Model
	found := false
	for _, model := range item.Definition.Models {
		if model.ID == input.ModelID && model.Protocol == input.Protocol {
			selected = model
			found = true
			break
		}
	}
	if !found {
		return CustomProviderTest{}, fmt.Errorf("%w: 模型不存在", custom.ErrInvalid)
	}
	definition, model, key, err := service.ResolveCustomRoute(ctx, item.Definition.RouteID(selected))
	if err != nil {
		return CustomProviderTest{}, err
	}
	if input.Operation != "text" && input.Operation != "generate" && input.Operation != "edit" {
		return CustomProviderTest{}, fmt.Errorf("%w: 测试操作无效", custom.ErrInvalid)
	}
	if (model.Kind == generation.KindText) != (input.Operation == "text") || (input.Operation == "edit" && len(input.ReferenceURLs) == 0) || (input.Operation == "generate" && len(input.ReferenceURLs) > 0) {
		return CustomProviderTest{}, fmt.Errorf("%w: 测试操作与模型不匹配", custom.ErrInvalid)
	}
	ctx, cancel := context.WithTimeout(ctx, 180*time.Second)
	defer cancel()
	if strings.TrimSpace(input.Prompt) == "" {
		input.Prompt = "Reply with OK."
	}
	if model.Kind == generation.KindText {
		_, err = (&custom.TextProvider{Definition: definition, Model: model, APIKey: key}).Generate(ctx, multimodal.GenerateRequest{Messages: []multimodal.Message{{Role: multimodal.RoleUser, Parts: []multimodal.Part{{Modality: multimodal.ModalityText, Text: input.Prompt}}}}})
	} else {
		_, err = (&custom.ImageProvider{Definition: definition, Model: model, APIKey: key}).Generate(ctx, generation.Request{Prompt: input.Prompt, ReferenceURLs: input.ReferenceURLs, Params: input.Params})
	}
	result := CustomProviderTest{ModelID: model.ID, Protocol: model.Protocol, Operation: input.Operation, Passed: err == nil, Message: "调用通过", TestedAt: time.Now().UTC()}
	if err != nil {
		result.Message = custom.SafeError(err.Error(), key)
	}
	item.Tests = append(item.Tests, result)
	if len(item.Tests) > 20 {
		item.Tests = item.Tests[len(item.Tests)-20:]
	}
	encoded, marshalErr := json.Marshal(item)
	if marshalErr != nil {
		return result, marshalErr
	}
	next := string(encoded)
	store, ok := service.appSettings.(customProviderStore)
	if !ok {
		return result, ErrAppSettingStoreMissing
	}
	if err := store.CompareAndSwapAppSettingWithKey(ctx, customProviderPrefix+id, &raw, &next, custom.KeyName(id), nil); err != nil {
		return result, err
	}
	return result, nil
}
