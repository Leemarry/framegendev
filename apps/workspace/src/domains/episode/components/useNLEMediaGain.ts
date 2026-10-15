import { useEffect, useRef, type RefObject } from "react";

export function useNLEMediaGain(
	media: RefObject<HTMLMediaElement | null>,
	identity: string | undefined,
	volume: number,
	playing: boolean,
) {
	const graph = useRef<{
		element: HTMLMediaElement;
		context: AudioContext;
		node: GainNode;
		cleanup?: ReturnType<typeof setTimeout>;
	} | null>(null);
	useEffect(() => {
		const element = media.current;
		if (!element || !identity || !globalThis.AudioContext) return;
		if (graph.current?.cleanup) clearTimeout(graph.current.cleanup);
		if (graph.current?.element !== element) {
			if (graph.current && graph.current.context.state !== "closed")
				void graph.current.context.close();
			const context = new AudioContext();
			const node = context.createGain();
			context.createMediaElementSource(element).connect(node);
			node.connect(context.destination);
			graph.current = { element, context, node };
		}
		const current = graph.current;
		return () => {
			element.pause();
			current.cleanup = setTimeout(() => {
				if (current.context.state !== "closed") void current.context.close();
			}, 0);
		};
	}, [identity]);
	useEffect(() => {
		if (graph.current) {
			graph.current.node.gain.value = volume;
			if (playing) void graph.current.context.resume();
		} else if (media.current) media.current.volume = Math.min(1, volume);
	}, [volume, playing, identity]);
}
