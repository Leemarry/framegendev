package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	service "github.com/mediago-dev/mediago-drama/services/server/internal/service/agent"
)

// SessionService supplies agent session operations.
type SessionService interface {
	Create(sessionID string, projectID string)
	ProjectSessionID(projectID string) (string, bool)
	List(projectID string) []service.AgentSessionSummary
	Status(sessionID string) service.AgentSessionStatus
	CancelRun(sessionID string) (service.AgentSessionStatus, bool)
}

type sessionLifecycleService interface {
	ListArchivedGlobal() []service.AgentSessionSummary
	Archive(string) error
	Restore(string) error
	Delete(string) error
}

// AgentSessions handles agent session HTTP routes.
type AgentSessions struct {
	store       SessionService
	newID       func(prefix string) (string, error)
	onCancelled func(service.AgentSessionStatus)
	statusFn    func(sessionID string) service.AgentSessionStatus
}

// NewAgentSessions returns an agent session route handler.
func NewAgentSessions(
	store SessionService,
	newID func(prefix string) (string, error),
	onCancelled func(service.AgentSessionStatus),
	statusFns ...func(sessionID string) service.AgentSessionStatus,
) AgentSessions {
	handler := AgentSessions{store: store, newID: newID, onCancelled: onCancelled}
	if len(statusFns) > 0 {
		handler.statusFn = statusFns[0]
	}
	return handler
}

// HandleCreateSession godoc
// @Summary 创建 Agent 会话
// @Description 创建或复用一个项目 Agent 会话。
// @Tags Agent
// @Accept json
// @Produce json
// @Param projectId path string true "Project ID"
// @Param payload body SwaggerObject true "Agent session payload"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions [post]
// @Router /api/v1/agent/sessions [post]
func (handler AgentSessions) HandleCreateSession(context *gin.Context) {
	projectID, ok := agentProjectID(context)
	if !ok {
		return
	}
	payload, err := decodeOptionalJSON[service.AgentSessionRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}
	rawProjectID := payload.ProjectID
	payload.ProjectID = projectID
	slog.Debug(
		"agent session create requested",
		"raw_project_id", domain.DiagnosticProjectID(rawProjectID),
		"project_id", domain.DiagnosticProjectID(payload.ProjectID),
	)

	if payload.ProjectID != "" && !payload.NewSession {
		if sessionID, ok := handler.store.ProjectSessionID(payload.ProjectID); ok {
			slog.Debug(
				"agent session reused",
				"session_id", sessionID,
				"project_id", domain.DiagnosticProjectID(payload.ProjectID),
			)
			httpresponse.OK(context, service.AgentSessionResponse{SessionID: sessionID})
			return
		}
	}

	sessionID, err := handler.newSessionID()
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		return
	}

	handler.store.Create(sessionID, payload.ProjectID)
	slog.Debug(
		"agent session created",
		"session_id", sessionID,
		"project_id", domain.DiagnosticProjectID(payload.ProjectID),
	)
	httpresponse.OK(context, service.AgentSessionResponse{SessionID: sessionID})
}

// HandleListAgentSessions godoc
// @Summary 获取 Agent 会话列表
// @Description 返回项目中的 Agent 会话列表。
// @Tags Agent
// @Produce json
// @Param projectId path string true "Project ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions [get]
// @Router /api/v1/agent/sessions [get]
func (handler AgentSessions) HandleListAgentSessions(context *gin.Context) {
	writeNoStoreHeaders(context)
	projectID, ok := agentProjectID(context)
	if !ok {
		return
	}
	httpresponse.OK(context, service.AgentSessionsResponse{
		Sessions: handler.store.List(projectID),
	})
}

// HandleListRunningAgentSessions godoc
// @Summary 获取运行中的 Agent 会话
// @Tags Agent
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/running [get]
// @Router /api/v1/agent/sessions/running [get]
func (handler AgentSessions) HandleListRunningAgentSessions(context *gin.Context) {
	writeNoStoreHeaders(context)
	projectID, ok := agentProjectID(context)
	if !ok {
		return
	}
	sessions := handler.store.List(projectID)
	running := make([]service.AgentSessionSummary, 0, len(sessions))
	for _, session := range sessions {
		if session.Running {
			running = append(running, session)
		}
	}
	httpresponse.OK(context, service.AgentSessionsResponse{Sessions: running})
}

// HandleListArchivedAgentSessions godoc
// @Summary 获取归档 Agent 会话
// @Tags Agent
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/agent/sessions/archived [get]
// @Router /api/v1/projects/{projectId}/agent/sessions/archived [get]
func (handler AgentSessions) HandleListArchivedAgentSessions(context *gin.Context) {
	writeNoStoreHeaders(context)
	if scoped, ok := handler.store.(sessionLifecycleService); ok {
		httpresponse.OK(context, service.AgentSessionsResponse{Sessions: scoped.ListArchivedGlobal()})
		return
	}
	httpresponse.OK(context, service.AgentSessionsResponse{Sessions: []service.AgentSessionSummary{}})
}

func (handler AgentSessions) mutateLifecycle(context *gin.Context, action string) {
	sessionID, ok := requiredPathParam(context, "sessionId", "sessionId")
	if !ok {
		return
	}
	projectID, ok := agentProjectID(context)
	if !ok {
		return
	}
	if projectID == "" && handler.status(sessionID).ProjectID != "" {
		httpresponse.Error(context, http.StatusNotFound, "全局会话不存在")
		return
	}
	scoped, ok := handler.store.(sessionLifecycleService)
	if !ok {
		httpresponse.Error(context, http.StatusServiceUnavailable, "agent session lifecycle is unavailable")
		return
	}
	var err error
	switch action {
	case "archive":
		err = scoped.Archive(sessionID)
	case "restore":
		err = scoped.Restore(sessionID)
	case "delete":
		err = scoped.Delete(sessionID)
	}
	if err != nil {
		if errors.Is(err, repository.ErrAgentCommandConflict) {
			httpresponse.Error(context, http.StatusConflict, "运行中的会话不能归档")
			return
		}
		if errors.Is(err, repository.ErrRecordNotFound) {
			httpresponse.Error(context, http.StatusNotFound, "会话不存在")
			return
		}
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		return
	}
	if action == "delete" {
		httpresponse.OK(context, map[string]bool{"deleted": true})
		return
	}
	httpresponse.OK(context, handler.status(sessionID))
}

// HandleArchiveAgentSession godoc
// @Summary 归档 Agent 会话
// @Tags Agent
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/{sessionId}/archive [post]
// @Router /api/v1/agent/sessions/{sessionId}/archive [post]
func (handler AgentSessions) HandleArchiveAgentSession(context *gin.Context) {
	handler.mutateLifecycle(context, "archive")
}

// HandleRestoreAgentSession godoc
// @Summary 恢复 Agent 会话
// @Tags Agent
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/{sessionId}/restore [post]
// @Router /api/v1/agent/sessions/{sessionId}/restore [post]
func (handler AgentSessions) HandleRestoreAgentSession(context *gin.Context) {
	handler.mutateLifecycle(context, "restore")
}

// HandleDeleteAgentSession godoc
// @Summary 永久删除 Agent 会话
// @Tags Agent
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/{sessionId} [delete]
// @Router /api/v1/agent/sessions/{sessionId} [delete]
func (handler AgentSessions) HandleDeleteAgentSession(context *gin.Context) {
	handler.mutateLifecycle(context, "delete")
}

// HandleAgentSessionStatus godoc
// @Summary 获取 Agent 会话状态
// @Description 返回 Agent 会话状态、运行状态和待处理权限请求。
// @Tags Agent
// @Produce json
// @Param projectId path string true "Project ID"
// @Param sessionId path string true "Session ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/{sessionId}/status [get]
// @Router /api/v1/agent/sessions/{sessionId}/status [get]
func (handler AgentSessions) HandleAgentSessionStatus(context *gin.Context) {
	writeNoStoreHeaders(context)
	sessionID, ok := requiredPathParam(context, "sessionId", "sessionId")
	if !ok {
		return
	}

	status := handler.status(sessionID)
	slog.Debug(
		"agent session status",
		"session_id", status.SessionID,
		"running", status.Running,
		"last_status", status.LastStatus,
		"pending_permissions", len(status.PendingPermissions),
	)
	httpresponse.OK(context, status)
}

// HandleCancelAgentSession godoc
// @Summary 取消 Agent 会话运行
// @Description 取消指定 Agent 会话中的活跃运行。
// @Tags Agent
// @Produce json
// @Param projectId path string true "Project ID"
// @Param sessionId path string true "Session ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/agent/sessions/{sessionId}/cancel [post]
// @Router /api/v1/agent/sessions/{sessionId}/cancel [post]
func (handler AgentSessions) HandleCancelAgentSession(context *gin.Context) {
	sessionID, ok := requiredPathParam(context, "sessionId", "sessionId")
	if !ok {
		return
	}

	status, cancelled := handler.store.CancelRun(sessionID)
	if handler.statusFn != nil {
		status = handler.statusFn(sessionID)
	}
	if cancelled && handler.onCancelled != nil {
		handler.onCancelled(status)
	}
	httpresponse.OK(context, status)
}

func (handler AgentSessions) status(sessionID string) service.AgentSessionStatus {
	if handler.statusFn != nil {
		return handler.statusFn(sessionID)
	}
	return handler.store.Status(sessionID)
}

func (handler AgentSessions) newSessionID() (string, error) {
	if handler.newID == nil {
		return "", nil
	}
	return handler.newID("session")
}
