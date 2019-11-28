import { ReadableSignal, Signal } from "micro-signals";

export interface ReadableObservable<T> {
	onChange: ReadableSignal<T>;
	get(): T;
	map<U>(transform: (val: T) => U): ReadableObservable<U>;
	filter(predicate: (val: T) => boolean): ReadableObservable<T | undefined>;
}

abstract class BaseObservable<T> implements ReadableObservable<T> {
	protected _val: T;

	constructor(val: T) {
		this._val = val;
	}

	abstract onChange: ReadableSignal<T>;

	get(): T {
		return this._val;
	}

	map<U>(transform: (val: T) => U): ReadableObservable<U> {
		return new MappedObservable(this, transform);
	}

	filter(predicate: (val: T) => boolean): ReadableObservable<T | undefined> {
		return new FilteredObservable(this, predicate);
	}
}

export class Observable<T> extends BaseObservable<T> {
	private _onChange = new Signal<T>();

	get onChange(): ReadableSignal<T> {
		return this._onChange;
	}

	set(val: T) {
		if (this._val !== val) {
			this._val = val;
			this._onChange.dispatch(val);
		}
	}

	update(updater: (val: T) => T) {
		this.set(updater(this.get()));
	}

	readonly(): ReadableObservable<T> {
		return this;
	}
}

class MappedObservable<B, T> extends BaseObservable<T> {
	readonly onChange: ReadableSignal<T>;

	constructor(baseObservable: ReadableObservable<B>, transform: (val: B) => T) {
		super(transform(baseObservable.get()));
		this.onChange = baseObservable.onChange.map(transform);
		this.onChange.add(val => {
			this._val = val;
		});
	}
}

class FilteredObservable<T> extends BaseObservable<T | undefined> {
	readonly onChange: ReadableSignal<T | undefined>;

	constructor(baseObservable: ReadableObservable<T>, predicate: (val: T) => boolean) {
		super(predicate(baseObservable.get()) ? baseObservable.get() : undefined);
		this.onChange = baseObservable.onChange.filter(predicate);
		this.onChange.add(val => {
			this._val = val;
		});
	}
}
