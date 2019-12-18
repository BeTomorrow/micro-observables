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

	protected _set(val: T) {
		if (this._val !== val) {
			this._val = val;
			this._listeners.forEach(l => l(val));
		}
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

	onlyIf(predicate: (val: T) => boolean): Observable<T | undefined> {
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
		const computeValue = () => compute(...inputObservables.map(it => it.get()));
		return new ComputedObservable(inputObservables, computeValue);
	}
}

export class WritableObservable<T> extends Observable<T> {
	set(val: T) {
		this._set(val);
	}

	update(updater: (val: T) => T) {
		this.set(updater(this.get()));
	}

	readOnly(): Observable<T> {
		return this;
	}
}

class ComputedObservable<T> extends Observable<T> {
	private _unsubscribeFromInputObservables: Unsubscriber[] = [];

	constructor(private inputObservables: Observable<any>[], private computeValue: () => T) {
		super(computeValue());
	}

	get(): T {
		// If no listeners are attached, this._val can be outdated so let's refresh it
		if (this._listeners.length === 0) {
			this._val = this.computeValue();
		};
		return this._val;
	}

	subscribe(listener: Listener<T>): Unsubscriber {
		const unsubscribe = super.subscribe(listener);
		this.onListenersChanged();
		return () => { unsubscribe(); this.onListenersChanged(); }
	}

	// Only subscribe to input-observables if there are listeners attached to the computed observable.
	// This is done to prevent memory-leaks that could occur when creating many computed observables
	// that would be referenced by the input-observables even when they are no longer used
	private onListenersChanged() {
		if (this._listeners.length === 1) {
			const updateValue = () => this._set(this.computeValue());
			this._unsubscribeFromInputObservables = this.inputObservables.map(it => it.subscribe(updateValue));
		} else if (this._listeners.length === 0) {
			this._unsubscribeFromInputObservables.forEach(it => it());
			this._unsubscribeFromInputObservables = [];
		}
	}
}


export function observable<T>(val: T): WritableObservable<T> {
	return new WritableObservable(val);
}
