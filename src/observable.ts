import { BaseObservable } from "./baseObservable";
import { getBatchedUpdater } from "./batchedUpdater";

export type ObservableValue<T> = T extends Observable<infer U> ? U : never;
export type ObservableValues<T> = { [K in keyof T]: ObservableValue<T[K]> };

export class Observable<T> extends BaseObservable<T> {
	transform<U>(transform: (val: T) => U | Observable<U>): Observable<U> {
		return new DerivedObservable([this], ([val]) => transform(val));
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

	default(defaultVal: NonNullable<T> | Observable<NonNullable<T>>): Observable<NonNullable<T>> {
		return this.transform(val => val ?? defaultVal);
	}

	as<U extends T>(): Observable<U> {
		return (this as unknown) as Observable<U>;
	}

	static from<T extends Observable<any>[]>(...observables: T): Observable<ObservableValues<T>> {
		return new DerivedObservable(observables, values => values);
	}

	static merge<T>(observables: Observable<T>[]): Observable<T[]> {
		return new DerivedObservable(observables, values => values);
	}

	static latest<T extends Observable<any>[]>(...observables: T): Observable<ObservableValue<T[number]>> {
		let prevValues: T[] | undefined;
		return new DerivedObservable(observables, values => {
			const val = !prevValues ? values[0] : values.find((it, index) => it !== prevValues![index])!;
			prevValues = values;
			return val;
		});
	}

	static compute<U>(compute: () => U): Observable<U> {
		return new ComputedObservable(compute);
	}

	static fromPromise<T, E = undefined>(
		promise: Promise<T>,
		onError?: (error: any) => E
	): Observable<T | E | undefined> {
		const obs = observable<T | E | undefined>(undefined);
		promise.then(
			val => obs.set(val),
			e => onError && obs.set(onError(e))
		);
		return obs;
	}

	toPromise(): Promise<T> {
		return new Promise(resolve => {
			const unsubscriber = this.onChange(val => {
				resolve(val);
				unsubscriber();
			});
		});
	}

	static batch(block: () => void) {
		const batchedUpdater = getBatchedUpdater();
		batchedUpdater(block);
	}
}

export class WritableObservable<T> extends Observable<T> {
	set(val: T | Observable<T>) {
		Observable.batch(() => this._set(val));
	}

	update(updater: (val: T) => T | Observable<T>) {
		this.set(updater(this.get()));
	}

	readOnly(): Observable<T> {
		return this;
	}
}

class DerivedObservable<T, U extends Observable<any>[]> extends Observable<T> {
	private _compute: (vals: ObservableValues<U>) => T | Observable<T>;
	private _computeInputs: U;

	constructor(computeInputs: U, compute: (vals: ObservableValues<U>) => T | Observable<T>) {
		const memoizedCompute = memoize(compute);
		super(memoizedCompute(computeInputs.map(input => input.get()) as ObservableValues<U>));
		this._compute = memoizedCompute;
		this._computeInputs = computeInputs;
		for (const input of computeInputs) {
			this.addInput(input);
		}
	}

	_get(): T | BaseObservable<T> {
		if (this.shouldEvaluate()) {
			return this._compute(this._computeInputs.map(input => input.get()) as ObservableValues<U>);
		} else {
			return super._get();
		}
	}
}

class ComputedObservable<T> extends Observable<T> {
	private _compute: () => T;

	constructor(compute: () => T) {
		// There is no need to initialize a ComputedObservable with a proper value as it is re-evaluated each time get() is called.
		// It is also evaluated when its first listener is added to ensure that prevValue is correct when invoking listeners
		super(undefined as any);
		this._compute = compute;
	}

	_get(): T {
		const { inputs, value } = BaseObservable.evaluateAndCaptureInputs(this._compute);
		this.setInputs(inputs);
		return value;
	}
}

export function observable<T>(val: T | Observable<T>): WritableObservable<T> {
	return new WritableObservable(val);
}

function memoize<T extends any[], U>(func: (args: T) => U): (args: T) => U {
	let lastArgs: T | undefined;
	let lastResult!: U;

	return (args: T) => {
		let argsHaveChanged = false;
		if (!lastArgs || args.length !== lastArgs.length) {
			argsHaveChanged = true;
		} else {
			for (let i = 0; i < args.length; i++) {
				if (args[i] !== lastArgs[i]) {
					argsHaveChanged = true;
					break;
				}
			}
		}

		if (argsHaveChanged) {
			lastArgs = args;
			lastResult = func(args);
		}

		return lastResult;
	};
}
