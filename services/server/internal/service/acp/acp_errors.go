package acp

import (
	"errors"

	acpsdk "github.com/coder/acp-go-sdk"
)

const acpAuthenticationRequiredCode = -32000

// RuntimeProbeError identifies the failed startup phase without exposing subprocess output.
type RuntimeProbeError struct {
	Stage string
	Err   error
}

// Error preserves the diagnostic error for internal callers.
func (err *RuntimeProbeError) Error() string { return err.Err.Error() }

// Unwrap preserves cancellation and typed authentication errors.
func (err *RuntimeProbeError) Unwrap() error { return err.Err }

// IsAuthenticationRequiredError reports whether err is ACP's typed authentication-required error.
func IsAuthenticationRequiredError(err error) bool {
	var requestErr *acpsdk.RequestError
	return errors.As(err, &requestErr) && requestErr != nil && requestErr.Code == acpAuthenticationRequiredCode
}
