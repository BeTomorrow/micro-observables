import { BaseObservable } from "./baseObservable";

export interface Plugin {
  onCreate?(observable: BaseObservable<any>, val: any): void;
  onChange?(observable: BaseObservable<any>, val: any, prevVal: any): void;
}
