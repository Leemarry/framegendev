package workflow

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/platform/deepseek"
)

// NodeExecutor executes workflow nodes based on their type.
type NodeExecutor struct {
	deepseekClient *deepseek.Client
	assetsBasePath string
}

// NewNodeExecutor creates a new node executor.
func NewNodeExecutor(deepseekAPIKey string, assetsBasePath string) *NodeExecutor {
	return &NodeExecutor{
		deepseekClient: deepseek.NewClient(deepseekAPIKey),
		assetsBasePath: assetsBasePath,
	}
}

// ExecuteNodeParams contains parameters for node execution.
type ExecuteNodeParams struct {
	Workflow *domain.ParsedWorkflow
	NodeID   string
	Inputs   map[string]interface{} // Resolved input values from upstream nodes
}

// NodeExecutionResult contains the result of a node execution.
type NodeExecutionResult struct {
	Outputs    map[string]interface{} // Output values for this node
	AssetPaths []string               // Paths to generated assets
	Error      error                  // Execution error if any
}

// Execute executes a workflow node.
func (e *NodeExecutor) Execute(ctx context.Context, params ExecuteNodeParams) (*NodeExecutionResult, error) {
	// Find the node in the workflow
	var node *domain.WorkflowNode
	for i := range params.Workflow.Nodes {
		if params.Workflow.Nodes[i].ID == params.NodeID {
			node = &params.Workflow.Nodes[i]
			break
		}
	}

	if node == nil {
		return nil, fmt.Errorf("node %s not found in workflow", params.NodeID)
	}

	// Execute based on node type
	switch node.Type {
	case "text-generation":
		return e.executeTextGeneration(ctx, node, params.Inputs)
	case "image-generation":
		return e.executeImageGeneration(ctx, node, params.Inputs)
	case "video-generation":
		return e.executeVideoGeneration(ctx, node, params.Inputs)
	case "text-to-speech":
		return e.executeTextToSpeech(ctx, node, params.Inputs)
	case "constant":
		return e.executeConstant(node)
	default:
		return nil, fmt.Errorf("unsupported node type: %s", node.Type)
	}
}

// executeConstant handles constant/input nodes.
func (e *NodeExecutor) executeConstant(node *domain.WorkflowNode) (*NodeExecutionResult, error) {
	outputs := make(map[string]interface{})

	// Extract default values from node configuration
	if node.Config != nil {
		if defaultVal, ok := node.Config["defaultValue"]; ok {
			outputs["value"] = defaultVal
		}
	}

	return &NodeExecutionResult{
		Outputs:    outputs,
		AssetPaths: []string{},
	}, nil
}

// executeTextGeneration handles text generation nodes using DeepSeek.
func (e *NodeExecutor) executeTextGeneration(ctx context.Context, node *domain.WorkflowNode, inputs map[string]interface{}) (*NodeExecutionResult, error) {
	// Get prompt from inputs or node config
	prompt := e.getStringInput(inputs, "prompt", "")
	if prompt == "" {
		if node.Config != nil {
			if p, ok := node.Config["prompt"].(string); ok {
				prompt = p
			}
		}
	}

	if prompt == "" {
		return nil, fmt.Errorf("text generation requires a prompt")
	}

	// Get model from config (default: deepseek-v4.1-flash)
	model := "deepseek-v4.1-flash"
	if node.Config != nil {
		if m, ok := node.Config["model"].(string); ok && m != "" {
			model = m
		}
	}

	// Call DeepSeek API
	req := deepseek.ChatCompletionRequest{
		Model: model,
		Messages: []deepseek.Message{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.7,
	}

	resp, err := e.deepseekClient.ChatCompletion(ctx, req)
	if err != nil {
		return &NodeExecutionResult{Error: err}, fmt.Errorf("calling DeepSeek API: %w", err)
	}

	// Extract generated text
	var generatedText string
	if len(resp.Choices) > 0 {
		generatedText = resp.Choices[0].Message.Content
	}

	outputs := map[string]interface{}{
		"text": generatedText,
	}

	return &NodeExecutionResult{
		Outputs:    outputs,
		AssetPaths: []string{},
	}, nil
}

// executeImageGeneration is a placeholder for image generation.
func (e *NodeExecutor) executeImageGeneration(ctx context.Context, node *domain.WorkflowNode, inputs map[string]interface{}) (*NodeExecutionResult, error) {
	// TODO: Implement actual image generation (e.g., using Stable Diffusion API)
	return &NodeExecutionResult{
		Error: fmt.Errorf("image generation not yet implemented"),
	}, fmt.Errorf("image generation not yet implemented")
}

// executeVideoGeneration is a placeholder for video generation.
func (e *NodeExecutor) executeVideoGeneration(ctx context.Context, node *domain.WorkflowNode, inputs map[string]interface{}) (*NodeExecutionResult, error) {
	// TODO: Implement actual video generation (e.g., using RunwayML or similar)
	return &NodeExecutionResult{
		Error: fmt.Errorf("video generation not yet implemented"),
	}, fmt.Errorf("video generation not yet implemented")
}

// executeTextToSpeech is a placeholder for text-to-speech.
func (e *NodeExecutor) executeTextToSpeech(ctx context.Context, node *domain.WorkflowNode, inputs map[string]interface{}) (*NodeExecutionResult, error) {
	// TODO: Implement TTS (e.g., using Azure TTS or similar)
	return &NodeExecutionResult{
		Error: fmt.Errorf("text-to-speech not yet implemented"),
	}, fmt.Errorf("text-to-speech not yet implemented")
}

// getStringInput retrieves a string input value.
func (e *NodeExecutor) getStringInput(inputs map[string]interface{}, key string, defaultValue string) string {
	if val, ok := inputs[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

// saveAsset saves an asset to disk and returns its path.
func (e *NodeExecutor) saveAsset(workflowID string, nodeID string, filename string, data []byte) (string, error) {
	// Create directory: assetsBasePath/workflowID/nodeID/
	dir := filepath.Join(e.assetsBasePath, workflowID, nodeID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("creating asset directory: %w", err)
	}

	// Write file
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("writing asset file: %w", err)
	}

	// Return relative path
	relPath, _ := filepath.Rel(e.assetsBasePath, filePath)
	return relPath, nil
}