package domain

import (
	"encoding/json"
	"fmt"
)

// WorkflowNode represents a parsed workflow node.
type WorkflowNode struct {
	ID     string                 `json:"id"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config,omitempty"`
	Data   map[string]interface{} `json:"data,omitempty"`
}

// WorkflowEdge represents a parsed workflow edge.
type WorkflowEdge struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Target       string `json:"target"`
	SourceHandle string `json:"sourceHandle,omitempty"`
	TargetHandle string `json:"targetHandle,omitempty"`
}

// ParsedWorkflow contains parsed nodes and edges for execution.
type ParsedWorkflow struct {
	ID    string
	Nodes []WorkflowNode
	Edges []WorkflowEdge
}

// ParseWorkflow parses GraphData into executable structures.
func ParseWorkflow(workflow Workflow) (*ParsedWorkflow, error) {
	parsed := &ParsedWorkflow{
		ID:    workflow.ID,
		Nodes: make([]WorkflowNode, 0, len(workflow.GraphData.Nodes)),
		Edges: make([]WorkflowEdge, 0, len(workflow.GraphData.Edges)),
	}

	// Parse nodes
	for i, rawNode := range workflow.GraphData.Nodes {
		var node WorkflowNode
		if err := json.Unmarshal(rawNode, &node); err != nil {
			return nil, fmt.Errorf("parsing node %d: %w", i, err)
		}
		parsed.Nodes = append(parsed.Nodes, node)
	}

	// Parse edges
	for i, rawEdge := range workflow.GraphData.Edges {
		var edge WorkflowEdge
		if err := json.Unmarshal(rawEdge, &edge); err != nil {
			return nil, fmt.Errorf("parsing edge %d: %w", i, err)
		}
		parsed.Edges = append(parsed.Edges, edge)
	}

	return parsed, nil
}
