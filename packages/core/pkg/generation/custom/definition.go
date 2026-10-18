// Package custom implements portable, declarative provider connections.
package custom

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
)

// Supported wire protocols. Base URLs include the API root (for example /v1).
const (
	Chat      = "openai-completions"
	Responses = "openai-responses"
	Anthropic = "anthropic-messages"
	Images    = "openai-images"
)

// ErrInvalid identifies an invalid portable definition.
var ErrInvalid = errors.New("invalid custom provider")
var identifier = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,63}$`)

// Definition is the versioned, credential-free import/export contract.
type Definition struct {
	SchemaVersion int     `json:"schemaVersion"`
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	BaseURL       string  `json:"baseURL"`
	Enabled       bool    `json:"enabled"`
	Models        []Model `json:"models"`
}

// Model declares a remote model and explicitly selected capabilities.
type Model struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	Kind               generation.Kind `json:"kind"`
	Protocol           string          `json:"protocol"`
	Streaming          bool            `json:"streaming"`
	Tools              bool            `json:"tools"`
	Vision             bool            `json:"vision"`
	ContextWindow      int             `json:"contextWindow,omitempty"`
	MaxOutputTokens    int             `json:"maxOutputTokens,omitempty"`
	Generation         bool            `json:"generation"`
	Editing            bool            `json:"editing"`
	MaxReferenceImages int             `json:"maxReferenceImages,omitempty"`
	Sizes              []string        `json:"sizes,omitempty"`
	Qualities          []string        `json:"qualities,omitempty"`
	OutputFormats      []string        `json:"outputFormats,omitempty"`
}

// Validate validates without making requests or executing source code.
func (d Definition) Validate() error {
	fail := func(message string) error { return fmt.Errorf("%w: %s", ErrInvalid, message) }
	if d.SchemaVersion != 1 {
		return fail("不支持的配置文件版本")
	}
	if !identifier.MatchString(d.ID) {
		return fail("供应商 ID 须以小写字母开头，仅含小写字母、数字、横线或下划线，最多 64 位")
	}
	if strings.TrimSpace(d.Name) == "" || len(d.Name) > 200 {
		return fail("供应商名称不能为空或过长")
	}
	if err := ValidateURL(d.BaseURL); err != nil {
		return err
	}
	if len(d.Models) == 0 || len(d.Models) > 200 {
		return fail("需要 1 至 200 个模型")
	}
	seen := map[string]bool{}
	for _, m := range d.Models {
		if strings.TrimSpace(m.ID) == "" || m.ID != strings.TrimSpace(m.ID) || len(m.ID) > 200 || strings.ContainsAny(m.ID, "\r\n") {
			return fail("模型 ID 无效")
		}
		key := m.Protocol + ":" + m.ID
		if seen[key] {
			return fail("相同协议下的模型 ID 重复")
		}
		seen[key] = true
		if strings.TrimSpace(m.Name) == "" || len(m.Name) > 200 {
			return fail("模型名称不能为空或过长")
		}
		if m.ContextWindow < 0 || m.MaxOutputTokens < 0 || (m.ContextWindow > 0 && m.MaxOutputTokens > m.ContextWindow) {
			return fail("模型 token 上限无效")
		}
		switch m.Protocol {
		case Chat, Responses, Anthropic:
			if m.Kind != generation.KindText || m.Generation || m.Editing {
				return fail("文本协议与模型能力不匹配")
			}
		case Images:
			if m.Kind != generation.KindImage || (!m.Generation && !m.Editing) || m.Streaming || m.Tools || m.Vision {
				return fail("图片协议与模型能力不匹配")
			}
			if m.MaxReferenceImages < 0 || m.MaxReferenceImages > 16 || (m.Editing && m.MaxReferenceImages == 0) {
				return fail("图片编辑需声明 1 至 16 张参考图")
			}
			for _, format := range m.OutputFormats {
				if format != "png" && format != "jpeg" && format != "webp" {
					return fail("不支持的图片输出格式")
				}
			}
		default:
			return fail("不支持的协议")
		}
	}
	return nil
}

// ValidateURL rejects credentials and ambiguous API roots; local endpoints are supported.
func ValidateURL(value string) error {
	u, err := url.Parse(value)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || strings.ContainsAny(value, "\r\n") {
		return fmt.Errorf("%w: Base URL 必须是无账号、查询参数及片段的 HTTP(S) API 根地址", ErrInvalid)
	}
	return nil
}

// ProviderID reserves a namespace separate from built-in provider IDs.
func (d Definition) ProviderID() string { return "custom-" + d.ID }

// KeyName is the existing credential store key for a definition.
func KeyName(id string) string { return "custom-provider:" + id + ":api-key" }

// RouteID remains stable across display name, endpoint and credential changes.
func (d Definition) RouteID(m Model) string {
	h := sha256.Sum256([]byte(m.Protocol + "\x00" + m.ID))
	return d.ProviderID() + "-" + hex.EncodeToString(h[:12])
}

// Route builds the existing generation contract for one custom model.
func (d Definition) Route(m Model) generation.ModelRoute {
	id := d.RouteID(m)
	params := []generation.ParamSpec{}
	if m.Kind == generation.KindImage {
		for _, entry := range []struct {
			name, label string
			values      []string
		}{{"size", "尺寸", m.Sizes}, {"quality", "质量", m.Qualities}, {"outputFormat", "输出格式", m.OutputFormats}} {
			if len(entry.values) == 0 {
				continue
			}
			options := []generation.ParamOption{}
			for _, value := range entry.values {
				options = append(options, generation.ParamOption{Label: value, Value: value})
			}
			params = append(params, generation.ParamSpec{Name: entry.name, Label: entry.label, Type: "select", Options: options, Default: entry.values[0]})
		}
	}
	return generation.ModelRoute{ID: id, FamilyID: id, VersionID: id, LegacyModelID: id, Label: m.Name, Kind: m.Kind, Provider: d.ProviderID(), Model: m.ID, Adapter: m.Protocol, Status: generation.RouteStatusAvailable, SupportsReferenceURLs: m.Editing || m.Vision, MaxReferenceURLs: m.MaxReferenceImages, AuthKeys: []string{KeyName(d.ID)}, Params: params}
}
