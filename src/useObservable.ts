import { useEffect, useMemo, useState } from "react";
import { ReadableObservable } from "./observable";

export function useObservable<T>(observable: ReadableObservable<T>): T {
	const [val, setVal] = useState(observable.get());

	useEffect(() => {
		observable.onChange.add(setVal);
		return () => observable.onChange.remove(setVal);
	}, [observable]);

	return val;
}

export function useComputedObservable<T>(factory: () => ReadableObservable<T>, dependencies?: any[]): T {
	const observable = useMemo(factory, dependencies);
	return useObservable(observable);
}