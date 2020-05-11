import * as http from '../util/http'

import {ShaderDefines, SourceMap} from './shader'

interface SourceSpan {
  type: SourceSpan.Type;
  lines: string[];
}

namespace SourceSpan {
export const enum Type {
  SOURCE,
  INCLUDE,
}
}

const INCLUDE_RE = /^#include\s+"([^"]+)"\s*$/;

function getSourceSpans(contents: string): SourceSpan[] {
  let spans: SourceSpan[] = [];
  for (let line of contents.split('\n')) {
    let m = line.match(INCLUDE_RE);
    let type: SourceSpan.Type;
    if (m) {
      type = SourceSpan.Type.INCLUDE;
      line = m[1];
    } else {
      type = SourceSpan.Type.SOURCE;
    }
    if (spans.length == 0 || spans[spans.length - 1].type != type) {
      spans.push({
        type: type,
        lines: [line],
      });
    } else {
      spans[spans.length - 1].lines.push(line);
    }
  }
  return spans;
}

function getDeps(contents: string): Set<string> {
  let deps = new Set<string>();
  for (let line of contents.split('\n')) {
    let m = line.match(INCLUDE_RE);
    if (m) { deps.add(m[1]); }
  }
  return deps;
}

export interface ShaderSource {
  src: string;
  srcMap: SourceMap;
}

export namespace shaderRegistry {

// Map from URI to shader source.
const sourceMap = new Map<string, string>();

/**
 * @returns a sorted list of all registered shader URIs.
 */
export function getUris(): string[] {
  return Array.from(sourceMap.keys()).sort();
}

// Fetches one or more source fragments, recursively extracting and fetching
// other included fragments.
export async function fetch(uri: string | Iterable<string>): Promise<void> {
  let pending: string[] = [];
  if (typeof uri == 'string') {
    if (!has(uri)) { pending.push(uri); }
  } else {
    for (let u of uri) {
      if (!has(u) && pending.indexOf(u) == -1) { pending.push(u); }
    }
  }

  let visited = new Set<string>(pending);
  while (pending.length > 0) {
    let uris = pending;
    pending = [];

    // Fetch all pending sources in parallel.
    let sources = await Promise.all(uris.map(u => http.memoizedGet(u)));
    for (let i = 0; i < sources.length; ++i) {
      add(uris[i], sources[i]);

      for (let dep of getDeps(sources[i])) {
        if (visited.has(dep) || has(dep)) { continue; };
        visited.add(dep);
        pending.push(dep);
      }
    }
  }
}

export function add(a: string | {[index: string]: string}, b?: string): void {
  let impl = (uri: string, contents: string) => {
    let existing = sourceMap.get(uri);
    if (existing !== undefined) {
      if (existing != contents) {
        throw new Error(`shader fragment ${uri} already registered with different source`);
      }
    } else {
      sourceMap.set(uri, contents);
    }
  };

  if (typeof(a) == 'string') {
    impl(a, b);
  } else {
    for (let uri in a) {
      impl(uri, a[uri]);
    }
  }
}

export function replace(uri: string, contents: string) {
  let existing = sourceMap.get(uri);
  if (existing === undefined) {
    throw new Error(`shader fragment ${uri} not registered`);
  }
  sourceMap.set(uri, contents);
}

export function has(uri: string): boolean {
  return sourceMap.has(uri);
}

export function getSource(uri: string): string {
  let source = sourceMap.get(uri);
  if (source === undefined) {
    throw new Error(`shader source ${uri} not registered`);
  }
  return source;
}

export function getDirectDeps(uri: string): Set<string> {
  return getDeps(getSource(uri));
}

export function getTransitiveDeps(uri: string): Set<string> {
  let transitiveDeps = new Set<string>();
  let pending = [uri];
  while (pending.length > 0) {
    let uris = pending;
    pending = [];
    for (let uri of uris) {
      transitiveDeps.add(uri);
      for (let dep of getDirectDeps(uri)) {
        if (!transitiveDeps.has(dep)) { pending.push(dep); }
      }
    }
  }
  return transitiveDeps;;
}

export function preprocess(uri: string, src: string, defines: ShaderDefines, preamble: string): ShaderSource {
  let preambleLines = preamble.split('\n');
  let defineLines: string[] = [];
  for (let name in defines) {
    defineLines.push(`#define ${name} ${defines[name]}`);
  }

  let lines = preambleLines.concat(defineLines);
  let srcMap = new SourceMap();
  srcMap.append('__preamble__', 1, preambleLines.length);
  srcMap.append('__defines__', 1, defineLines.length);

  let includeStack: string[] = [uri];
  let impl = (uri: string, src: string) => {
    let lineNum = 1;
    for (let span of getSourceSpans(src)) {
      if (span.type == SourceSpan.Type.INCLUDE) {
        for (let include of span.lines) {
          if (includeStack.indexOf(include) != -1) {
            throw new Error(
                `circular include of ${include} detected: [${includeStack.join(', ')}, ${include}]`);
          }
          includeStack.push(include);
          impl(include, getSource(include));
          includeStack.pop();
        }
      } else {
        lines = lines.concat(span.lines);
        srcMap.append(uri, lineNum, span.lines.length);
      }

      lineNum += span.lines.length;
    }
  };

  impl(uri, src);
  return { src: lines.join('\n'), srcMap };
}

}
