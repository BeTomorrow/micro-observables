type Listener<T> = (val: T) => void;
type Unsubscriber = () => void;

export class Observable<T> {
	protected _val: T;
	protected _listeners: Listener<T>[] = [];

	constructor(val: T) {
		this._val = val;
	}

	get(): T {
		return this._val;
	}

	subscribe(listener: Listener<T>): Unsubscriber {
		this._listeners.push(listener);
		return () => {
			this._listeners = this._listeners.filter(l => l !== listener);
		};
	}

	transform<U>(transform: (val: T) => U): Observable<U> {
		return Observable.compute([this], transform);
	}

	only(predicate: (val: T) => boolean): Observable<T | undefined> {
		let prevVal: T | undefined = undefined;
		return this.transform(val => {
			if (predicate(val)) {
				prevVal = val;
				return val;
			} else {
				return prevVal;
			}
		});
	}

	static compute<U>(inputObservables: [], transform: () => U): Observable<U>;
	static compute<T1, U>(inputObservables: [Observable<T1>], transform: (val1: T1) => U): Observable<U>;
	static compute<T1, T2, U>(inputObservables: [Observable<T1>, Observable<T2>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, T4, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, T4, T5, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, T7, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>, Observable<T7>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, T7, T8, U>(inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>, Observable<T7>, Observable<T8>], transform: (val1: T1, val2: T2) => U): Observable<U>;
	static compute<U>(inputObservables: Observable<any>[], compute: (...inputVals: any[]) => U): Observable<U> {
		const computeValue = () => compute(inputObservables.map(it => it.get()));
		const outputObservable = observable(computeValue());
		const updateValue = () => { outputObservable.set(computeValue()); };
		inputObservables.forEach(it => it.subscribe(updateValue));
		return outputObservable;
	}
}

export class WritableObservable<T> extends Observable<T> {
	set(val: T) {
		if (this._val !== val) {
			this._val = val;
			this._listeners.forEach(l => l(val));
		}
	}

	update(updater: (val: T) => T) {
		this.set(updater(this.get()));
	}

	readonly(): Observable<T> {
		return this;
	}
}

export function observable<T>(val: T): WritableObservable<T> {
	return new WritableObservable(val);
}
