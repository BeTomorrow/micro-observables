export function memoize<T extends any[], U>(func: (args: T) => U): (args: T) => U {
  let lastArgs: T | undefined;
  let lastResult!: U;

  return (args: T) => {
    let argsHaveChanged = false;
    if (!lastArgs || args.length !== lastArgs.length) {
      argsHaveChanged = true;
    } else {
      for (let i = 0; i < args.length; i++) {
        if (args[i] !== lastArgs[i]) {
          argsHaveChanged = true;
          break;
        }
      }
    }

    if (argsHaveChanged) {
      lastArgs = args;
      lastResult = func(args);
    }

    return lastResult;
  };
}
