import { useEffect, useState } from "react";
import { ReadableObservable } from "./observable";

export function useObservable<T>(observable: ReadableObservable<T>): T {
	const [val, setVal] = useState(observable.get());

	useEffect(() => {
		observable.onChange.add(setVal);
		return () => observable.onChange.remove(setVal);
	}, [observable]);

	return val;
}
