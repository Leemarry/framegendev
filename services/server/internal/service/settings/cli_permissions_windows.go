package settings

import (
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

// A Low-integrity executable cannot write normal user files or HKCU credentials,
// even when its user SID and directory DACL both appear correct.
func checkCLICredentialPermissions() error {
	var size uint32
	token := windows.GetCurrentProcessToken()
	_ = windows.GetTokenInformation(token, windows.TokenIntegrityLevel, nil, 0, &size)
	if size == 0 {
		return fmt.Errorf("%w: 无法检查 Windows 进程完整性", ErrLocalCLIPermission)
	}
	buffer := make([]byte, size)
	if err := windows.GetTokenInformation(token, windows.TokenIntegrityLevel, &buffer[0], size, &size); err != nil {
		return fmt.Errorf("%w: 无法检查 Windows 进程完整性", ErrLocalCLIPermission)
	}
	label := (*windows.Tokenmandatorylabel)(unsafe.Pointer(&buffer[0]))
	count := label.Label.Sid.SubAuthorityCount()
	if count == 0 || label.Label.Sid.SubAuthority(uint32(count-1)) < 0x2000 {
		return fmt.Errorf("%w: 后端以 Windows 低完整性运行，无法保存或清除 CLI 凭据。请从正常用户应用目录启动后端和 CLI；开发环境使用 scripts/dev/start-local-server.ps1，然后重新授权", ErrLocalCLIPermission)
	}
	return nil
}
