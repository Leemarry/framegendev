package domain

// MediaAssetUsage is a read projection of durable uses, not persisted metadata.
type MediaAssetUsage struct {
	AssetID   string `json:"-"`
	Selected  bool   `json:"selected"`
	Candidate bool   `json:"candidate"`
	Reference bool   `json:"reference"`
}
