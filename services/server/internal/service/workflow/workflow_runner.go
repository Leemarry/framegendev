package workflow

import (
	"context"
	"fmt"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
)

// WorkflowRunner orchestrates workflow execution.
type WorkflowRunner struct {
	executor *NodeExecutor
	tasks    *repository.WorkflowNodeTaskRepository
}

// NewWorkflowRunner creates a new workflow runner.
func NewWorkflowRunner(executor *NodeExecutor, tasks *repository.WorkflowNodeTaskRepository) *WorkflowRunner {
	return &WorkflowRunner{
		executor: executor,
		tasks:    tasks,
	}
}

// RunWorkflow executes a complete workflow.
func (r *WorkflowRunner) RunWorkflow(ctx context.Context, workflow *domain.ParsedWorkflow) error {
	// Build dependency graph
	graph, err := r.buildDependencyGraph(workflow)
	if err != nil {
		return fmt.Errorf("building dependency graph: %w", err)
	}

	// Topological sort to get execution order
	executionOrder, err := r.topologicalSort(graph)
	if err != nil {
		return fmt.Errorf("sorting execution order: %w", err)
	}

	// Execute nodes in order
	nodeOutputs := make(map[string]map[string]interface{}) // nodeID -> outputs

	for _, nodeID := range executionOrder {
		// Resolve inputs from upstream nodes
		inputs, err := r.resolveNodeInputs(workflow, nodeID, nodeOutputs)
		if err != nil {
			return fmt.Errorf("resolving inputs for node %s: %w", nodeID, err)
		}

		// Execute the node
		result, err := r.executor.Execute(ctx, ExecuteNodeParams{
			Workflow: workflow,
			NodeID:   nodeID,
			Inputs:   inputs,
		})

		if err != nil {
			// Update task status to failed
			if task, taskErr := r.tasks.GetTaskByNode(ctx, workflow.ID, nodeID); taskErr == nil {
				r.tasks.UpdateTaskStatus(ctx, task.ID, domain.WorkflowNodeTaskStatusFailed, 0, err.Error())
			}
			return fmt.Errorf("executing node %s: %w", nodeID, err)
		}

		// Store outputs for downstream nodes
		nodeOutputs[nodeID] = result.Outputs

		// Update task status to completed
		if task, taskErr := r.tasks.GetTaskByNode(ctx, workflow.ID, nodeID); taskErr == nil {
			r.tasks.UpdateTaskStatus(ctx, task.ID, domain.WorkflowNodeTaskStatusCompleted, 100.0, "")
		}
	}

	return nil
}

// buildDependencyGraph builds a dependency graph from workflow edges.
func (r *WorkflowRunner) buildDependencyGraph(workflow *domain.ParsedWorkflow) (map[string][]string, error) {
	graph := make(map[string][]string) // nodeID -> []dependentNodeIDs

	// Initialize all nodes in graph
	for _, node := range workflow.Nodes {
		graph[node.ID] = []string{}
	}

	// Add edges
	for _, edge := range workflow.Edges {
		graph[edge.Source] = append(graph[edge.Source], edge.Target)
	}

	return graph, nil
}

// topologicalSort performs a topological sort to determine execution order.
func (r *WorkflowRunner) topologicalSort(graph map[string][]string) ([]string, error) {
	// Calculate in-degree for each node
	inDegree := make(map[string]int)
	for nodeID := range graph {
		if _, exists := inDegree[nodeID]; !exists {
			inDegree[nodeID] = 0
		}
	}

	for _, targets := range graph {
		for _, target := range targets {
			inDegree[target]++
		}
	}

	// Find all nodes with in-degree 0 (no dependencies)
	queue := []string{}
	for nodeID, degree := range inDegree {
		if degree == 0 {
			queue = append(queue, nodeID)
		}
	}

	// Process nodes in order
	var result []string
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		result = append(result, current)

		// Reduce in-degree of downstream nodes
		for _, target := range graph[current] {
			inDegree[target]--
			if inDegree[target] == 0 {
				queue = append(queue, target)
			}
		}
	}

	// Check for cycles
	if len(result) != len(graph) {
		return nil, fmt.Errorf("workflow contains cycles")
	}

	return result, nil
}

// resolveNodeInputs resolves input values for a node from upstream outputs.
func (r *WorkflowRunner) resolveNodeInputs(
	workflow *domain.ParsedWorkflow,
	nodeID string,
	nodeOutputs map[string]map[string]interface{},
) (map[string]interface{}, error) {
	inputs := make(map[string]interface{})

	// Find all edges targeting this node
	for _, edge := range workflow.Edges {
		if edge.Target != nodeID {
			continue
		}

		// Get output from source node
		sourceOutputs, ok := nodeOutputs[edge.Source]
		if !ok {
			return nil, fmt.Errorf("source node %s has not been executed", edge.Source)
		}

		// Map source output to target input
		sourcePort := edge.SourceHandle
		targetPort := edge.TargetHandle

		if sourcePort == "" {
			sourcePort = "output"
		}
		if targetPort == "" {
			targetPort = "input"
		}

		if value, ok := sourceOutputs[sourcePort]; ok {
			inputs[targetPort] = value
		}
	}

	return inputs, nil
}
