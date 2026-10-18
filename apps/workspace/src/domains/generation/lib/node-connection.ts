import type { NodeDataType, NodeHandle, WorkflowEdge, WorkflowNode } from "./workflow-schema-v4";

/**
 * 检查两个数据类型是否兼容
 * 参考 Toonflow: packages/nodeScaffold/src/connection.ts
 */
export const isTypeCompatible = (sourceType: NodeDataType, targetType: NodeDataType): boolean => {
	// 通配符匹配任意类型
	if (sourceType === "*" || targetType === "*") {
		return true;
	}

	// 精确匹配
	if (sourceType === targetType) {
		return true;
	}

	// 特殊兼容规则
	if (sourceType === "IMAGE" && targetType === "MASK") {
		return true; // 图像可以作为蒙版
	}

	if (sourceType === "MASK" && targetType === "IMAGE") {
		return true; // 蒙版可以作为图像
	}

	return false;
};

/**
 * 检查端口是否支持某个数据类型
 */
export const handleSupportsType = (handle: NodeHandle, dataType: NodeDataType): boolean => {
	const types = Array.isArray(handle.dataType) ? handle.dataType : [handle.dataType];
	return types.some((t) => isTypeCompatible(dataType, t));
};

/**
 * 获取节点的所有输入端口
 */
export const getNodeInputs = (node: WorkflowNode): NodeHandle[] => {
	return node.data.handles.filter((h) => h.type === "target");
};

/**
 * 获取节点的所有输出端口
 */
export const getNodeOutputs = (node: WorkflowNode): NodeHandle[] => {
	return node.data.handles.filter((h) => h.type === "source");
};

/**
 * 查找节点的特定端口
 */
export const findHandle = (node: WorkflowNode, handleId: string): NodeHandle | undefined => {
	return node.data.handles.find((h) => h.id === handleId);
};

/**
 * 验证连接是否有效
 */
export interface ConnectionValidationResult {
	valid: boolean;
	reason?: string;
}

export const validateConnection = (
	sourceNode: WorkflowNode,
	sourceHandleId: string,
	targetNode: WorkflowNode,
	targetHandleId: string,
	existingEdges: WorkflowEdge[],
): ConnectionValidationResult => {
	// 1. 不能连接自己
	if (sourceNode.id === targetNode.id) {
		return { valid: false, reason: "节点不能连接自己" };
	}

	// 2. 查找端口
	const sourceHandle = findHandle(sourceNode, sourceHandleId);
	const targetHandle = findHandle(targetNode, targetHandleId);

	if (!sourceHandle) {
		return { valid: false, reason: `源端口不存在：${sourceHandleId}` };
	}

	if (!targetHandle) {
		return { valid: false, reason: `目标端口不存在：${targetHandleId}` };
	}

	// 3. 检查端口方向
	if (sourceHandle.type !== "source") {
		return { valid: false, reason: "源端口必须是输出端口" };
	}

	if (targetHandle.type !== "target") {
		return { valid: false, reason: "目标端口必须是输入端口" };
	}

	// 4. 检查类型兼容性
	const sourceTypes = Array.isArray(sourceHandle.dataType)
		? sourceHandle.dataType
		: [sourceHandle.dataType];
	const targetTypes = Array.isArray(targetHandle.dataType)
		? targetHandle.dataType
		: [targetHandle.dataType];

	const compatible = sourceTypes.some((st) => targetTypes.some((tt) => isTypeCompatible(st, tt)));

	if (!compatible) {
		return {
			valid: false,
			reason: `数据类型不兼容：${sourceTypes.join("|")} → ${targetTypes.join("|")}`,
		};
	}

	// 5. 检查目标端口是否已被占用（一个输入端口只能连接一条边）
	const targetPortOccupied = existingEdges.some(
		(edge) => edge.target === targetNode.id && edge.targetHandle === targetHandleId,
	);

	if (targetPortOccupied) {
		return { valid: false, reason: "目标端口已被占用" };
	}

	// 6. 检查是否会形成循环（简单版本：检查目标节点是否是源节点的上游）
	const wouldCreateCycle = detectCycle(sourceNode.id, targetNode.id, existingEdges);
	if (wouldCreateCycle) {
		return { valid: false, reason: "不能创建循环依赖" };
	}

	return { valid: true };
};

/**
 * 检测是否会形成循环
 * 检查 targetId 是否已经在 sourceId 的上游（BFS）
 */
const detectCycle = (
	sourceId: string,
	targetId: string,
	existingEdges: WorkflowEdge[],
): boolean => {
	const visited = new Set<string>();
	const queue = [sourceId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (visited.has(current)) continue;
		visited.add(current);

		// 找到当前节点的所有上游节点
		const upstreamNodes = existingEdges
			.filter((edge) => edge.target === current)
			.map((edge) => edge.source);

		for (const upstream of upstreamNodes) {
			if (upstream === targetId) {
				return true; // 发现循环
			}
			queue.push(upstream);
		}
	}

	return false;
};

/**
 * 获取连接的推荐数据类型（运行时推断）
 */
export const inferEdgeDataType = (
	sourceNode: WorkflowNode,
	sourceHandleId: string,
): NodeDataType | undefined => {
	const sourceHandle = findHandle(sourceNode, sourceHandleId);
	if (!sourceHandle) return undefined;

	// 如果节点已经有输出值，从输出值推断类型
	if (sourceNode.data.outputs?.[sourceHandleId]) {
		return sourceNode.data.outputs[sourceHandleId].dataType;
	}

	// 否则从端口定义推断
	const types = Array.isArray(sourceHandle.dataType)
		? sourceHandle.dataType
		: [sourceHandle.dataType];
	return types[0]; // 返回第一个类型
};
