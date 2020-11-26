import { batchedUpdater } from "./batchedUpdater";

const capturedInputFrames: BaseObservable<any>[][] = [];
let shouldCaptureNextInput = false;

let batchedObservables: BaseObservable<any>[] = [];
let batchDepth = 0;

export type Listener<T> = (val: T, prevVal: T) => void;
export type Unsubscriber = () => void;

export class BaseObservable<T> {
  private _val: T;
  private _inputs: BaseObservable<any>[] = [];
  private _outputs: BaseObservable<any>[] = [];
  private _listeners: Listener<T>[] = [];
  private _attachedToInputs = false;
  private _dirty = false;

  constructor(val: T) {
    this._val = val;
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
    const shouldEvaluate = !this._attachedToInputs || this._dirty;
    return shouldEvaluate ? this._evaluate() : this._val;
  }

  protected _evaluate(): T {
    return this._val;
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

        // Iterate in reverse order as _addOutputsToBatch add them in reverse topological order
        for (let i = observablesToUpdate.length - 1; i >= 0; i--) {
          const observable = observablesToUpdate[i];
          observable._dirty = false;
          observable._set(observable._evaluate());
        }
      }
    }
  }

  protected _set(val: T) {
    if (this._val !== val) {
      const prevVal = this._val;
      this._val = val;

      if (batchDepth > 0) {
        this._addOutputsToBatch();
      }

      for (const listener of this._listeners.slice()) {
        listener(val, prevVal!);
      }
    }
  }

  private _addOutputsToBatch() {
    // Add outputs in reverse topological order (reverse for performance reasons as push() is faster than unshift()).
    // Ensure that each observable is added only once using the dirty flag
    for (const output of this._outputs) {
      if (!output._dirty) {
        output._dirty = true;
        output._addOutputsToBatch();
        batchedObservables.push(output);
      }
    }
  }

  onChange(listener: Listener<T>): Unsubscriber {
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
      // Refresh it so that onChange() will be called with the correct prevValue the next time an input changes.
      this._val = this._evaluate();

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
    }
  }

  private _attachToInput(input: BaseObservable<any>) {
    input._outputs.push(this);
  }

  private _detachFromInput(input: BaseObservable<any>) {
    input._outputs.splice(input._outputs.indexOf(this), 1);
  }
}
