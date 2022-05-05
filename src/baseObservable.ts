import { batchedUpdater } from "./batchedUpdater";
import { Plugin } from "./plugin";
import { PluginManager } from "./pluginManager";

const UNSET = Symbol();

const plugins = new PluginManager();

const capturedInputFrames: BaseObservable<any>[][] = [];
let shouldCaptureNextInput = false;

let batchedObservables: BaseObservable<any>[] = [];
let batchDepth = 0;

export type Listener<T> = (val: T, prevVal: T) => void;
export type Unsubscriber = () => void;
export type Options = { [key: string]: any };

export class BaseObservable<T> {
  private _val: T;
  private _prevVal: T | typeof UNSET = UNSET;
  private _options: Options;
  private _inputs: BaseObservable<any>[] = [];
  private _outputs: BaseObservable<any>[] = [];
  private _listeners: Listener<T>[] = [];
  private _attachedToInputs = false;

  constructor(val: T, options: Options = {}) {
    this._val = val;
    this._options = options;
    plugins.onCreate(this, val);
  }

  get(): T {
    const capturedInputs = capturedInputFrames[capturedInputFrames.length - 1];
    if (capturedInputs && shouldCaptureNextInput) {
      try {
        shouldCaptureNextInput = false;
        capturedInputs.push(this);
        return this._get();
      } finally {
        shouldCaptureNextInput = true;
      }
    } else {
      return this._get();
    }
  }

  protected _get(): T {
    const shouldEvaluate = !this._attachedToInputs || this._prevVal !== UNSET;
    return shouldEvaluate ? this._evaluate() : this._val;
  }

  protected _evaluate(): T {
    return this._val;
  }

  protected _set(val: T) {
    if (this._val !== val) {
      this._addToBatchRecursively();
      this._val = val;
    }
  }

  subscribe(listener: Listener<T>): Unsubscriber {
    this._listeners.push(listener);
    this._attachToInputs();

    let listenerRemoved = false;
    return () => {
      if (!listenerRemoved) {
        listenerRemoved = true;
        this._listeners.splice(this._listeners.indexOf(listener), 1);
        this._detachFromInputs();
      }
    };
  }

  /**
   * @deprecated Use observable.subscribe() instead
   */
  onChange = this.subscribe;

  protected onBecomeObserved() {
    // Called when the first listener subscribes to the observable or to one of its outputs
  }

  protected onBecomeUnobserved() {
    // Called when the last listener unsubscribes from the observable and from all of its outputs
  }

  getInputs(): BaseObservable<any>[] {
    return this._inputs;
  }

  getOptions<O extends Options = Options>(): O {
    return this._options as O;
  }

  withOptions<O extends Options = Options>(options: Partial<O>): this {
    this._options = { ...this._options, ...options };
    return this;
  }

  protected static _captureInputs<T>(block: () => T): BaseObservable<any>[] {
    try {
      const capturedInputs = [];
      capturedInputFrames.push(capturedInputs);
      shouldCaptureNextInput = true;
      block();
      return capturedInputs;
    } finally {
      capturedInputFrames.pop();
      shouldCaptureNextInput = false;
    }
  }

  protected _addInput(input: BaseObservable<any>) {
    this._inputs.push(input);
    if (this._attachedToInputs) {
      this._attachToInput(input);
    }
  }

  protected _removeInput(input: BaseObservable<any>) {
    this._inputs.splice(this._inputs.indexOf(input), 1);
    if (this._attachedToInputs) {
      this._detachFromInput(input);
    }
  }

  private _shouldAttachToInputs(): boolean {
    // Only attach to inputs when at least one listener is subscribed to the observable or to one of its outputs.
    // This is done to avoid unused observables being references by their inputs, preventing garbage-collection.
    return this._listeners.length > 0 || this._outputs.length > 0;
  }

  private _attachToInputs() {
    if (!this._attachedToInputs && this._shouldAttachToInputs()) {
      this._attachedToInputs = true;

      // Since the observable was not attached to its inputs, its value may be outdated.
      // Refresh it so that listeners will be called with the correct prevValue the next time an input changes.
      this._val = this._evaluate();

      this.onBecomeObserved();
      plugins.onBecomeObserved(this);

      for (const input of this._inputs) {
        this._attachToInput(input);
        input._attachToInputs();
      }
    }
  }

  private _detachFromInputs() {
    if (this._attachedToInputs && !this._shouldAttachToInputs()) {
      this._attachedToInputs = false;
      for (const input of this._inputs) {
        this._detachFromInput(input);
        input._detachFromInputs();
      }

      this.onBecomeUnobserved();
      plugins.onBecomeUnobserved(this);
    }
  }

  private _attachToInput(input: BaseObservable<any>) {
    input._outputs.push(this);
    plugins.onAttach(this, input);
  }

  private _detachFromInput(input: BaseObservable<any>) {
    input._outputs.splice(input._outputs.indexOf(this), 1);
    plugins.onDetach(this, input);
  }

  private _addToBatchRecursively() {
    if (this._prevVal === UNSET) {
      this._prevVal = this._val;

      // Add the observable and its outputs in reverse topological order
      for (const output of this._outputs) {
        output._addToBatchRecursively();
      }
      batchedObservables.push(this);
    }
  }

  protected static _batch(block: () => void) {
    try {
      batchDepth++;
      if (batchDepth === 1 && batchedUpdater) {
        batchedUpdater(block);
      } else {
        block();
      }
    } finally {
      batchDepth--;
      if (batchDepth === 0) {
        const observablesToUpdate = batchedObservables;
        batchedObservables = [];

        // Iterate in reverse order as _addToBatchRecursively() adds them in reverse topological order
        for (let i = observablesToUpdate.length - 1; i >= 0; i--) {
          const observable = observablesToUpdate[i];
          const prevVal = observable._prevVal;
          observable._prevVal = UNSET;
          observable._val = observable._evaluate();
          const val = observable._val;

          if (val !== prevVal) {
            for (const listener of observable._listeners.slice()) {
              listener(val, prevVal);
            }
            plugins.onChange(observable, val, prevVal);
          }
        }
      }
    }
  }

  protected static _use(plugin: Plugin) {
    plugins.use(plugin);
  }
}
