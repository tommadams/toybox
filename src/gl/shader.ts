import {NumericArray, TypedArray} from '../types/array'

import {Context} from './context'
import {GL, DataType} from './constants'
import {Texture} from './texture'

export interface ShaderErrorMsg {
  uri: string;
  line: number;
  msg: string;
}

export interface SrcMapEntry {
  uri: string;
  line: number;
}

export interface ShaderDefines {[id: string]: number | string}
export interface TexUnits {[id: string]: number}

export interface ShaderOptions {
  defines?: ShaderDefines;
  texUnits?: TexUnits;
}

export interface Sampler {
  type: number;
  loc: WebGLUniformLocation;
  texUnit: number;
}

export interface UniformBlockSetting { [index: string]: number | NumericArray; }

function uniformValueIsArray(value: number | NumericArray): value is NumericArray {
  return (<NumericArray>value).length !== undefined;
}

export class CompileError extends Error {
  errors = new Array<ShaderErrorMsg>();

  constructor(msg: string, srcMap: SrcMapEntry[]) {
    super(msg);
    console.log(`Raw GL error:\n${msg}`);

    let captureStackTrace = (Error as any).captureStackTrace;
    if (captureStackTrace) {
      captureStackTrace(this, CompileError);
    }

    let errLines = msg.split('\n');

    // Group errLines by line number.
    let groupMap = new Map<number, {errorLine: number, errors: string[]}>();
    let errorLine = -1;
    errLines.forEach((line) => {
      // Sometimes nvidia drivers return a string containing the null terminator :/
      if (line.length > 0 && line.charCodeAt(line.length - 1) == 0) {
        line = line.substr(0, line.length - 1);
      }
      if (line.trim() == '') {
        return;
      }
      let match = line.match(/ERROR: \d+:(\d+): (.*)/);
      let error: string;
      if (match == null) {
        error = line;
      } else {
        errorLine = parseInt(match[1]);
        error = match[2];
      }
      let group = groupMap.get(errorLine);
      if (group == null) {
        group = {
          errorLine: errorLine,
          errors: [],
        };
        groupMap.set(errorLine, group);
      }
      group.errors.push(error);
    });

    let groups = Array.from(groupMap.values());
    groups.sort((a, b) => { return a.errorLine - b.errorLine; });

    groups.forEach((group) => {
      let mappedLine = srcMap[group.errorLine - 1];
      let error = {
        uri: mappedLine.uri,
        line: mappedLine.line,
        msg: group.errors.join('\n'),
      };
      group.errors.forEach((err) => {
        console.log(`${mappedLine.uri}:${mappedLine.line}: ${err}`);
      });
      this.errors.push(error);
    });
  }
}

class Uniform {
  public valueFn: Function;
  public arrayFn: Function;

  constructor(type: DataType, public loc: WebGLUniformLocation) {
    switch (type) {
      case GL.BOOL:
        this.valueFn = WebGL2RenderingContext.prototype.uniform1i;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform1iv;
        break;
      case GL.FLOAT:
        this.valueFn = WebGL2RenderingContext.prototype.uniform1f;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform1fv;
        break;
      case GL.FLOAT_VEC2:
        this.valueFn = WebGL2RenderingContext.prototype.uniform2f;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform2fv;
        break;
      case GL.FLOAT_VEC3:
        this.valueFn = WebGL2RenderingContext.prototype.uniform3f;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform3fv;
        break;
      case GL.FLOAT_VEC4:
        this.valueFn = WebGL2RenderingContext.prototype.uniform4f;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform4fv;
        break;
      case GL.INT:
        this.valueFn = WebGL2RenderingContext.prototype.uniform1i;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform1iv;
        break;
      case GL.INT_VEC2:
        this.valueFn = WebGL2RenderingContext.prototype.uniform2i;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform2iv;
        break;
      case GL.INT_VEC3:
        this.valueFn = WebGL2RenderingContext.prototype.uniform3i;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform3iv;
        break;
      case GL.INT_VEC4:
        this.valueFn = WebGL2RenderingContext.prototype.uniform4i;
        this.arrayFn = WebGL2RenderingContext.prototype.uniform4iv;
        break;
      case GL.FLOAT_MAT2:
        this.valueFn = null;
        this.arrayFn = WebGL2RenderingContext.prototype.uniformMatrix2fv;
        break;
      case GL.FLOAT_MAT3:
        this.valueFn = null;
        this.arrayFn = WebGL2RenderingContext.prototype.uniformMatrix3fv;
        break;
      case GL.FLOAT_MAT4:
        this.valueFn = null;
        this.arrayFn = WebGL2RenderingContext.prototype.uniformMatrix4fv;
        break;
      default:
        throw new Error(`Unrecognized uniform type: ${type}`);
    }
  }
}

class BlockUniform {
  constructor(public value: TypedArray,
              public numComponents: number,
              public numRows: number) {}
}

// TODO(tom): expose an interface that allows clients to create multiple
// instances of a block and bind different ones to a shader efficiently (rather
// than poking at values in the shader's uniform block).
export class UniformBlock {
  handle: WebGLBuffer;
  buffer: ArrayBuffer;
  uniforms: {[id: string]: BlockUniform};

  constructor(gl: WebGL2RenderingContext, programHandle: WebGLProgram, public name: string,
              public idx: number, public binding: number) {
    gl.uniformBlockBinding(programHandle, idx, binding);

    const blockDataSize = gl.getActiveUniformBlockParameter(
        programHandle, idx, GL.UNIFORM_BLOCK_DATA_SIZE) as GLuint;
    const indices = gl.getActiveUniformBlockParameter(
        programHandle, idx, GL.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES) as Uint32Array;

    // gl.getActiveUniformBlockParameter returns a Uint32Array but
    // gl.getActiveUniforms requires an Array<GLuint>, which is not the same thing.
    // In JavaScript, you can just pass the Uint32Array directly and everything
    // works just fine, but the TypeScript compiler enforces that
    // gl.getActiveUniforms takes the correct type.
    // TODO(tom): see if the upstream gl.getActiveUniforms can be fixed. Until then,
    // just copy the indices into an array.
    const indicesArray = new Array(indices.length);
    for (let i = 0; i < indices.length; ++i) {
      indicesArray[i] = indices[i];
    }
    const offsets = gl.getActiveUniforms(programHandle, indicesArray, GL.UNIFORM_OFFSET) as number[];

    this.buffer = new ArrayBuffer(blockDataSize);
    this.handle = gl.createBuffer();
    this.uniforms = {};
    for (let i = 0; i < offsets.length; ++i) {
      // Convert the uniform's WebGL name into block-relative GLSL name.
      // For example, for the following uniform block:
      //   uniform Foo {
      //     int bar[3];
      //   } foo;
      // The WebGL name is "Foo.bar[0]".
      // The block-relative GLSL name is "bar".
      const info = gl.getActiveUniform(programHandle, indices[i]);
      if (!info.name.startsWith(this.name)) {
        throw new Error(`unexpected uniform name "${info.name}"`);
      }
      let uniformName = info.name.slice(this.name.length + 1);
      if (uniformName.endsWith('[0]')) {
        uniformName = uniformName.slice(0, -3);
      }

      // Figure out the packing for each uniform in the block.
      // See (OpenGL 4.5, Section 7.6.2.2, page 137) for the rules:
      //   https://www.khronos.org/registry/OpenGL/specs/gl/glspec45.core.pdf#page=159
      const offset = offsets[i];
      let glType = info.type;

      // Number of array elements the uniform has.
      // 1 for non-arrays types (i.e. scalars and vecN types);
      let numElems = info.size;

      // Number of rows each array element.
      // 1 for all non-matrix types.
      // M for matMxN types.
      let numRowsPerElem = 1;

      // Number of components in a row.
      // 1 for scalar types.
      // N for vecN types.
      // N for matMxN types.
      let numComps;

      // Javascript array constructor.
      let ctor;
      if (glType == GL.FLOAT) { ctor = Float32Array; numComps = 1; }
      else if (glType == GL.FLOAT_VEC2) { ctor = Float32Array; numComps = 2; }
      else if (glType == GL.FLOAT_VEC3) { ctor = Float32Array; numComps = 3; }
      else if (glType == GL.FLOAT_VEC4) { ctor = Float32Array; numComps = 4; }
      else if (glType == GL.INT) { ctor = Int32Array; numComps = 1; }
      else if (glType == GL.INT_VEC2) { ctor = Int32Array; numComps = 2; }
      else if (glType == GL.INT_VEC3) { ctor = Int32Array; numComps = 3; }
      else if (glType == GL.INT_VEC4) { ctor = Int32Array; numComps = 4; }
      else if (glType == GL.UNSIGNED_INT) { ctor = Uint32Array; numComps = 1; }
      else if (glType == GL.UNSIGNED_INT_VEC2) { ctor = Uint32Array; numComps = 2; }
      else if (glType == GL.UNSIGNED_INT_VEC3) { ctor = Uint32Array; numComps = 3; }
      else if (glType == GL.UNSIGNED_INT_VEC4) { ctor = Uint32Array; numComps = 4; }
      else if (glType == GL.BOOL) { ctor = Uint32Array; }
      else if (glType == GL.BOOL_VEC2) { ctor = Uint32Array; numComps = 2; }
      else if (glType == GL.BOOL_VEC3) { ctor = Uint32Array; numComps = 3; }
      else if (glType == GL.BOOL_VEC4) { ctor = Uint32Array; numComps = 4; }
      else if (glType == GL.FLOAT_MAT2) { ctor = Float32Array; numComps = 2; numRowsPerElem = 2; }
      else if (glType == GL.FLOAT_MAT2x3) { ctor = Float32Array; numComps = 3; numRowsPerElem = 2; }
      else if (glType == GL.FLOAT_MAT2x4) { ctor = Float32Array; numComps = 4; numRowsPerElem = 2; }
      else if (glType == GL.FLOAT_MAT3x2) { ctor = Float32Array; numComps = 2; numRowsPerElem = 3; }
      else if (glType == GL.FLOAT_MAT3) { ctor = Float32Array; numComps = 3; numRowsPerElem = 3; }
      else if (glType == GL.FLOAT_MAT3x4) { ctor = Float32Array; numComps = 4; numRowsPerElem = 3; }
      else if (glType == GL.FLOAT_MAT4x2) { ctor = Float32Array; numComps = 2; numRowsPerElem = 4; }
      else if (glType == GL.FLOAT_MAT4x3) { ctor = Float32Array; numComps = 3; numRowsPerElem = 4; }
      else if (glType == GL.FLOAT_MAT4) { ctor = Float32Array; numComps = 4; numRowsPerElem = 4; }
      else { throw new Error(`unrecognized type ${glType}`); }

      let alignment: number;
      // Luckily we can assume that we assume all uniforms are "basic machine unit"
      // sized (i.e 4 bytes).
      if (numElems == 1 && numRowsPerElem == 1) {
        if (numComps <= 2) {
          // Scalars are always aligned to a single basic machine unit.
          // Two-component vectors are aligned to 2 basic machine units.
          alignment = numComps;
        } else {
          alignment = 4;
        }
      } else {
        // Array elems are always aligned to 4 basic machine units.
        alignment = 4;
      }

      // Total number of rows.
      const numRows = numElems * numRowsPerElem;

      this.uniforms[uniformName] = new BlockUniform(
          new ctor(this.buffer, offset, alignment * numRows), numComps, numRows);
    }
  }

  set(gl: WebGL2RenderingContext, uniforms: UniformBlockSetting) {
    for (let name in uniforms) {
      const value = uniforms[name];
      const uniform = this.uniforms[name];
      if (uniformValueIsArray(value)) {
        let srcIdx = 0;
        let dstIdx = 0;
        switch (uniform.numComponents) {
          case 1:
            for (let row = 0; row < uniform.numRows; ++row) {
              uniform.value[dstIdx++] = value[srcIdx++];
              dstIdx += 3;
            }
            break;
          case 2:
            for (let row = 0; row < uniform.numRows; ++row) {
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
              dstIdx += 2;
            }
            break;
          case 3:
            for (let row = 0; row < uniform.numRows; ++row) {
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
              dstIdx += 1;
            }
            break;
          case 4:
            for (let row = 0; row < uniform.numRows; ++row) {
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
              uniform.value[dstIdx++] = value[srcIdx++];
            }
            break;
        }
      } else {
        uniform.value[0] = value;
      }
    }
    gl.bindBuffer(GL.UNIFORM_BUFFER, this.handle);
    gl.bufferData(GL.UNIFORM_BUFFER, this.buffer, GL.DYNAMIC_DRAW);
    gl.bindBufferBase(GL.UNIFORM_BUFFER, this.binding, this.handle);
  }
}

export class Shader {
  handle: WebGLShader;
  defines: ShaderDefines;
  programs = new Array<ShaderProgram>();
  uri = '';

  constructor(public ctx: Context, public type: number, defines: ShaderDefines,
              public preamble: string, src: string, srcMap: SrcMapEntry[]) {
    const gl = ctx.gl;
    this.handle = gl.createShader(type);
    this.defines = Object.assign({}, defines || {});
    this.compile(src, srcMap);
  }

  compile(src: string, srcMap: SrcMapEntry[]) {
    const gl = this.ctx.gl;
    gl.shaderSource(this.handle, src);
    gl.compileShader(this.handle);
    if (!gl.getShaderParameter(this.handle, GL.COMPILE_STATUS)) {
      throw new CompileError(gl.getShaderInfoLog(this.handle), srcMap);
    }
  }
}

export class ShaderProgram {
  handle: WebGLProgram;
  vs: Shader = null;
  fs: Shader = null;
  blocks: {[id: string]: UniformBlock} = {};
  uniforms: {[id: string]: Uniform} = {};
  samplers: {[id: string]: Sampler} = {};

  // Set of names passed to setUniform or setUniformBlock that don't exist on
  // the shader. Used for reporting debug messages.
  private unknownUniforms = new Set<string>();

  constructor(public ctx: Context) {
    this.ctx = ctx;
    this.handle = ctx.gl.createProgram();
  }

  setShaders(vs: Shader, fs: Shader) {
    const gl = this.ctx.gl;
    this.vs = vs;
    this.fs = fs;
    vs.programs.push(this);
    fs.programs.push(this);
    gl.attachShader(this.handle, vs.handle);
    gl.attachShader(this.handle, fs.handle);
  }

  link(texUnits?: TexUnits) {
    texUnits = texUnits || {};
    let reservedTexUnits = new Set<number>();
    for (let name in texUnits) {
      reservedTexUnits.add(texUnits[name]);
    }

    const ctx = this.ctx;
    const gl = ctx.gl;
    gl.linkProgram(this.handle);
    if (!gl.getProgramParameter(this.handle, GL.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(this.handle));
    }

    // Initialize attribute bindings.
    const numAttribs = gl.getProgramParameter(this.handle, GL.ACTIVE_ATTRIBUTES);
    for (let idx = 0; idx < numAttribs; ++idx) {
      const name = gl.getActiveAttrib(this.handle, idx).name;
      gl.bindAttribLocation(this.handle, ctx.getVertexAttribBinding(name), name);
    }
    // Must relink the program for the updated attribute bindings to take effect.
    gl.linkProgram(this.handle);

    this.blocks = {};
    this.samplers = {};

    // Initialize uniform blocks.
    // TODO(tom): check that shared uniform blocks match.
    const numBlocks = gl.getProgramParameter(this.handle, GL.ACTIVE_UNIFORM_BLOCKS);
    let uniqueBlockIdx = ctx.numSharedUniformBlocks;
    for (let idx = 0; idx < numBlocks; ++idx) {
      const name = gl.getActiveUniformBlockName(this.handle, idx);
      let block = ctx.sharedUniformBlocks[name];
      if (block === undefined) {
        // Not a shared uniform block.
        const binding = uniqueBlockIdx++;
        block = new UniformBlock(gl, this.handle, name, idx, binding);
      } else if (typeof(block) == 'number') {
        // First time seeing a shared uniform block with this name.
        // `block` is the block's binding.
        const binding = block;
        block = new UniformBlock(gl, this.handle, name, idx, binding);
        ctx.sharedUniformBlocks[name] = block;
      } else {
        // We've already created this shared uniform block.
        // Just need to set the binding.
        gl.uniformBlockBinding(this.handle, idx, block.binding);
      }
      this.blocks[name] = block;
    }

    // Initialize texture samplers.
    let nextTexUnit = 0;
    while (reservedTexUnits.has(nextTexUnit)) {
      nextTexUnit += 1;
    }
    let numUniforms = gl.getProgramParameter(this.handle, GL.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; ++i) {
      let glUniform = gl.getActiveUniform(this.handle, i);
      let name = glUniform.name;
      let loc = gl.getUniformLocation(this.handle, name);
      let type = glUniform.type;
      if (type == GL.SAMPLER_2D ||
          type == GL.SAMPLER_2D_SHADOW ||
          type == GL.SAMPLER_3D ||
          type == GL.SAMPLER_CUBE ||
          type == GL.INT_SAMPLER_2D ||
          type == GL.INT_SAMPLER_3D ||
          type == GL.INT_SAMPLER_CUBE ||
          type == GL.UNSIGNED_INT_SAMPLER_2D ||
          type == GL.UNSIGNED_INT_SAMPLER_3D ||
          type == GL.UNSIGNED_INT_SAMPLER_CUBE) {
        let texUnit = texUnits[name];
        if (texUnit === undefined) {
          texUnit = nextTexUnit;
          do {
            nextTexUnit += 1;
          } while (reservedTexUnits.has(nextTexUnit));
        }
        this.samplers[name] = {type: type, loc: loc, texUnit: texUnit};
      } else if (name.indexOf(".") == -1) {
        // Uniform, not part of a block.
        if (name.endsWith('[0]')) {
          name = name.slice(0, -3);
        }
        this.uniforms[name] = new Uniform(type, loc);
      }
    }
    gl.useProgram(this.handle);
    for (let key in this.samplers) {
      const sampler = this.samplers[key];
      gl.uniform1i(sampler.loc, sampler.texUnit);
    }
  }

  setUniformBlock(name: string, uniforms: UniformBlockSetting) {
    let block = this.blocks[name];
    if (block == null) {
      if (!this.unknownUniforms.has(name)) {
        console.log(`Shader program [${this.vs.uri}, ${this.fs.uri}] has no uniform block ${name}`);
        this.unknownUniforms.add(name);
      }
      return;
    }

    block.set(this.ctx.gl, uniforms);
  }

  setUniform(name: string, ..._args: any[]) {
    let uniform = this.uniforms[name];
    if (uniform == null) {
      if (!this.unknownUniforms.has(name)) {
        console.log(`Shader program [${this.vs.uri}, ${this.fs.uri}] has no uniform ${name}`);
        this.unknownUniforms.add(name);
      }
      return;
    }

    if (uniform.valueFn == null) {
      // Matrices only have vector uniform functions.
      uniform.arrayFn.call(this.ctx.gl, uniform.loc, false, arguments[1]);
    } else {
      arguments[0] = uniform.loc;
      if (arguments[1].length !== undefined) {
        uniform.arrayFn.apply(this.ctx.gl, arguments);
      } else {
        uniform.valueFn.apply(this.ctx.gl, arguments);
      }
    }
  }

  // TODO(tom): support texture arrays
  bindTexture(name: string, tex: Texture) {
    const gl = this.ctx.gl;
    let sampler = this.samplers[name];
    if (sampler == null) {
      if (!this.unknownUniforms.has(name)) {
        console.log(`Shader program [${this.vs.uri}, ${this.fs.uri}] has no sampler ${name}`);
        this.unknownUniforms.add(name);
      }
      return;
    }
    gl.activeTexture(GL.TEXTURE0 + sampler.texUnit);
    gl.bindTexture(tex.target, tex.handle)
  }
}

