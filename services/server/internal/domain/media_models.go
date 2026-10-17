package domain

import "time"

// AssetModel is the single GORM model for physical asset metadata.
type AssetModel struct {
	ID              string    `gorm:"column:id;primaryKey"`
	ProjectID       *string   `gorm:"column:project_id;index:assets_project_id_idx"`
	Kind            string    `gorm:"column:kind;not null;index:assets_kind_idx"`
	ContentHash     string    `gorm:"column:content_hash;not null;default:'';index:assets_content_hash_idx"`
	Filename        string    `gorm:"column:filename;not null"`
	TagsJSON        string    `gorm:"column:tags_json;not null;default:'[]'"`
	Note            string    `gorm:"column:note;not null;default:''"`
	Rating          int       `gorm:"column:rating;not null;default:0"`
	Favorite        bool      `gorm:"column:favorite;not null;default:false;index:assets_favorite_idx"`
	LibraryFolderID string    `gorm:"column:library_folder_id;not null;default:'';index:assets_library_folder_idx"`
	MIMEType        string    `gorm:"column:mime_type;not null"`
	SizeBytes       int64     `gorm:"column:size_bytes;not null"`
	RelPath         string    `gorm:"column:rel_path;not null;default:''"`
	URL             string    `gorm:"column:url;not null;default:''"`
	PosterRelPath   string    `gorm:"column:poster_rel_path;not null;default:''"`
	PosterURL       string    `gorm:"column:poster_url;not null;default:''"`
	Width           int       `gorm:"column:width;not null;default:0"`
	Height          int       `gorm:"column:height;not null;default:0"`
	DurationSeconds float64   `gorm:"column:duration_seconds;not null;default:0"`
	Source          string    `gorm:"column:source;not null;default:'';index:assets_source_idx"`
	SourceURL       string    `gorm:"column:source_url;not null;default:'';index:assets_source_url_idx"`
	MetadataStatus  string    `gorm:"column:metadata_status;not null;default:''"`
	StorageStatus   string    `gorm:"column:storage_status;not null;default:'ready';index:assets_storage_status_idx"`
	TrashedAt       *time.Time `gorm:"column:trashed_at;index:assets_trashed_at_idx"`
	CreatedAt       time.Time `gorm:"column:created_at;not null;autoCreateTime:nano"`
	UpdatedAt       time.Time `gorm:"column:updated_at;not null;autoUpdateTime:nano"`

	Project *WorkspaceProjectModel `gorm:"foreignKey:ProjectID;references:ID;constraint:OnDelete:CASCADE"`
}

// TableName returns the backing table name.
func (AssetModel) TableName() string {
	return "assets"
}

// AssetLibraryFolderModel stores logical media classification independently of document folders.
type AssetLibraryFolderModel struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	ProjectID string    `gorm:"column:project_id;not null;default:'';uniqueIndex:asset_library_folder_name,priority:1" json:"projectId"`
	ParentID  string    `gorm:"column:parent_id;not null;default:'';uniqueIndex:asset_library_folder_name,priority:2" json:"parentId"`
	Name      string    `gorm:"column:name;not null;uniqueIndex:asset_library_folder_name,priority:3" json:"name"`
	CreatedAt time.Time `gorm:"column:created_at;not null;autoCreateTime:nano" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;not null;autoUpdateTime:nano" json:"updatedAt"`
}

// TableName returns the logical library folder table.
func (AssetLibraryFolderModel) TableName() string { return "asset_library_folders" }
