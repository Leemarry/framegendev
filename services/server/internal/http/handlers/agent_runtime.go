package handlers

import (
	stdcontext "context"
	"errors"
	"net/http"
	"os"
	"os/exec"

	"github.com/gin-gonic/gin"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	serviceacp "github.com/mediago-dev/mediago-drama/services/server/internal/service/acp"
	service "github.com/mediago-dev/mediago-drama/services/server/internal/service/agent"
	servicesettings "github.com/mediago-dev/mediago-drama/services/server/internal/service/settings"
)

const (
	agentRuntimeAuthenticationRequiredMessage = "Agent 尚未完成认证，请前往设置配置对应凭据后重试"
	agentRuntimeUnavailableMessage            = "Agent 运行环境暂不可用，请检查运行配置后重试"
)

var errAgentRuntimeConfigInspectorUnavailable = errors.New("agent runtime config inspector is unavailable")

// AgentRuntimeConfigInspector probes agent runtime configuration.
type AgentRuntimeConfigInspector func(ctx stdcontext.Context, projectID string) (service.AgentRuntimeConfigResponse, error)

// AgentRuntime handles runtime configuration HTTP routes.
type AgentRuntime struct {
	inspect AgentRuntimeConfigInspector
}

// NewAgentRuntime returns an agent runtime route handler.
func NewAgentRuntime(inspect AgentRuntimeConfigInspector) AgentRuntime {
	return AgentRuntime{inspect: inspect}
}

// HandleAgentRuntimeConfig godoc
// @Summary 获取 Agent 运行配置
// @Description 返回当前项目可用于 Agent 运行的配置检查结果。
// @Tags Agent
// @Produce json
// @Param projectId path string true "Project ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 503 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/runtime-config [get]
// @Router /api/v1/agent/runtime-config [get]
func (handler AgentRuntime) HandleAgentRuntimeConfig(context *gin.Context) {
	if handler.inspect == nil {
		httpresponse.Fail(
			context,
			http.StatusServiceUnavailable,
			agentRuntimeUnavailableMessage,
			errAgentRuntimeConfigInspectorUnavailable,
		)
		return
	}
	projectID, ok := agentProjectID(context)
	if !ok {
		return
	}
	config, err := handler.inspect(context.Request.Context(), projectID)
	if err != nil {
		publicMessage := agentRuntimeUnavailableMessage
		var probeErr *serviceacp.RuntimeProbeError
		if serviceacp.IsAuthenticationRequiredError(err) {
			publicMessage = agentRuntimeAuthenticationRequiredMessage
		} else if errors.Is(err, exec.ErrNotFound) || errors.Is(err, os.ErrNotExist) {
			publicMessage = "未找到 Agent 运行程序，请配置 agent.bin_dir 或安装 codex-acp 后重启服务"
		} else if errors.Is(err, servicesettings.ErrCodexRelayNotConfigured) {
			publicMessage = "当前 Codex 中转缺少可用配置或 API Key，请在模型接入中检查当前渠道"
		} else if errors.Is(err, stdcontext.DeadlineExceeded) {
			publicMessage = "Codex 运行配置读取超时，请检查当前渠道和本机运行环境后重试"
		} else if errors.As(err, &probeErr) {
			switch probeErr.Stage {
			case "prepare":
				publicMessage = "Codex 运行配置准备失败，请检查当前渠道配置及工作目录权限"
			case "start":
				publicMessage = "Codex 进程启动失败，请检查 Agent 包及本机运行权限"
			case "initialize":
				publicMessage = "Codex 协议初始化失败，请检查 Codex 与 ACP 适配器版本是否兼容"
			case "session_new":
				publicMessage = "Codex 会话创建失败，请检查当前渠道认证、模型配置及工作目录权限"
			}
		}
		httpresponse.Fail(context, http.StatusServiceUnavailable, publicMessage, err)
		return
	}
	httpresponse.OK(context, config)
}
