package domain

import "errors"

// ErrSettingsRevisionConflict prevents stale settings and credentials from being overwritten.
var ErrSettingsRevisionConflict = errors.New("配置已变更，请刷新后重试")
