import { useCallback, useRef, useSyncExternalStore } from "react";

export function useSyncExternalStoreWithSelector<TSnapshot, TSelection>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => TSnapshot,
	getServerSnapshot: (() => TSnapshot) | undefined,
	selector: (snapshot: TSnapshot) => TSelection,
	isEqual?: (a: TSelection, b: TSelection) => boolean,
) {
	const selection = useRef<TSelection | undefined>(undefined);
	const select = useCallback(() => {
		const next = selector(getSnapshot());
		if (selection.current === undefined || !isEqual?.(selection.current, next))
			selection.current = next;
		return selection.current;
	}, [getSnapshot, isEqual, selector]);
	return useSyncExternalStore(
		subscribe,
		select,
		getServerSnapshot ? () => selector(getServerSnapshot()) : undefined,
	);
}

export default { useSyncExternalStoreWithSelector };
