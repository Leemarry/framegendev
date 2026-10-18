package custom

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
)

// ImageProvider executes the standard Images API against a configured root.
type ImageProvider struct {
	Definition Definition
	Model      Model
	APIKey     string
	Client     *http.Client
}

// Name returns the custom provider identity.
func (p *ImageProvider) Name() string { return p.Definition.ProviderID() }

// Get is unsupported: standard image requests complete synchronously.
func (p *ImageProvider) Get(context.Context, string) (generation.Response, error) {
	return generation.Response{}, fmt.Errorf("标准图片接口不支持远程任务查询")
}

// Generate performs one generation/edit without automatically retrying paid work.
func (p *ImageProvider) Generate(ctx context.Context, request generation.Request) (generation.Response, error) {
	if strings.TrimSpace(request.Prompt) == "" {
		return generation.Response{}, generation.ErrMissingPrompt
	}
	if request.Model != "" && request.Model != p.Model.ID {
		return generation.Response{}, fmt.Errorf("请求模型与配置不一致")
	}
	editing := len(request.ReferenceURLs) > 0
	if editing && (!p.Model.Editing || len(request.ReferenceURLs) > p.Model.MaxReferenceImages) {
		return generation.Response{}, fmt.Errorf("模型不支持该数量的参考图编辑")
	}
	if !editing && !p.Model.Generation {
		return generation.Response{}, fmt.Errorf("模型未声明文生图能力")
	}
	payload := map[string]any{"model": p.Model.ID, "prompt": request.Prompt, "n": 1}
	for _, spec := range []struct {
		key, wire string
		allowed   []string
	}{{"size", "size", p.Model.Sizes}, {"quality", "quality", p.Model.Qualities}, {"outputFormat", "output_format", p.Model.OutputFormats}} {
		value, _ := request.Params[spec.key].(string)
		if value == "" && len(spec.allowed) > 0 {
			value = spec.allowed[0]
		}
		if value != "" {
			valid := false
			for _, allowed := range spec.allowed {
				if value == allowed {
					valid = true
				}
			}
			if !valid {
				return generation.Response{}, fmt.Errorf("未声明的图片参数: %s", spec.key)
			}
			payload[spec.wire] = value
		}
	}
	var body bytes.Buffer
	contentType := "application/json"
	path := "/images/generations"
	if editing {
		path = "/images/edits"
		writer := multipart.NewWriter(&body)
		for key, value := range payload {
			if err := writer.WriteField(key, fmt.Sprint(value)); err != nil {
				return generation.Response{}, err
			}
		}
		for index, reference := range request.ReferenceURLs {
			if err := p.writeImage(ctx, writer, "image[]", fmt.Sprintf("reference-%d", index), reference); err != nil {
				return generation.Response{}, err
			}
		}
		if mask, _ := request.Params["mask"].(string); mask != "" {
			if err := p.writeImage(ctx, writer, "mask", "mask", mask); err != nil {
				return generation.Response{}, err
			}
		}
		if err := writer.Close(); err != nil {
			return generation.Response{}, err
		}
		contentType = writer.FormDataContentType()
	} else {
		if mask, _ := request.Params["mask"].(string); mask != "" {
			return generation.Response{}, fmt.Errorf("mask 需要参考图")
		}
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			return generation.Response{}, err
		}
	}
	resp, err := Request(ctx, p.Client, p.Definition.BaseURL, path, Images, p.APIKey, contentType, &body)
	if err != nil {
		return generation.Response{}, err
	}
	defer resp.Body.Close()
	var result struct {
		Data []struct {
			URL    string `json:"url"`
			Base64 string `json:"b64_json"`
		} `json:"data"`
		Error json.RawMessage `json:"error"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 100<<20)).Decode(&result); err != nil {
		return generation.Response{}, fmt.Errorf("图片接口返回了无效 JSON")
	}
	if len(result.Error) > 0 && string(result.Error) != "null" {
		return generation.Response{}, fmt.Errorf("图片接口错误: %s", SafeError(string(result.Error), p.APIKey))
	}
	assets := []generation.Asset{}
	format, _ := payload["output_format"].(string)
	if format == "" {
		format = "png"
	}
	for _, item := range result.Data {
		if item.URL != "" {
			if err := validateAssetURL(item.URL); err != nil {
				return generation.Response{}, err
			}
			assets = append(assets, generation.Asset{Kind: generation.KindImage, URL: item.URL})
		} else if item.Base64 != "" {
			data, err := base64.StdEncoding.DecodeString(item.Base64)
			if err != nil || len(data) == 0 {
				return generation.Response{}, fmt.Errorf("图片 Base64 无效")
			}
			assets = append(assets, generation.Asset{Kind: generation.KindImage, Base64: item.Base64, MIMEType: "image/" + format})
		}
	}
	if len(assets) == 0 {
		return generation.Response{}, fmt.Errorf("图片接口未返回有效素材")
	}
	return generation.Response{Status: "completed", Model: p.Model.ID, Assets: assets}, nil
}

func validateAssetURL(value string) error {
	if !strings.HasPrefix(value, "https://") && !strings.HasPrefix(value, "http://") {
		return fmt.Errorf("素材 URL 必须为 HTTP(S)")
	}
	return nil
}

func (p *ImageProvider) writeImage(ctx context.Context, writer *multipart.Writer, field, name, reference string) error {
	var data []byte
	var mimeType string
	if strings.HasPrefix(reference, "data:") {
		metadata, encoded, ok := strings.Cut(reference[5:], ",")
		if !ok || !strings.HasSuffix(metadata, ";base64") {
			return fmt.Errorf("参考图 data URL 无效")
		}
		mimeType = strings.TrimSuffix(metadata, ";base64")
		var err error
		data, err = base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return fmt.Errorf("参考图 Base64 无效")
		}
	} else {
		if err := validateAssetURL(reference); err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reference, nil)
		if err != nil {
			return fmt.Errorf("参考图地址无效")
		}
		resp, err := clientFor(p.Client).Do(req)
		if err != nil {
			return fmt.Errorf("参考图下载失败")
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("参考图下载 HTTP %d", resp.StatusCode)
		}
		data, err = io.ReadAll(io.LimitReader(resp.Body, (25<<20)+1))
		if err != nil {
			return fmt.Errorf("参考图读取失败")
		}
		mimeType = http.DetectContentType(data)
	}
	if len(data) == 0 || len(data) > 25<<20 || !strings.HasPrefix(mimeType, "image/") {
		return fmt.Errorf("参考图必须是非空图片且不超过 25 MB")
	}
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, field, name))
	header.Set("Content-Type", mimeType)
	part, err := writer.CreatePart(header)
	if err != nil {
		return err
	}
	_, err = part.Write(data)
	return err
}
