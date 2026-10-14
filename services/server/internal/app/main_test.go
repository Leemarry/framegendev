package app

import (
	"os"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func TestMain(m *testing.M) {
	testutil.RunExecutableFixture()
	os.Exit(m.Run())
}
