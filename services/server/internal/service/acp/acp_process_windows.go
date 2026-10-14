package acp

import (
	"fmt"
	"os/exec"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Assign the suspended process before it can spawn a shell/Codex/MCP child.
// Closing this private job also covers descendants after the adapter exits.
func startACPProcess(cmd *exec.Cmd) (func() error, error) {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return nil, fmt.Errorf("creating ACP process job: %w", err)
	}
	var closeOnce sync.Once
	var closeErr error
	closeJob := func() error {
		closeOnce.Do(func() { closeErr = windows.CloseHandle(job) })
		return closeErr
	}
	started := false
	defer func() {
		if !started {
			if err := closeJob(); err != nil {
				acpLog().Warn("acp process job close failed", "error", err)
			}
		}
	}()
	limits := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{}
	limits.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
	if _, err := windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation, uintptr(unsafe.Pointer(&limits)), uint32(unsafe.Sizeof(limits))); err != nil {
		return nil, fmt.Errorf("configuring ACP process job: %w", err)
	}
	attributes := syscall.SysProcAttr{}
	if cmd.SysProcAttr != nil {
		attributes = *cmd.SysProcAttr
	}
	attributes.CreationFlags |= windows.CREATE_SUSPENDED
	attributes.HideWindow = true
	cmd.SysProcAttr = &attributes
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	fail := func(err error) (func() error, error) {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
		return nil, err
	}
	process, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
	if err != nil {
		return fail(fmt.Errorf("opening ACP process for job: %w", err))
	}
	defer closeACPWindowsHandle(process)
	if err := windows.AssignProcessToJobObject(job, process); err != nil {
		return fail(fmt.Errorf("assigning ACP process job: %w", err))
	}
	if err := resumeACPProcess(uint32(cmd.Process.Pid)); err != nil {
		return fail(err)
	}
	started = true
	return closeJob, nil
}

func resumeACPProcess(pid uint32) error {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPTHREAD, 0)
	if err != nil {
		return fmt.Errorf("listing suspended ACP threads: %w", err)
	}
	defer closeACPWindowsHandle(snapshot)
	entry := windows.ThreadEntry32{Size: uint32(unsafe.Sizeof(windows.ThreadEntry32{}))}
	for err = windows.Thread32First(snapshot, &entry); err == nil; err = windows.Thread32Next(snapshot, &entry) {
		if entry.OwnerProcessID != pid {
			continue
		}
		thread, err := windows.OpenThread(windows.THREAD_SUSPEND_RESUME, false, entry.ThreadID)
		if err != nil {
			return fmt.Errorf("opening suspended ACP thread: %w", err)
		}
		defer closeACPWindowsHandle(thread)
		if _, err := windows.ResumeThread(thread); err != nil {
			return fmt.Errorf("resuming ACP process: %w", err)
		}
		return nil
	}
	return fmt.Errorf("finding suspended ACP thread: %w", err)
}

func closeACPWindowsHandle(handle windows.Handle) {
	if err := windows.CloseHandle(handle); err != nil {
		acpLog().Warn("acp process handle close failed", "error", err)
	}
}
