function defaultMemoizeKeyFn(...args: any[]): string {
  if (args.length == 1 && typeof(args[0] != 'object')) {
    return args[0].toString();
  } else {
    return JSON.stringify(args);
  }
}

export function memoize(fn: Function, keyFn = defaultMemoizeKeyFn) {
  let cache = new Map();
  return function(this: Function) {
    let key = keyFn.apply(this, arguments);
    let memoized = cache.get(key)
    if (memoized == null) {
      memoized = fn.apply(this, arguments);
      cache.set(key, memoized);
    }
    return memoized;
  };
}

export function memoizeAsync(fn: Function, keyFn = defaultMemoizeKeyFn) {
  let cache = new Map();
  return async function(this: Function, ...args: any) {
    let key = keyFn.apply(this, args);
    let memoized = cache.get(key);
    if (memoized == null) {
      memoized = fn.apply(this, args);
      cache.set(key, memoized);
    }
    return memoized;
  };
}
