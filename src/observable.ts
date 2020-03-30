import memoizeOne from "memoize-one";

export type Listener<T> = (val: T, prevVal: T) => void;
export type Unsubscriber = () => void;

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
			const prevVal = this._val;
			this._val = val;
			this._listeners.forEach(l => l(val, prevVal));
		}
	}

	onChange(listener: Listener<T>): Unsubscriber {
		this._listeners.push(listener);

		let listenerRemoved = false;
		return () => {
			if (!listenerRemoved) {
				listenerRemoved = true;
				this._listeners.splice(this._listeners.indexOf(listener), 1);
			}
		};
	}

	transform<U>(transform: (val: T) => U): Observable<U> {
		return Observable.compute([this], transform);
	}

	onlyIf(predicate: (val: T) => boolean): Observable<T | undefined> {
		let filteredVal: T | undefined = undefined;
		return this.transform(val => {
			if (predicate(val)) {
				filteredVal = val;
			}
			return filteredVal;
		});
	}

	static compute<U>(inputObservables: [], transform: () => U): Observable<U>;
	static compute<T1, U>(inputObservables: [Observable<T1>], transform: (val1: T1) => U): Observable<U>;
	static compute<T1, T2, U>(
		inputObservables: [Observable<T1>, Observable<T2>],
		transform: (val1: T1, val2: T2) => U
	): Observable<U>;
	static compute<T1, T2, T3, U>(
		inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>],
		transform: (val1: T1, val2: T2, val3: T3) => U
	): Observable<U>;
	static compute<T1, T2, T3, T4, U>(
		inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>],
		transform: (val1: T1, val2: T2, val3: T3, val4: T4) => U
	): Observable<U>;
	static compute<T1, T2, T3, T4, T5, U>(
		inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>],
		transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5) => U
	): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, U>(
		inputObservables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>, Observable<T5>, Observable<T6>],
		transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6) => U
	): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, T7, U>(
		inputObservables: [
			Observable<T1>,
			Observable<T2>,
			Observable<T3>,
			Observable<T4>,
			Observable<T5>,
			Observable<T6>,
			Observable<T7>
		],
		transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6, val7: T7) => U
	): Observable<U>;
	static compute<T1, T2, T3, T4, T5, T6, T7, T8, U>(
		inputObservables: [
			Observable<T1>,
			Observable<T2>,
			Observable<T3>,
			Observable<T4>,
			Observable<T5>,
			Observable<T6>,
			Observable<T7>,
			Observable<T8>
		],
		transform: (val1: T1, val2: T2, val3: T3, val4: T4, val5: T5, val6: T6, val7: T7, val8: T8) => U
	): Observable<U>;
	static compute<U>(inputObservables: Observable<any>[], compute: (...inputVals: any[]) => U): Observable<U> {
		const memoizedCompute = memoizeOne(compute);
		const computeValue = () => memoizedCompute(...inputObservables.map(it => it.get()));
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
		// If no listeners are attached, this._val is probably outdated so let's compute it
		return this._listeners.length > 0 ? this._val : this.computeValue();
	}

	onChange(listener: Listener<T>): Unsubscriber {
		const unsubscribe = super.onChange(listener);
		this.onListenersChanged();
		return () => {
			unsubscribe();
			this.onListenersChanged();
		};
	}

	// Only subscribe to input-observables if there are listeners attached to the computed observable.
	// This is done to prevent memory-leaks that could occur when creating many computed observables
	// that would still be referenced by the input-observables even when they are no longer used
	private onListenersChanged() {
		if (this._listeners.length === 1) {
			this._val = this.computeValue();
			const updateValue = () => this._set(this.computeValue());
			this._unsubscribeFromInputObservables = this.inputObservables.map(it => it.onChange(updateValue));
		} else if (this._listeners.length === 0) {
			this._unsubscribeFromInputObservables.forEach(unsubscribe => unsubscribe());
			this._unsubscribeFromInputObservables = [];
		}
	}
}

export function observable<T>(val: T): WritableObservable<T> {
	return new WritableObservable(val);
}
