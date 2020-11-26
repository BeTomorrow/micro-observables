import { Unsubscriber } from "baseObservable";
import React from "react";
import { Observable, ObservableValues } from "./observable";

type Mapping = { [key: string]: Observable<any> };
type InjectedProps<M extends Mapping> = ObservableValues<M>;
type HocProps<P extends InjectedProps<M>, M extends Mapping> = Pick<P, Exclude<keyof P, keyof M>>;

export const withObservables = <P extends InjectedProps<M>, M extends Mapping>(
	Component: React.ComponentType<P>,
	mapping: (ownProps: HocProps<P, M>) => M
): React.ComponentType<HocProps<P, M>> =>
	class WithObservables extends React.PureComponent<HocProps<P, M>> {
		private _mapping!: M;
		private _unsubscribers: Unsubscriber[] = [];

		componentDidMount() {
			this._unsubscribers = Object.values(this._mapping).map(observable =>
				observable.onChange(() => this.forceUpdate())
			);
		}

		componentWillUnmount() {
			this._unsubscribers.forEach(it => it());
			this._unsubscribers = [];
		}

		render(): JSX.Element {
			const injectedProps: { [key: string]: any } = {};

			this._mapping = typeof mapping === "function" ? mapping(this.props) : mapping;
			for (const key of Object.keys(this._mapping)) {
				injectedProps[key] = this._mapping[key].get();
			}

			return React.createElement(Component, { ...this.props, ...injectedProps } as P);
		}
	};
