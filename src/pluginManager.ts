import { BaseObservable } from "./baseObservable";
import { Plugin } from "./plugin";

export class PluginManager {
  private _plugins: Plugin[] = [];

  use(plugin: Plugin) {
    this._plugins.push(plugin);
  }

  onCreate(observable: BaseObservable<any>, val: any) {
    this._plugins.forEach(it => it.onCreate?.(observable, val));
  }

  onChange(observable: BaseObservable<any>, val, prevVal) {
    this._plugins.forEach(it => it.onChange?.(observable, val, prevVal));
  }

  onSubscribe(observable: BaseObservable<any>) {
    this._plugins.forEach(it => it.onSubscribe?.(observable));
  }

  onUnsubscribe(observable: BaseObservable<any>) {
    this._plugins.forEach(it => it.onUnsubscribe?.(observable));
  }

  onAttach(observable: BaseObservable<any>, input: BaseObservable<any>) {
    this._plugins.forEach(it => it.onAttach?.(observable, input));
  }

  onDetach(observable: BaseObservable<any>, input: BaseObservable<any>) {
    this._plugins.forEach(it => it.onDetach?.(observable, input));
  }
}
