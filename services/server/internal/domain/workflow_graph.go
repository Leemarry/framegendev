package domain

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// WorkflowSchemaVersion4 is the canvas schema version owned by this server.
const WorkflowSchemaVersion4 = 4

// GraphViewport is the persisted canvas pan/zoom state.
type GraphViewport struct {
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Zoom float64 `json:"zoom"`
}

// GraphData is the persisted schemaVersion 4 workflow canvas.
//
// Nodes and edges stay as raw JSON so the server preserves frontend-only
// fields (port types, node config, outputs) that it does not interpret.
type GraphData struct {
	SchemaVersion int               `json:"schemaVersion"`
	Nodes         []json.RawMessage `json:"nodes"`
	Edges         []json.RawMessage `json:"edges"`
	Viewport      GraphViewport     `json:"viewport"`
}

// EmptyGraphData returns a blank schemaVersion 4 canvas.
func EmptyGraphData() GraphData {
	return GraphData{
		SchemaVersion: WorkflowSchemaVersion4,
		Nodes:         []json.RawMessage{},
		Edges:         []json.RawMessage{},
		Viewport:      GraphViewport{Zoom: 1},
	}
}

// Clone returns a copy that shares no backing slices with the receiver.
func (graph GraphData) Clone() GraphData {
	cloned := GraphData{
		SchemaVersion: graph.SchemaVersion,
		Viewport:      graph.Viewport,
	}
	if graph.Nodes != nil {
		cloned.Nodes = make([]json.RawMessage, len(graph.Nodes))
		copy(cloned.Nodes, graph.Nodes)
	}
	if graph.Edges != nil {
		cloned.Edges = make([]json.RawMessage, len(graph.Edges))
		copy(cloned.Edges, graph.Edges)
	}
	return cloned
}

// Normalize fills collection and viewport defaults without changing stored data.
func (graph *GraphData) Normalize() {
	if graph.Nodes == nil {
		graph.Nodes = []json.RawMessage{}
	}
	if graph.Edges == nil {
		graph.Edges = []json.RawMessage{}
	}
	if graph.Viewport.Zoom == 0 {
		graph.Viewport.Zoom = 1
	}
}

// NodeCount returns the number of canvas nodes.
func (graph GraphData) NodeCount() int {
	return len(graph.Nodes)
}

// ValidateGraphData rejects canvases that are not schemaVersion 4 documents.
func ValidateGraphData(graph *GraphData) error {
	if graph == nil {
		return fmt.Errorf("graphData 不能为空")
	}
	if graph.SchemaVersion != WorkflowSchemaVersion4 {
		return fmt.Errorf("graphData.schemaVersion 必须为 %d", WorkflowSchemaVersion4)
	}
	if graph.Nodes == nil {
		return fmt.Errorf("graphData.nodes 必须是数组")
	}
	if graph.Edges == nil {
		return fmt.Errorf("graphData.edges 必须是数组")
	}
	return nil
}

// GraphsEqual reports whether two canvases serialize to the same JSON.
func GraphsEqual(left GraphData, right GraphData) bool {
	left = left.Clone()
	right = right.Clone()
	left.Normalize()
	right.Normalize()

	leftJSON, err := json.Marshal(left)
	if err != nil {
		return false
	}
	rightJSON, err := json.Marshal(right)
	if err != nil {
		return false
	}
	return bytes.Equal(leftJSON, rightJSON)
}
