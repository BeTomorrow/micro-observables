export type Listener<T> = (val: T, prevVal: T) => void;
export type Unsubscriber = () => void;

const capturedInputFrames: Set<BaseObservable<any>>[] = [];
let shouldCaptureNextInput = false;

export class BaseObservable<T> {
	private _val!: T;
	private _valInput: BaseObservable<T> | undefined;
	private _inputs: BaseObservable<any>[] = [];
	private _outputs: BaseObservable<any>[] = [];
	private _listeners: Listener<T>[] = [];
	private _attachedToInputs = false;
	private _dirty = false;

	constructor(val: T | BaseObservable<T>) {
		this._setVal(val);
	}

	get(): T {
		const capturedInputs = capturedInputFrames[capturedInputFrames.length - 1];
		if (!capturedInputs || !shouldCaptureNextInput) {
			const val = this._get();
			return val instanceof BaseObservable ? val.get() : val;
		} else {
			capturedInputs.add(this);
			try {
				shouldCaptureNextInput = false;
				const val = this._get();
				return val instanceof BaseObservable ? val.get() : val;
			} finally {
				shouldCaptureNextInput = true;
			}
		}
	}

	protected _get(): T | BaseObservable<T> {
		return this._valInput ? this._valInput : this._val;
	}

	protected _set(val: T | BaseObservable<T>) {
		const change = this._setVal(val);
		if (change) {
			// Invalidate outputs before notifying listeners.
			// This way, if get() is called on an output from a listener, it'll be already up-to-date
			this.invalidateOutputs();

			// Notify listeners
			for (const listener of this._listeners.slice()) {
				listener(change.newVal, change.prevVal);
			}

			// Refresh outputs that may have changed
			for (const output of this._outputs) {
				output._set(output._get());
			}
		}
	}

	protected _setVal(val: T | BaseObservable<T>): { newVal: T; prevVal: T } | undefined {
		// If the value is an observable, add it as an input.
		// If the previous value was an observable, remove it from the inputs
		const valInput = val instanceof BaseObservable ? val : undefined;
		if (this._valInput !== valInput) {
			if (this._valInput) {
				this.removeInput(this._valInput);
			}
			this._valInput = valInput;
			if (valInput) {
				this.addInput(valInput);
			}
		}

		const newVal = valInput ? valInput.get() : (val as T);
		if (this._val !== newVal) {
			const prevVal = this._val;
			this._val = newVal;
			this._dirty = false;
			return { newVal, prevVal };
		} else {
			return undefined;
		}
	}

	onChange(listener: Listener<T>): Unsubscriber {
		this._listeners.push(listener);
		this.attachToInputs();

		let listenerRemoved = false;
		return () => {
			if (!listenerRemoved) {
				listenerRemoved = true;
				this._listeners.splice(this._listeners.indexOf(listener), 1);
				this.detachFromInputs();
			}
		};
	}

	protected shouldEvaluate(): boolean {
		return !this._attachedToInputs || this._dirty;
	}

	protected static captureInputs<T>(block: () => T): Set<BaseObservable<any>> {
		try {
			capturedInputFrames.push(new Set());
			shouldCaptureNextInput = true;
			block();
			return capturedInputFrames[capturedInputFrames.length - 1];
		} finally {
			capturedInputFrames.pop();
			shouldCaptureNextInput = false;
		}
	}

	protected setInputs(inputs: Set<BaseObservable<any>>) {
		const addedInputs = inputs;
		const removedInputs: BaseObservable<any>[] = [];

		for (const oldInput of this._inputs) {
			if (inputs.has(oldInput)) {
				addedInputs.delete(oldInput);
			} else {
				removedInputs.push(oldInput);
			}
		}

		removedInputs.forEach(input => this.removeInput(input));
		addedInputs.forEach(input => this.addInput(input));
	}

	protected addInput(input: BaseObservable<any>) {
		this._inputs.push(input);
		if (this._attachedToInputs) {
			this.attachToInput(input);
		}
	}

	protected removeInput(input: BaseObservable<any>) {
		this._inputs.splice(this._inputs.indexOf(input), 1);
		if (this._attachedToInputs) {
			this.detachFromInput(input);
		}
	}

	protected isAttachedToInputs(): boolean {
		return this._attachedToInputs;
	}

	private shouldAttachToInputs(): boolean {
		// Only attach to inputs when at least one listener is subscribed to the observable or to one of its outputs.
		// This is done to avoid unused observables being references by their inputs, preventing garbage-collection.
		return this._listeners.length > 0 || this._outputs.length > 0;
	}

	private attachToInputs() {
		if (!this._attachedToInputs && this.shouldAttachToInputs()) {
			this._attachedToInputs = true;

			// Since the observable was not attached to its inputs, its value may be outdated.
			// Refresh it so that onChange() will be called with the correct prevValue the next time an input changes.
			this._dirty = true;
			this._setVal(this._get());

			for (const input of this._inputs) {
				this.attachToInput(input);
				input.attachToInputs();
			}
		}
	}

	private detachFromInputs() {
		if (this._attachedToInputs && !this.shouldAttachToInputs()) {
			this._attachedToInputs = false;
			for (const input of this._inputs) {
				this.detachFromInput(input);
				input.detachFromInputs();
			}
		}
	}

	private attachToInput(input: BaseObservable<any>) {
		input._outputs.push(this);
		if (input._dirty) {
			this.invalidate();
		}
	}

	private detachFromInput(input: BaseObservable<any>) {
		input._outputs.splice(input._outputs.indexOf(this), 1);
	}

	private invalidateOutputs() {
		for (const output of this._outputs) {
			output.invalidate();
		}
	}

	private invalidate() {
		if (!this._dirty) {
			this._dirty = true;
			this.invalidateOutputs();
		}
	}
}
