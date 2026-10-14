//go:build windows

package testutil

import "golang.org/x/sys/windows"

func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		return false
	}
	var code uint32
	queryErr := windows.GetExitCodeProcess(handle, &code)
	closeErr := windows.CloseHandle(handle)
	return queryErr == nil && closeErr == nil && code == 259
}
