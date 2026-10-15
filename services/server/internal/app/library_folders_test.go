package app

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestLibraryFoldersAPI(t *testing.T) {
	handler := newTestHandler(t, filepath.Join(t.TempDir(), "settings.db"))
	project, _ := createExternalProjectForTest(t, handler, "Folders")
	other, _ := createExternalProjectForTest(t, handler, "Other folders")
	base := "/api/v1/projects/" + project.ID
	request := func(method, path, payload string, status int) string {
		t.Helper()
		response := requestJSON(t, handler, method, path, payload)
		defer response.Body.Close()
		body := readBody(t, response.Body)
		if response.StatusCode != status {
			t.Fatalf("%s %s: %d want %d: %s", method, path, response.StatusCode, status, body)
		}
		return body
	}
	folderID := func(body string) string {
		t.Helper()
		var response struct {
			Data struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		if err := json.Unmarshal([]byte(body), &response); err != nil || response.Data.ID == "" {
			t.Fatalf("folder: %s, %v", body, err)
		}
		return response.Data.ID
	}
	root := folderID(request(http.MethodPost, base+"/asset-library-folders", `{"name":"  角色  "}`, 200))
	child := folderID(request(http.MethodPost, base+"/asset-library-folders", `{"name":"主角","parentId":"`+root+`"}`, 200))
	global := folderID(request(http.MethodPost, "/api/v1/asset-library-folders", `{"name":"角色"}`, 200))
	request(http.MethodPost, base+"/asset-library-folders", `{"name":"角色"}`, 400)
	for _, name := range []string{"", ".", "..", "a/b", `a\b`, strings.Repeat("字", 81), "bad\nname"} {
		payload, _ := json.Marshal(map[string]string{"name": name})
		request(http.MethodPost, base+"/asset-library-folders", string(payload), 400)
	}
	request(http.MethodPost, base+"/asset-library-folders", `{"name":"bad","parentId":"`+global+`"}`, 404)
	request(http.MethodPost, "/api/v1/projects/missing/asset-library-folders", `{"name":"bad"}`, 404)
	request(http.MethodPut, base+"/asset-library-folders/"+child, `{"name":"主人公"}`, 200)
	request(http.MethodPut, base+"/asset-library-folders/"+child, `{"name":"bad","parentId":""}`, 400)
	sibling := folderID(request(http.MethodPost, base+"/asset-library-folders", `{"name":"其他","parentId":"`+root+`"}`, 200))
	request(http.MethodPut, base+"/asset-library-folders/"+sibling, `{"name":"主人公"}`, 400)
	request(http.MethodPut, base+"/asset-library-folders/"+sibling, `{"name":"其他"}`, 200)
	request(http.MethodGet, "/api/v1/projects/missing/asset-library-folders", "", 404)
	request(http.MethodPost, base+"/asset-library-folders", `{"name":7}`, 400)
	request(http.MethodPost, base+"/asset-library-folders", `{"name":"valid","unexpected":true}`, 400)
	request(http.MethodPut, "/api/v1/asset-library-folders/"+child, `{"name":"bad"}`, 404)
	list := request(http.MethodGet, base+"/asset-library-folders", "", 200)
	if !strings.Contains(list, "主人公") || !strings.Contains(list, root) || strings.Contains(list, global) {
		t.Fatalf("scope list: %s", list)
	}
	empty := folderID(request(http.MethodPost, base+"/asset-library-folders", `{"name":"空目录"}`, 200))
	request(http.MethodDelete, base+"/asset-library-folders/"+empty, "", 200)
	request(http.MethodDelete, base+"/asset-library-folders/"+empty, "", 404)
	request(http.MethodDelete, base+"/asset-library-folders/"+root, "", 409)
	asset := uploadImageAssetForTest(t, handler, project.ID, "stable.png")
	path := base + "/media-assets/" + asset.ID
	request(http.MethodDelete, "/api/v1/media-assets/"+asset.ID, "", 404)
	request(http.MethodDelete, "/api/v1/projects/"+other.ID+"/media-assets/"+asset.ID, "", 404)
	globalAsset := uploadImageAssetForTest(t, handler, "", "global.png")
	request(http.MethodDelete, base+"/media-assets/"+globalAsset.ID, "", 404)
	request(http.MethodDelete, "/api/v1/media-assets/"+globalAsset.ID, "", 200)
	move := request(http.MethodPut, path, `{"folderId":"`+child+`"}`, 200)
	if !strings.Contains(move, `"folderId":"`+child+`"`) || !strings.Contains(move, asset.URL) {
		t.Fatalf("move: %s", move)
	}
	request(http.MethodDelete, base+"/asset-library-folders/"+child, "", 409)
	request(http.MethodPut, path, `{"folderId":"`+global+`","note":"wrong"}`, 404)
	request(http.MethodPut, "/api/v1/projects/"+other.ID+"/media-assets/"+asset.ID, `{"folderId":""}`, 404)
	request(http.MethodPut, path, `{"folderId":"missing"}`, 404)
	request(http.MethodPut, path, `{"folderId":5}`, 400)
	request(http.MethodPut, path, `{"folderId":"","rating":9}`, 400)
	list = request(http.MethodGet, base+"/media-assets", "", 200)
	if !strings.Contains(list, `"folderId":"`+child+`"`) || strings.Contains(list, "wrong") {
		t.Fatalf("rejected write: %s", list)
	}
	request(http.MethodPut, path, `{"note":"unchanged folder","folderId":null}`, 200)
	list = request(http.MethodGet, base+"/media-assets", "", 200)
	if !strings.Contains(list, `"folderId":"`+child+`"`) {
		t.Fatal(list)
	}
	cleared := request(http.MethodPut, path, `{"folderId":""}`, 200)
	if !strings.Contains(cleared, `"folderId":""`) || !strings.Contains(cleared, asset.URL) {
		t.Fatalf("root: %s", cleared)
	}
	for _, tc := range []struct {
		folder string
		status int
	}{
		{child, 200}, {global, 404}, {"missing", 404},
	} {
		body := new(bytes.Buffer)
		writer := multipart.NewWriter(body)
		if err := writer.WriteField("folderId", tc.folder); err != nil {
			t.Fatal(err)
		}
		part, err := writer.CreateFormFile("file", "folder.txt")
		if err != nil {
			t.Fatal(err)
		}
		if _, err = part.Write([]byte("stable text")); err != nil {
			t.Fatal(err)
		}
		if err = writer.Close(); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodPost, base+"/media-assets", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, req)
		if recorder.Code != tc.status {
			t.Fatalf("upload %s: %d %s", tc.folder, recorder.Code, recorder.Body)
		}
		if tc.status == 200 && !strings.Contains(recorder.Body.String(), `"folderId":"`+child+`"`) {
			t.Fatal(recorder.Body)
		}
	}
	var final struct {
		Data struct {
			Assets []json.RawMessage `json:"assets"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(request(http.MethodGet, base+"/media-assets", "", 200)), &final); err != nil || len(final.Data.Assets) != 2 {
		t.Fatalf("invalid destination persisted uploads: %#v %v", final, err)
	}
}
