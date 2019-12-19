import { useEffect, useMemo, useState } from "react";
import { Observable } from "./observable";

export function useObservable<T>(observable: Observable<T>): T {
	const [val, setVal] = useState(observable.get());

	useEffect(() => {
		return observable.onChange(setVal);
	}, [observable]);

	return val;
}

export function useComputedObservable<U>(inputObservables: [], transform: () => U): Observable<U>;
export function useComputedObservable<T1, U>(inputObservables: [Observable<T1>], transform: (val1: T1) => U): Observable<U>;
export function useComputedObservable<T1, T2, U>(inputObservables: [Observable<T1>, Observable<T2>], transform: (val1: T1, val2: T2) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>], transform: (val1: T1, val2: T2, val3: T3) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, T4, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>], transform: (val1: T1, val2: T2, val3: T3, val4: T4) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, T4, T5, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>], transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, T4, T5, T6, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>], transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, T4, T5, T6, T7, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>, Observable<T7>], transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6, val7: T7) => U): Observable<U>;
export function useComputedObservable<T1, T2, T3, T4, T5, T6, T7, T8, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>, Observable<T7>, Observable<T8>], transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6, val7: T7, val8: T8) => U): Observable<U>;
export function useComputedObservable<U>(inputObservables: Observable<any>[], compute: (...inputVals: any[]) => U): U {
	const observable = useMemo(() => Observable.compute(inputObservables as any, compute), inputObservables);
	return useObservable(observable);
}
