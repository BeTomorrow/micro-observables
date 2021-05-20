import hoistNonReactStatics from "hoist-non-react-statics";
import React from "react";
import { Unsubscriber } from "./baseObservable";
import { Observable, ObservableValues } from "./observable";
import { shallowEqual } from "./shallowEqual";

type Mapping = { [key: string]: Observable<any> };
type InjectedProps<M extends Mapping> = ObservableValues<M>;
type HocProps<P extends InjectedProps<M>, M extends Mapping> = Pick<P, Exclude<keyof P, keyof M>>;

export const withObservables = <P extends InjectedProps<M>, M extends Mapping>(
  Component: React.ComponentType<P>,
  mapping: (ownProps: HocProps<P, M>) => M
): React.ComponentType<HocProps<P, M>> => {
  class WithObservables extends React.PureComponent<HocProps<P, M>> {
    private _ownProps!: HocProps<P, M>;
    private _mapping!: M;
    private _unsubscribers: Unsubscriber[] = [];

    componentWillUnmount() {
      this._unsubscribers.forEach(it => it());
      this._unsubscribers = [];
    }

    render(): JSX.Element {
      this.updateMapping();

      const injectedProps: { [key: string]: any } = {};
      for (const key of Object.keys(this._mapping)) {
        injectedProps[key] = this._mapping[key].get();
      }

      return React.createElement(Component, { ...this.props, ...injectedProps } as P);
    }

    private updateMapping() {
      if (!this._ownProps || !shallowEqual(this._ownProps, this.props)) {
        this._ownProps = this.props;
        this._mapping = typeof mapping === "function" ? mapping(this.props) : mapping;

        const unsubscribers = Object.values(this._mapping).map(observable =>
          observable.subscribe(() => this.forceUpdate())
        );
        this._unsubscribers.forEach(it => it());
        this._unsubscribers = unsubscribers;
      }
    }
  }
  return hoistNonReactStatics(WithObservables, Component);
};
