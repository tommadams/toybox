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

function getSourceSpans(contents: string): SourceSpan[] {
  let spans: SourceSpan[] = [];
  for (let line of contents.split('\n')) {
    let m = line.match(/^#include\s+"([^"]+)"\s*$/);
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

export interface ShaderSource {
  uri?: string;
  src: string;
  srcMap: SourceMap;
}

// A registry of parsed sources
class SourceRegistry {
  private sources = new Map<string, string>();

  // Fetches one or more source fragments, recursively extracting and fetching
  // other included fragments.
  async fetch(uri: string | Iterable<string>): Promise<void> {
    let pending: string[] = [];
    if (typeof uri == 'string') {
      if (!this.has(uri)) { pending.push(uri); }
    } else {
      for (let u of uri) {
        if (!this.has(u) && pending.indexOf(u) == -1) { pending.push(u); }
      }
    }
    if (pending.length == 0) {
      return;
    }

    let visited = new Set<string>(pending);
    while (pending.length > 0) {
      let uris = pending;
      for (let u of uris) {
        console.log(`fetch ${u}`);
      }
      pending = [];

      // Fetch all pending sources in parallel.
      let promises = uris.map(u => http.memoizedGet(u));
      let sources = await Promise.all(promises);
      for (let i = 0; i < promises.length; ++i) {
        this.add(uris[i], sources[i]);

        for (let s of getSourceSpans(sources[i])) {
          if (s.type == SourceSpan.Type.INCLUDE) {
            for (let include of s.lines) {
              if (visited.has(include) || this.has(include)) { continue; };
              visited.add(include);
              pending.push(include);
            }
          }
        }
      }
    }
  }

  /**
   * @returns a sorted list of all registered shader URIs.
   */
  getUris(): string[] {
    return Array.from(this.sources.keys()).sort();
  }

  // Adds source fragments with the given uri.
  add(a: string | {[index: string]: string}, b?: string): void {
    let impl = (uri: string, contents: string) => {
      let existing = this.sources.get(uri);
      if (existing !== undefined) {
        if (existing != contents) {
          throw new Error(`shader fragment ${uri} already registered with different source`);
        }
      } else {
        this.sources.set(uri, contents);
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

  has(uri: string): boolean {
    return this.sources.has(uri);
  }

  get(uri: string): string {
    let source = this.sources.get(uri);
    if (source === undefined) {
      throw new Error(`shader source ${uri} not registered`);
    }
    return source;
  }

  preprocess(uri: string, src: string, defines: ShaderDefines, preamble: string): ShaderSource {
    let preambleLines = preamble.split('\n');
    let defineLines: string[] = [];
    for (let name in defines) {
      defineLines.push(`#define ${name} ${defines[name]}`);
    }

    let lines = preambleLines.concat(defineLines);
    let srcMap = new SourceMap();
    srcMap.append('__preamble__', 1, preambleLines.length);
    srcMap.append('__defines__', preambleLines.length, defineLines.length);

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
            impl(include, this.get(include));
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

const sourceRegistry = new SourceRegistry();

export namespace shaderSource {

export async function fetchSource(uri: string | Iterable<string>): Promise<void> {
  return sourceRegistry.fetch(uri);
}

export function getUris(): string[] {
  return sourceRegistry.getUris();
}

export function addSource(a: string | {[index: string]: string}, b?: string): void {
  return sourceRegistry.add(a, b);
}

export function getSource(uri: string) {
  return sourceRegistry.get(uri);
}

export function preprocess(uri: string, src: string, defines: ShaderDefines, preamble: string): ShaderSource {
  return sourceRegistry.preprocess(uri, src, defines, preamble);
}

}
