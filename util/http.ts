let cache = new Map<string, Promise<string>>();

export function get(uri: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // console.trace(`http.get("${uri}")`);
    let r = new XMLHttpRequest();
    r.open('GET', uri, true);
    r.onload = () => {
      console.log(`${r.status}: ${uri}`);
      // console.log(`http.get("${uri}") => ${r.status}`);
      if (r.status == 200) {
        resolve(r.responseText);
      } else {
        reject('Failed to load "' + uri + '" : (' + r.status + ') ' + r.statusText);
      }
    };
    r.send(null);
  });
}

export function memoizedGet(uri: string): Promise<string> {
  let memoized = cache.get(uri);
  if (memoized == null) {
    memoized = get(uri);
    cache.set(uri, memoized);
  }
  return memoized;
}
