package document

import (
	"reflect"
	"strings"
	"testing"

	serviceshared "github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

func TestListDocumentMediaAssetReferencesScansInlineImages(t *testing.T) {
	store := requireDocumentStore(t)
	projectID := "project-document-asset-references"
	requireTestProject(t, store, projectID)

	if _, _, err := store.CreateWorkspaceDocument(projectID, CreateWorkspaceDocumentRequest{
		ID:    "characters",
		Title: "角色设定",
		Content: strings.Join([]string{
			"# 角色设定",
			"",
			"## 林书彤",
			"",
			"![主脸](/api/v1/media-assets/asset-lin/content)",
			"",
			"![重复引用](/api/v1/media-assets/asset-lin/content)",
			"段落内 ![图片](</api/v1/media-assets/asset-inline/content>) 和 ![重复](/api/v1/media-assets/asset-inline/content)",
			"![引用式][asset-link]",
			"",
			"[asset-link]: /api/v1/media-assets/asset-reference/content",
			"",
			"`![代码](/api/v1/media-assets/asset-code/content)`",
			"```markdown",
			"![示例](/api/v1/media-assets/asset-fence/content)",
			"```",
			"",
			"![旧路径](/api/media/assets/asset-legacy/content)",
			"",
			"![编码 ID](http://127.0.0.1:48273/api/v1/media-assets/media%20a/content)",
			"",
			"![占位](mediago-drama-section-image-pending:abc)",
			"![矢量](data:image/svg+xml;base64,placeholder)",
			"![mediago-drama-section-image-pending:abc](/api/v1/media-assets/asset-placeholder/content)",
			"",
			"普通文字，不是图片。",
		}, "\n"),
		Category: "character",
	}); err != nil {
		t.Fatalf("creating character document: %v", err)
	}

	if _, _, err := store.CreateWorkspaceDocument(projectID, CreateWorkspaceDocumentRequest{
		ID:       "scenes",
		Title:    "场景设定",
		Content:  "## 夜景\n\n![夜景](/api/v1/media-assets/asset-lin/content)\n",
		Category: "scene",
	}); err != nil {
		t.Fatalf("creating scene document: %v", err)
	}

	references, err := store.ListDocumentMediaAssetReferences(projectID)
	if err != nil {
		t.Fatalf("ListDocumentMediaAssetReferences returned error: %v", err)
	}
	if len(references) != 6 {
		t.Fatalf("references = %#v, want 6 entries", references)
	}

	want := map[string]serviceshared.DocumentMediaAssetReference{}
	for _, entry := range references {
		want[entry.DocumentID+"|"+entry.AssetID] = entry
	}
	lin, ok := want["characters|asset-lin"]
	if !ok || lin.DocumentTitle != "角色设定" || lin.DocumentCategory != "character" {
		t.Fatalf("characters entry = %#v, want title 角色设定 / category character", lin)
	}
	if _, ok := want["characters|asset-legacy"]; !ok {
		t.Fatalf("legacy media/assets path not recognised: %#v", references)
	}
	if _, ok := want["characters|media a"]; !ok {
		t.Fatalf("URL-encoded id not decoded: %#v", references)
	}
	for _, id := range []string{"asset-inline", "asset-reference"} {
		if _, ok := want["characters|"+id]; !ok {
			t.Fatalf("missing inline/reference image %s: %#v", id, references)
		}
	}
	for _, id := range []string{"asset-code", "asset-fence", "asset-placeholder"} {
		if _, ok := want["characters|"+id]; ok {
			t.Fatalf("non-rendered image counted: %s", id)
		}
	}
	scene, ok := want["scenes|asset-lin"]
	if !ok || scene.DocumentCategory != "scene" {
		t.Fatalf("scenes entry = %#v, want category scene", scene)
	}
	for _, entry := range references {
		if strings.Contains(entry.AssetID, "section-image-pending") || strings.HasPrefix(entry.AssetID, "data:") {
			t.Fatalf("placeholder counted as reference: %#v", entry)
		}
	}
	before, err := store.LoadWorkspaceState(projectID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ListDocumentMediaAssetReferences(projectID); err != nil {
		t.Fatal(err)
	}
	after, err := store.LoadWorkspaceState(projectID)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(before.Documents, after.Documents) {
		t.Fatal("reference lookup changed document content or metadata")
	}
}

func TestListDocumentMediaAssetReferencesRejectsBlankProject(t *testing.T) {
	store := requireDocumentStore(t)
	if _, err := store.ListDocumentMediaAssetReferences("  "); err == nil {
		t.Fatal("ListDocumentMediaAssetReferences() error = nil, want projectId required")
	}
}
