package shared

import (
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

type mediaPosterLeaseEntry struct {
	lock  sync.RWMutex
	users int
	refs  int
}

var mediaPosterLeases = struct {
	sync.Mutex
	entries map[string]*mediaPosterLeaseEntry
}{entries: make(map[string]*mediaPosterLeaseEntry)}

// AcquireMediaPosterUse protects one poster during generation or serving.
func AcquireMediaPosterUse(path string) func() {
	key := mediaPosterLeaseKey(path)
	mediaPosterLeases.Lock()
	entry := mediaPosterLeaseEntryFor(key)
	entry.refs++
	entry.users++
	mediaPosterLeases.Unlock()

	entry.lock.RLock()
	return func() {
		entry.lock.RUnlock()
		mediaPosterLeases.Lock()
		entry.users--
		entry.refs--
		mediaPosterLeaseDeleteIfUnused(key, entry)
		mediaPosterLeases.Unlock()
	}
}

// TryAcquireMediaPosterCleanup locks one poster only when it is not in use.
func TryAcquireMediaPosterCleanup(path string) (func(), bool) {
	key := mediaPosterLeaseKey(path)
	mediaPosterLeases.Lock()
	entry := mediaPosterLeaseEntryFor(key)
	if entry.users > 0 || !entry.lock.TryLock() {
		mediaPosterLeaseDeleteIfUnused(key, entry)
		mediaPosterLeases.Unlock()
		return nil, false
	}
	entry.refs++
	mediaPosterLeases.Unlock()
	return func() {
		entry.lock.Unlock()
		mediaPosterLeases.Lock()
		entry.refs--
		mediaPosterLeaseDeleteIfUnused(key, entry)
		mediaPosterLeases.Unlock()
	}, true
}

// MediaPosterInUse reports whether the requested poster is active.
func MediaPosterInUse(path string) bool {
	key := mediaPosterLeaseKey(path)
	mediaPosterLeases.Lock()
	defer mediaPosterLeases.Unlock()
	entry := mediaPosterLeases.entries[key]
	return entry != nil && entry.users > 0
}

func mediaPosterLeaseKey(path string) string {
	absolute, err := filepath.Abs(filepath.Clean(path))
	if err == nil {
		if runtime.GOOS == "windows" {
			absolute = strings.ToLower(absolute)
		}
		return absolute
	}
	return filepath.Clean(path)
}

func mediaPosterLeaseEntryFor(key string) *mediaPosterLeaseEntry {
	entry := mediaPosterLeases.entries[key]
	if entry == nil {
		entry = &mediaPosterLeaseEntry{}
		mediaPosterLeases.entries[key] = entry
	}
	return entry
}

func mediaPosterLeaseDeleteIfUnused(key string, entry *mediaPosterLeaseEntry) {
	if entry.refs == 0 {
		delete(mediaPosterLeases.entries, key)
	}
}
