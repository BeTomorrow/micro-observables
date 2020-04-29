import memoizeOne from "memoize-one";

export type Listener<T> = (val: T, prevVal: T) => void;
export type Unsubscriber = () => void;

export type ObservableValue<T> = T extends Observable<infer U> ? U : T;
export type ObservableValues<T> = { [K in keyof T]: ObservableValue<T[K]> };

export class Observable<T> {
	private _val: T | Observable<T>;
	private _valUnsubscriber: Unsubscriber | undefined;
	private _listeners: Listener<T>[] = [];

	constructor(val: T | Observable<T>) {
		this._val = val;
	}

	get(): T {
		return this._val instanceof Observable ? this._val.get() : this._val;
	}

	protected _set(val: T | Observable<T>) {
		if (this._val !== val) {
			this.unlistenToValueChanges();

			const prevVal = this.get();
			this._val = val;
			const newVal = this.get();

			this.listenToValueChanges();

			if (newVal !== prevVal) {
				this.notifyListeners(newVal, prevVal);
			}
		}
	}

	onChange(listener: Listener<T>): Unsubscriber {
		this._listeners.push(listener);
		this.listenToValueChanges();

		let listenerRemoved = false;
		return () => {
			if (!listenerRemoved) {
				listenerRemoved = true;
				this._listeners.splice(this._listeners.indexOf(listener), 1);
				if (this._listeners.length === 0) {
					this.unlistenToValueChanges();
				}
			}
		};
	}

	transform<U>(transform: (val: T) => U | Observable<U>): Observable<U> {
		return new ComputedObservable([this], ([val]) => transform(val));
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

	as<U extends T>(): Observable<U> {
		return (this as unknown) as Observable<U>;
	}

	static from<T extends Observable<any>[]>(...observables: T): Observable<ObservableValues<T>> {
		return new ComputedObservable(observables, values => values);
	}

	static merge<T>(observables: Observable<T>[]): Observable<T[]> {
		return new ComputedObservable(observables, values => values);
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

	protected hasListeners(): boolean {
		return this._listeners.length > 0;
	}

	private notifyListeners(val: T, prevVal: T): void {
		this._listeners.slice().forEach(it => it(val, prevVal));
	}

	private listenToValueChanges(): void {
		if (!this.hasListeners()) {
			// TODO: Explain
			return;
		}
		if (!this._valUnsubscriber && this._val instanceof Observable) {
			this._valUnsubscriber = this._val.onChange((v, p) => this.notifyListeners(v, p));
		}
	}

	private unlistenToValueChanges(): void {
		if (this._valUnsubscriber) {
			this._valUnsubscriber();
			this._valUnsubscriber = undefined;
		}
	}
}

export class WritableObservable<T> extends Observable<T> {
	set(val: T | Observable<T>) {
		this._set(val);
	}

	update(updater: (val: T) => T | Observable<T>) {
		this.set(updater(this.get()));
	}

	readOnly(): Observable<T> {
		return this;
	}
}

class ComputedObservable<T, U extends Observable<any>[]> extends Observable<T> {
	private _inputs: U;
	private _inputUnsubscribers: Unsubscriber[] = [];
	private _compute: (vals: ObservableValues<U>) => T | Observable<T>;

	constructor(inputs: U, compute: (vals: ObservableValues<U>) => T | Observable<T>) {
		super((undefined as unknown) as T);
		this._inputs = inputs;
		this._compute = memoizeOne(compute);
		this.updateValue();
	}

	get(): T {
		if (!this.hasListeners()) {
			const val = this.computeValue();
			return val instanceof Observable ? val.get() : val;
		} else {
			return super.get();
		}
	}

	onChange(listener: Listener<T>): Unsubscriber {
		if (!this.hasListeners()) {
			this.updateValue();
			this.listenToInputChanges();
		}

		const unsubscribe = super.onChange(listener);

		return () => {
			unsubscribe();
			if (!this.hasListeners()) {
				this.unlistenToInputChanges();
			}
		};
	}

	protected listenToInputChanges(): void {
		this._inputUnsubscribers = this._inputs.map(it => it.onChange(() => this.updateValue()));
	}

	protected unlistenToInputChanges(): void {
		this._inputUnsubscribers.forEach(it => it());
		this._inputUnsubscribers = [];
	}

	private computeValue(): T | Observable<T> {
		return this._compute(this._inputs.map(it => it.get()) as ObservableValues<U>);
	}

	private updateValue(): void {
		this._set(this.computeValue());
	}
}

export function observable<T>(val: T | Observable<T>): WritableObservable<T> {
	return new WritableObservable(val);
}
