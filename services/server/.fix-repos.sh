#!/bin/bash
# Fix repository method receivers to use pointers

FILES=(
  "internal/repository/workflow_output_binding_repo.go"
  "internal/repository/workflow_asset_repo.go"
  "internal/repository/workflow_node_task_repo.go"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file"
  sed -i 's/^func (repo WorkflowOutputBindingRepository)/func (repo *WorkflowOutputBindingRepository)/g' "$file"
  sed -i 's/^func (repo WorkflowAssetRepository)/func (repo *WorkflowAssetRepository)/g' "$file"
  sed -i 's/^func (repo WorkflowNodeTaskRepository)/func (repo *WorkflowNodeTaskRepository)/g' "$file"
done

echo "Done"
