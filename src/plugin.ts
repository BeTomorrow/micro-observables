import { BaseObservable } from "./baseObservable";

export interface Plugin {
  onCreate?(observable: BaseObservable<any>, val: any): void;
  onChange?(observable: BaseObservable<any>, val: any, prevVal: any): void;
  onBecomeObserved?(observable: BaseObservable<any>): void;
  onBecomeUnobserved?(observable: BaseObservable<any>): void;
  onAttach?(observable: BaseObservable<any>, input: BaseObservable<any>): void;
  onDetach?(observable: BaseObservable<any>, input: BaseObservable<any>): void;
}
