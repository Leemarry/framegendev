package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strings"
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
	"github.com/gin-gonic/gin"
	serviceacp "github.com/mediago-dev/mediago-drama/services/server/internal/service/acp"
	serviceagent "github.com/mediago-dev/mediago-drama/services/server/internal/service/agent"
	servicesettings "github.com/mediago-dev/mediago-drama/services/server/internal/service/settings"
)

func TestHandleAgentRuntimeConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)
	successConfig := serviceagent.AgentRuntimeConfigResponse{
		Model: &serviceagent.AgentRuntimeSelectConfig{
			ConfigID:     "model",
			Name:         "模型",
			CurrentValue: "gpt-5",
			Options: []serviceagent.AgentRuntimeSelectOption{
				{Value: "gpt-5", Name: "GPT-5"},
			},
		},
	}
	const secret = "sk-secret-must-not-leak"

	tests := []struct {
		name              string
		inspect           AgentRuntimeConfigInspector
		wantStatus        int
		wantSuccess       bool
		wantMessage       string
		wantModelConfigID string
		forbiddenBodyText string
	}{
		{
			name: "probe failure identifies phase without leaking stderr",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, &serviceacp.RuntimeProbeError{Stage: "initialize", Err: errors.New(secret)}
			},
			wantStatus:        http.StatusServiceUnavailable,
			wantMessage:       "Codex 协议初始化失败，请检查 Codex 与 ACP 适配器版本是否兼容",
			forbiddenBodyText: secret,
		},
		{
			name: "missing active relay key",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, &serviceacp.RuntimeProbeError{Stage: "prepare", Err: servicesettings.ErrCodexRelayNotConfigured}
			},
			wantStatus:  http.StatusServiceUnavailable,
			wantMessage: "当前 Codex 中转缺少可用配置或 API Key，请在模型接入中检查当前渠道",
		},
		{
			name: "probe timeout",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, &serviceacp.RuntimeProbeError{Stage: "session_new", Err: context.DeadlineExceeded}
			},
			wantStatus:  http.StatusServiceUnavailable,
			wantMessage: "Codex 运行配置读取超时，请检查当前渠道和本机运行环境后重试",
		},
		{
			name: "missing executable is actionable",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, fmt.Errorf("starting ACP: %w", exec.ErrNotFound)
			},
			wantStatus:  http.StatusServiceUnavailable,
			wantMessage: "未找到 Agent 运行程序，请配置 agent.bin_dir 或安装 codex-acp 后重启服务",
		},
		{
			name: "success",
			inspect: func(_ context.Context, projectID string) (serviceagent.AgentRuntimeConfigResponse, error) {
				if projectID != "project-1" {
					t.Fatalf("projectID = %q, want project-1", projectID)
				}
				return successConfig, nil
			},
			wantStatus:        http.StatusOK,
			wantSuccess:       true,
			wantMessage:       "成功",
			wantModelConfigID: "model",
		},
		{
			name: "authentication required",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, fmt.Errorf(
					"creating ACP config probe session: %w",
					&acpsdk.RequestError{Code: -32000, Message: "Authentication required"},
				)
			},
			wantStatus:  http.StatusServiceUnavailable,
			wantMessage: "Agent 尚未完成认证，请前往设置配置对应凭据后重试",
		},
		{
			name: "generic runtime failure redacts internal details",
			inspect: func(context.Context, string) (serviceagent.AgentRuntimeConfigResponse, error) {
				return serviceagent.AgentRuntimeConfigResponse{}, errors.New("starting ACP with token " + secret)
			},
			wantStatus:        http.StatusServiceUnavailable,
			wantMessage:       "Agent 运行环境暂不可用，请检查运行配置后重试",
			forbiddenBodyText: secret,
		},
		{
			name:        "nil inspector",
			inspect:     nil,
			wantStatus:  http.StatusServiceUnavailable,
			wantMessage: "Agent 运行环境暂不可用，请检查运行配置后重试",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			handler := NewAgentRuntime(tt.inspect)
			router.GET("/projects/:projectId/agent/runtime-config", handler.HandleAgentRuntimeConfig)

			recorder := httptest.NewRecorder()
			router.ServeHTTP(
				recorder,
				httptest.NewRequest(http.MethodGet, "/projects/project-1/agent/runtime-config", nil),
			)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			var envelope struct {
				Success bool                                    `json:"success"`
				Message string                                  `json:"message"`
				Data    serviceagent.AgentRuntimeConfigResponse `json:"data"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
				t.Fatalf("decoding response: %v", err)
			}
			if envelope.Success != tt.wantSuccess {
				t.Fatalf("success = %t, want %t", envelope.Success, tt.wantSuccess)
			}
			if envelope.Message != tt.wantMessage {
				t.Fatalf("message = %q, want %q", envelope.Message, tt.wantMessage)
			}
			if tt.wantModelConfigID != "" {
				if envelope.Data.Model == nil || envelope.Data.Model.ConfigID != tt.wantModelConfigID {
					t.Fatalf("model = %#v, want config id %q", envelope.Data.Model, tt.wantModelConfigID)
				}
			}
			if tt.forbiddenBodyText != "" && strings.Contains(recorder.Body.String(), tt.forbiddenBodyText) {
				t.Fatalf("response body leaked internal detail %q: %s", tt.forbiddenBodyText, recorder.Body.String())
			}
		})
	}
}
