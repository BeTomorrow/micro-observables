import { useEffect, useMemo, useState } from "react";
import { Listener, Observable } from "./observable";

export function useObservable<T>(observable: Observable<T>, onChange?: Listener<T>): T {
	const [, forceRender] = useState({});

	useEffect(() => {
		return observable.onChange((val, prevVal) => {
			forceRender({});
			onChange && onChange(val, prevVal);
		});
	}, [observable]);

	return observable.get();
}

export function useComputedObservable<T>(compute: () => Observable<T>, deps: any[] = [], onChange?: Listener<T>): T {
	return useObservable(useMemo(compute, deps), onChange);
}
