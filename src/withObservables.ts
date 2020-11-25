import { Unsubscriber } from "baseObservable";
import React from "react";
import { shallowEqual } from "shallowEqual";
import { Observable, ObservableValues } from "./observable";

type Mapping = { [key: string]: Observable<any> };
type InjectedProps<M extends Mapping> = ObservableValues<M>;
type HocProps<M extends Mapping, P extends InjectedProps<M>> = Pick<P, Exclude<keyof P, keyof M>>;

export const withObservables = <M extends Mapping, P extends InjectedProps<M>>(
	Component: React.ComponentType<P>,
	mapping: ((ownProps: HocProps<M, P>) => M) | M
): React.ComponentType<HocProps<M, P>> =>
	class WithObservables extends React.Component<HocProps<M, P>> {
		private _mapping!: M;
		private _mappingProps!: HocProps<M, P>;
		private _unsubscribers: Unsubscriber[] = [];

		constructor(props: HocProps<M, P>) {
			super(props);
			this.updateMapping();
		}

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
			this.updateMapping();

			const injectedProps: { [key: string]: any } = {};
			for (const key of Object.keys(this._mapping)) {
				injectedProps[key] = this._mapping[key].get();
			}

			return React.createElement(Component, { ...this.props, ...injectedProps } as P);
		}

		private updateMapping() {
			if (!this._mappingProps || !shallowEqual(this._mappingProps, this.props)) {
				this._mapping = typeof mapping === "function" ? mapping(this.props) : mapping;
				this._mappingProps = this.props;
			}
		}
	};
