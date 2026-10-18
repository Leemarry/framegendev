package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	response "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	settings "github.com/mediago-dev/mediago-drama/services/server/internal/service/settings"
)

func customError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, custom.ErrInvalid), errors.Is(err, settings.ErrAPIKeyRequired):
		response.Error(c, 400, err.Error())
	case errors.Is(err, domain.ErrSettingsRevisionConflict):
		response.Error(c, 409, err.Error())
	case errors.Is(err, settings.ErrCustomProviderNotFound):
		response.Error(c, 404, err.Error())
	default:
		response.Fail(c, 500, "自定义供应商操作失败", err)
	}
}

func customBind(c *gin.Context, target any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		response.Error(c, 400, "配置格式无效或含未知字段")
		return false
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		response.Error(c, 400, "请求只能包含一个 JSON 对象")
		return false
	}
	return true
}

// HandleCustomProviders godoc
// @Summary List custom providers without credentials
// @Tags Settings
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers [get]
func (handler Settings) HandleCustomProviders(c *gin.Context) {
	items, err := handler.service.ListCustomProviders(c.Request.Context())
	if err != nil {
		customError(c, err)
		return
	}
	response.OK(c, gin.H{"providers": items})
}

// HandleSaveCustomProvider godoc
// @Summary Create or update a versioned custom provider
// @Tags Settings
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Definition, revision and optional replacement key"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers [post]
// @Router /api/v1/settings/custom-providers/{id} [put]
func (handler Settings) HandleSaveCustomProvider(c *gin.Context) {
	var input settings.CustomProviderMutation
	if !customBind(c, &input) {
		return
	}
	item, err := handler.service.SaveCustomProvider(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		customError(c, err)
		return
	}
	response.OK(c, item)
}

// HandleDeleteCustomProvider godoc
// @Summary Delete a custom provider and its credential
// @Tags Settings
// @Param id path string true "Provider ID"
// @Param revision query string true "Current revision"
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers/{id} [delete]
func (handler Settings) HandleDeleteCustomProvider(c *gin.Context) {
	if err := handler.service.DeleteCustomProvider(c.Request.Context(), c.Param("id"), c.Query("revision")); err != nil {
		customError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true})
}

// HandleCustomProviderKey godoc
// @Summary Replace or clear a custom provider credential (revision required)
// @Tags Settings
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers/{id}/api-key [put]
// @Router /api/v1/settings/custom-providers/{id}/api-key [delete]
func (handler Settings) HandleCustomProviderKey(c *gin.Context) {
	var input struct {
		Revision string `json:"revision"`
		APIKey   string `json:"apiKey"`
	}
	if c.Request.Method == http.MethodDelete {
		input.Revision = c.Query("revision")
	} else if !customBind(c, &input) {
		return
	}
	item, err := handler.service.SetCustomProviderKey(c.Request.Context(), c.Param("id"), input.Revision, input.APIKey)
	if err != nil {
		customError(c, err)
		return
	}
	response.OK(c, item)
}

// HandleValidateCustomProvider godoc
// @Summary Validate a portable JSON definition without network access
// @Tags Settings
// @Param definition body map[string]interface{} true "Portable definition"
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers/validate [post]
func (handler Settings) HandleValidateCustomProvider(c *gin.Context) {
	var input custom.Definition
	if !customBind(c, &input) {
		return
	}
	if err := input.Validate(); err != nil {
		customError(c, err)
		return
	}
	response.OK(c, input)
}

// HandleDiscoverCustomModels godoc
// @Summary Discover models without inferring their capabilities
// @Tags Settings
// @Param request body map[string]interface{} true "Connection draft"
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers/discover-models [post]
func (handler Settings) HandleDiscoverCustomModels(c *gin.Context) {
	var input settings.CustomModelDiscovery
	if !customBind(c, &input) {
		return
	}
	items, err := handler.service.DiscoverCustomModels(c.Request.Context(), input)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"models": items})
}

// HandleTestCustomProvider godoc
// @Summary Explicitly test one model operation (may incur provider charges)
// @Tags Settings
// @Param request body map[string]interface{} true "Model, operation and revision"
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/settings/custom-providers/{id}/test [post]
func (handler Settings) HandleTestCustomProvider(c *gin.Context) {
	var input settings.CustomProviderTestRequest
	if !customBind(c, &input) {
		return
	}
	result, err := handler.service.TestCustomProvider(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		customError(c, err)
		return
	}
	response.OK(c, result)
}
