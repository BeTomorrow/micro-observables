import { useLayoutEffect, useMemo, useState } from "react";
import { Observable } from "./observable";

export function useObservable<T>(observable: Observable<T>): T {
  const [, forceRender] = useState({});
  const val = observable.get();

  useLayoutEffect(() => {
    return observable.subscribe(() => forceRender({}));
  }, [observable]);

  return val;
}

export function useMemoizedObservable<T>(factory: () => Observable<T>, deps: any[] = []): T {
  return useObservable(useMemo(factory, deps));
}

export function useComputedObservable<T>(compute: () => T, deps: any[] = []): T {
  return useMemoizedObservable(() => Observable.compute(compute), deps);
}
