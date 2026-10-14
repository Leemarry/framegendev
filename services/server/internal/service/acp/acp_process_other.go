//go:build !windows

package acp

import "os/exec"

func startACPProcess(cmd *exec.Cmd) (func() error, error) {
	return nil, cmd.Start()
}
