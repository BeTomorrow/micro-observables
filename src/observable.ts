import { BaseObservable, Options } from "./baseObservable";
import { memoize } from "./memoize";
import { Plugin } from "./plugin";

export type ObservableValue<T> = T extends Observable<infer U> ? U : never;
export type ObservableValues<T> = { [K in keyof T]: ObservableValue<T[K]> };

export function observable<T>(val: T | Observable<T>, options?: Options): WritableObservable<T> {
  return new WritableObservable(val, options);
}

export function derived<T>(derive: () => T): Observable<T> {
  return Observable.compute(derive);
}

export class Observable<T> extends BaseObservable<T> {
  protected _valInput: Observable<T> | undefined;

  constructor(val: T | Observable<T>, options?: Options) {
    super(val instanceof Observable ? val.get() : val, options);
    this._updateValInput(val);
  }

  protected _evaluate(): T {
    return this._valInput ? this._valInput.get() : super._evaluate();
  }

  select<U>(selector: (val: T) => U | Observable<U>): Observable<U> {
    return new DerivedObservable([this], ([val]) => selector(val));
  }

  /**
   * @deprecated Use observable.select() instead
   */
  transform = this.select;

  onlyIf(predicate: (val: T) => boolean): Observable<T | undefined> {
    let filteredVal: T | undefined = undefined;
    return this.select(val => {
      if (predicate(val)) {
        filteredVal = val;
      }
      return filteredVal;
    });
  }

  default(defaultVal: NonNullable<T> | Observable<NonNullable<T>>): Observable<NonNullable<T>> {
    return this.select(val => val ?? defaultVal);
  }

  as<U extends T>(): Observable<U> {
    return (this as unknown) as Observable<U>;
  }

  static select<T extends readonly Observable<any>[], U>(
    observables: [...T],
    selector: (...vals: ObservableValues<T>) => U
  ): Observable<U> {
    return new DerivedObservable(observables, vals => selector(...vals));
  }

  /**
   * @deprecated Use Observable.select() instead
   */
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
      const unsubscribe = this.subscribe(val => {
        resolve(val);
        unsubscribe();
      });
    });
  }

  static batch(block: () => void) {
    BaseObservable._batch(block);
  }

  static use(plugin: Plugin) {
    BaseObservable._use(plugin);
  }

  protected _updateValInput(val: T | Observable<T>) {
    if (this._valInput !== val) {
      if (this._valInput) {
        this._removeInput(this._valInput);
        this._valInput = undefined;
      }
      if (val instanceof Observable) {
        this._addInput(val);
        this._valInput = val;
      }
    }
  }
}

export class WritableObservable<T> extends Observable<T> {
  set(val: T | Observable<T>) {
    this._updateValInput(val);
    Observable.batch(() => this._set(val instanceof Observable ? val.get() : val));
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
    // No need to initialize it as it will be evaluated the first time get() or subscribe() is called
    super(undefined as any);
    this._compute = memoize(compute);
    this._computeInputs = computeInputs;
    for (const input of computeInputs) {
      this._addInput(input);
    }
  }

  _evaluate(): T {
    const computed = this._compute(this._computeInputs.map(input => input.get()) as ObservableValues<U>);
    this._updateValInput(computed);
    return computed instanceof Observable ? computed.get() : computed;
  }
}

class ComputedObservable<T> extends Observable<T> {
  private _compute: () => T;
  private _currentInputs = new Set<BaseObservable<any>>();

  constructor(compute: () => T) {
    // No need to initialize it as it will be evaluated the first time get() or subscribe() is called
    super(undefined as any);
    this._compute = compute;
  }

  _evaluate(): T {
    let value!: T;

    const inputs = new Set(BaseObservable._captureInputs(() => (value = this._compute())));
    inputs.forEach(input => {
      if (!this._currentInputs.has(input)) {
        this._addInput(input);
      } else {
        this._currentInputs.delete(input);
      }
    });
    this._currentInputs.forEach(input => this._removeInput(input));
    this._currentInputs = inputs;

    return value;
  }
}
