import { BaseObservable } from "./baseObservable";

export interface Plugin {
  onCreate?(observable: BaseObservable<any>, val: any): void;
  onChange?(observable: BaseObservable<any>, val: any, prevVal: any): void;
  onSubscribe?(observable: BaseObservable<any>): void;
  onUnsubscribe?(observable: BaseObservable<any>): void;
  onAttach?(observable: BaseObservable<any>, input: BaseObservable<any>): void;
  onDetach?(observable: BaseObservable<any>, input: BaseObservable<any>): void;
}
