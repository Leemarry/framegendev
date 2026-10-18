import { AgentPanel } from "@/domains/agent/components/AgentPanel";

export function GlobalAgent({ archived = false }: { archived?: boolean }) {
	return <AgentPanel globalScope readOnly={archived} />;
}
