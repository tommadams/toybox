import * as http from 'toybox/util/http'
import {Context} from 'toybox/gl/context'
import {Shader, ShaderDefines, ShaderProgram, SrcMapEntry} from 'toybox/gl/shader'
import {ShaderType} from 'toybox/gl/constants'
import {memoizeAsync} from 'toybox/util/memoize'

// Default preamble for WebGL2 shaders.
const defaultPreamble = `#version 300 es
precision highp float;
precision highp int;
layout(std140, column_major) uniform;
`;

function parseDirectDeps(src: string): Set<string> {
  let deps = new Set();
  src.split('\n').forEach((line) => {
    const m = line.match(/^#include\s+"([^"]+)"\s*$/);
    if (m) {
      deps.add(m[1]);
    }
  });
  return deps;
}

// TODO(tommadams): allow precision to be easily configured per shader.
function getInstanceKey(uri: string, defines?: ShaderDefines, preamble?: string): string {
  defines || {};
  preamble || defaultPreamble;
  let parts = [uri, preamble];
  Object.keys(defines).sort().forEach((key) => {
    const val = defines[key];
    parts.push(`${key}\x01${val}`);
  });
  return parts.join('\x00');
}

class ShaderSource {
  instances = new Map<string, Shader>();
  directDeps: Set<string>;
  transitiveDeps: Set<string>;

  constructor(public uri: string, public src: string) {
    this.directDeps = parseDirectDeps(src);
    this.transitiveDeps = new Set(this.directDeps);
  }
}

export class ShaderRegistry {
  private sourceMap = new Map<string, ShaderSource>();
  load: (uri: string) => Promise<ShaderSource>;

  constructor(private ctx: Context) {
    this.ctx = ctx;
    this.load = memoizeAsync(this.loadImpl);
  }

  getUris(): string[] {
    return Array.from(this.sourceMap.keys()).sort();
  }

  getSrc(uri: string): string {
    return this.sourceMap.get(uri).src;
  }

  register(uri: string, src: string): void {
    if (!this.sourceMap.has(uri)) {
      this.sourceMap.set(uri, new ShaderSource(uri, src));
    }
  }

  compile(type: ShaderType, uri: string, defines?: ShaderDefines): Shader {
    const source = this.sourceMap.get(uri);
    const preamble = defaultPreamble;
    defines = defines || {};
    const key = getInstanceKey(uri, defines, preamble);

    // We've already compiled a shader for this URI/defines combination.
    let instance = source.instances.get(key);
    if (instance) {
      return instance;
    }

    const preprocessed = this.preprocess(uri, defines, preamble);
    const shader = new Shader(this.ctx, type, defines, preamble, preprocessed.src, preprocessed.map);
    shader.uri = uri;
    source.instances.set(key, shader);

    return shader;
  }

  updateSource(uri: string, src: string): void {
    let source = this.sourceMap.get(uri);
    source.src = src;

    const dirtyShaders = new Set<Shader>();
    for (let source of this.sourceMap.values()) {
      if (source.uri == uri || source.transitiveDeps.has(uri)) {
        for (let inst of source.instances.values()) {
          dirtyShaders.add(inst);
        }
      }
    }

    for (let shader of dirtyShaders) {
      const preprocessed = this.preprocess(shader.uri, shader.defines, shader.preamble);
      console.log(`recompiling ${shader.uri}`);
      shader.compile(preprocessed.src, preprocessed.map);
    }

    const dirtyPrograms = new Set<ShaderProgram>();
    for (let shader of dirtyShaders) {
      shader.programs.forEach((program) => {
        dirtyPrograms.add(program);
      });
    }
    for (let program of dirtyPrograms) {
      console.log(`relinking (${program.vs.uri}, ${program.fs.uri})`);
      program.link();
    }
  }

  private preprocess(
      uri: string, defines: ShaderDefines, preamble: string): {src: string, map: SrcMapEntry[]} {
    let allLines = new Array<string>();
    let map = new Array<SrcMapEntry>();

    preamble.split('\n').forEach((line, i) => {
      allLines.push(line);
      map.push({uri: '__preamble__', line: i+1});
    });

    let i = 1;
    for (let name in defines) {
      allLines.push(`#define ${name} ${defines[name]}`);
      map.push({uri: '__defines__', line: i++});
    }

    let processSource = (uri: string, source: ShaderSource) => {
      source.src.split('\n').forEach((line, i) => {
        let m = line.match(/^#include\s+"([^"]+)"\s*$/);
        if (m) {
          const include = m[1];
          source.transitiveDeps.add(include);
          processSource(include, this.sourceMap.get(include));
        } else {
          allLines.push(line);
          map.push({uri: uri, line: i+1});
        }
      });
    };
    processSource(uri, this.sourceMap.get(uri));

    return { src: allLines.join('\n'), map: map };
  }

  private async loadImpl(uri: string): Promise<ShaderSource> {
    // Check if source for this URI has already been registered directly.
    const source = this.sourceMap.get(uri);
    if (source) {
      return source;
    }

    let depStack = [uri];
    let impl = async (uri: string) => {
      let source = new ShaderSource(uri, await http.memoizedGet(uri));
      this.sourceMap.set(uri, source);

      for (let dep of source.directDeps.values()) {
        if (depStack.indexOf(dep) != -1) {
          throw new Error(
              `circular include of ${dep} detected: [${depStack.join(', ')}, ${dep}]`);
        }
        depStack.push(dep);
        await impl(dep);
        depStack.pop();
      }

      return source;
    };

    return await impl(uri);
  }
}
