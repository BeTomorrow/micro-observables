import { useEffect, useMemo, useState } from "react";
import { Observable } from "./observable";

export function useObservable<T>(observable: Observable<T>): T {
	const [, forceRender] = useState({});

	useEffect(() => {
		return observable.onChange(() => forceRender({}));
	}, [observable]);

	return observable.get();
}

export function useComputedObservable<T>(compute: () => Observable<T>, deps: any[]): T {
	return useObservable(useMemo(compute, deps));
}
