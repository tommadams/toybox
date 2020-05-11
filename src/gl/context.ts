import {Framebuffer} from './framebuffer';
import {GL, BlendEquation, BlendFunc, BufferTarget, Capability, CompareFunc, MipmapTarget, ReadBuffer, SamplerParameter, ShaderType, TextureFormat, TextureTarget, TextureType} from './constants';
import {Shader, ShaderDef, ShaderProgram, TexUnits, UniformBlock, UniformBlockSetting} from './shader';
import {shaderRegistry} from './shader_registry';
import {Profiler} from './profiler';
import {Texture, Texture2D, Texture2DDef, TextureCube, TextureCubeDef} from './texture';
import {Buffer, VertexArray, VertexArrayDef, VertexBuffer, VertexBufferDef} from './vertex_array';
import {TypedArray} from '../types/array';

const COLOR_ATTACHMENTS: number[][] = [
  [GL.BACK],
  [GL.COLOR_ATTACHMENT0],
  [GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1],
  [GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1, GL.COLOR_ATTACHMENT2],
  [GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1, GL.COLOR_ATTACHMENT2, GL.COLOR_ATTACHMENT3],
];

export interface ContextOptions {
  sharedUniformBlocks?: string[];
  requiredExtensions?: string[];
  optionalExtensions?: string[];

  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  failIfMajorPerformanceCaveat?: boolean;
  pixelRatio?: number;

  profileHud?: string | HTMLElement;
}

function isTexture(x: Texture | Texture2DDef): x is Texture {
  return (<Texture>x).handle !== undefined;
}

interface ShaderProgramsDefs {
  [index: string]: {vs: ShaderDef, fs: ShaderDef, texUnits?: TexUnits};
}

export class Context {
  gl: WebGL2RenderingContext;

  // Which optional WebGL extensions were found.
  optionalExtensions: {[index: string]: boolean} = {};

  // A place to put arbitrary per-context data.
  data = new Map<string, any>();

  // Currently bound framebuffer, or null if the back buffer is bound.
  boundFramebuffer: Framebuffer | null = null;

  // Map of uniform blocks shared between shaders.
  // Useful for things like camera matrices, lighting rigs, etc.
  // Maps from uniform block name to binding initially, which avoids the caller
  // having to specify the layout of all shared uniform blocks when
  // constructing the context. The first time a shader is constructed that uses
  // a shared uniform block, it replaces the binding value with the actual
  // shader UniformBlock instance (see the ShaderProgram code for details).
  // TODO(tom): change sharedUniformBlocks to a Map and remove numSharedUniformBlocks.
  public sharedUniformBlocks: {[index: string]: number | UniformBlock} = {};
  public numSharedUniformBlocks = 0;

  private vertexAttribBindings: {[index: string]: number} = {};
  private maxVertexAttribs: number;
  private numVertexAttribBindings = 0;

  private boundShader: ShaderProgram;

  private pixelRatio = 1;

  private profiler: Profiler;

  private allShaderPrograms = new Set<ShaderProgram>();

  constructor(public canvas: HTMLCanvasElement, options: ContextOptions) {
    options = options || {};
    this.gl = canvas.getContext('webgl2', options) as WebGL2RenderingContext;

    this.profiler = new Profiler(this, options.profileHud);

    this.pixelRatio = Math.round(
        options.pixelRatio || window.devicePixelRatio || 1);

    // TODO(tom): remove this once all GL constants have been added
    // let str = '';
    // for (let key in GL) {
    //   if (key[0] >= '0' && key[0] <= '9') {
    //     continue;
    //   }
    //   let value = GL[key]
    //   if (value != ctx.gl[key]) {
    //     str += `${key} = 0x${ctx.gl[key].toString(16)},\n`;
    //   }
    // }
    // console.log(str);

    if (!this.gl) {
      throw new Error('webgl2 isn\'t supported');
    }

    if (options.sharedUniformBlocks) {
      options.sharedUniformBlocks.forEach((name, i) => {
        this.sharedUniformBlocks[name] = i;
      });
      this.numSharedUniformBlocks = options.sharedUniformBlocks.length;
    }

    // Vertex attrib bindings.
    this.maxVertexAttribs = this.gl.getParameter(GL.MAX_VERTEX_ATTRIBS);

    const supportedExtensions = this.gl.getSupportedExtensions().join('\n  ');
    console.log(`Supported extensions:\n  ${supportedExtensions}`);

    if (options.requiredExtensions) {
      options.requiredExtensions.forEach((ext) => {
        if (!this.gl.getExtension(ext)) {
          throw new Error(`required extension ${ext} not found`);
        }
      });
    }

    if (options.optionalExtensions) {
      options.optionalExtensions.forEach((ext) => {
        this.optionalExtensions[ext] = !!this.gl.getExtension(ext);
      });
    }

    this.resizeCanvas();
  }

  get drawingBufferWidth(): number {
    return this.gl.drawingBufferWidth;
  }
  get drawingBufferHeight(): number {
    return this.gl.drawingBufferHeight;
  }

  beginFrame() {
    this.profiler.beginFrame();
  }

  profile(tag: string, fn: Function) {
    this.profiler.beginScope(tag);
    fn();
    this.profiler.endScope();
  }

  endFrame() {
    this.profiler.endFrame();
  }

  getVertexAttribBinding(name: string): number {
    let binding = this.vertexAttribBindings[name];
    if (binding === undefined) {
      if (this.numVertexAttribBindings == this.maxVertexAttribs) {
        const bindingList = Object.keys(this.vertexAttribBindings).sort().join('\n');
        throw new Error(`Maximum number of vertex attribs reached: ${this.maxVertexAttribs}.\nBindings:\n${bindingList}`);
      }
      binding = this.numVertexAttribBindings++;
      this.vertexAttribBindings[name] = binding;
    }
    return binding;
  }

  resizeCanvas() {
    const w = this.pixelRatio * this.canvas.clientWidth;
    const h = this.pixelRatio * this.canvas.clientHeight;
    if (this.canvas.width != w || this.canvas.height != h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  // TODO(tom): memoize this function
  newShader(def: ShaderDef, type: ShaderType) {
    if (!def.uri && !def.src) {
      throw new Error('shader def must have either uri or src property');
    }

    // TODO(tom): bleh
    const defaultPreamble = `#version 300 es
precision highp float;
precision highp int;
layout(std140, column_major) uniform;
`;
    let preamble = def.preamble || defaultPreamble;
    let defines = def.defines || {};

    let uri = def.uri || `__anonymous__.${type == GL.VERTEX_SHADER ? 'vs' : 'fs'}`;
    let src = def.src || shaderRegistry.getSource(def.uri);

    let preprocessed = shaderRegistry.preprocess(uri, src, defines, preamble);

    return new Shader(this, uri, type,
                      def.defines || {},
                      def.preamble || defaultPreamble,
                      preprocessed.src, preprocessed.srcMap);
  }

  newShaderProgram(vs: ShaderDef | Shader, fs: ShaderDef | Shader, texUnits?: TexUnits) {
    let v = (vs instanceof Shader) ? vs : this.newShader(vs, GL.VERTEX_SHADER);
    let f = (fs instanceof Shader) ? fs : this.newShader(fs, GL.FRAGMENT_SHADER);
    let program = new ShaderProgram(this, v, f, texUnits);
    this.allShaderPrograms.add(program);
    return program;
  }

  newShaderPrograms<T extends ShaderProgramsDefs>(defs: T): {[key in keyof T]: ShaderProgram} {
    let shaders: {[index: string]: [Shader, Shader]} = {};
    for (let key in defs) {
      let def = defs[key];
      shaders[key] = [
        this.newShader(def.vs, GL.VERTEX_SHADER),
        this.newShader(def.fs, GL.FRAGMENT_SHADER),
      ];
    }

    let programs: {[index: string]: ShaderProgram} = {};
    for (let key in defs) {
      let [vs, fs] = shaders[key];
      let texUnits = defs[key].texUnits;
      programs[key] = this.newShaderProgram(vs, fs, texUnits);
    }

    return programs as {[key in keyof T]: ShaderProgram};
  }

  recompileDirtyShaders(dirtyUri: string) {
    // Find the set of dirty shaders & programs.
    let dirtyShaders = new Set<Shader>();
    let dirtyPrograms = new Set<ShaderProgram>();
    for (let program of this.allShaderPrograms) {
      for (let shader of [program.vs, program.fs]) {
        if (!shaderRegistry.has(shader.uri)) { continue; }
        if (shader.uri == dirtyUri ||
            shaderRegistry.getTransitiveDeps(shader.uri).has(dirtyUri)) {
          dirtyShaders.add(shader);
          dirtyPrograms.add(program);
        }
      }
    }

    // Recompile dirty shaders.
    for (let shader of dirtyShaders) {
      console.log(`recompiling ${shader.uri}`);
      let preprocessed = shaderRegistry.preprocess(
          shader.uri, shaderRegistry.getSource(shader.uri),
          shader.defines, shader.preamble);
      shader.compile(preprocessed.src, preprocessed.srcMap);
    }

    // Relink dirty programs.
    for (let program of dirtyPrograms) {
      console.log(`relinking [${program.vs.uri}, ${program.fs.uri}]`);
      let texUnits: TexUnits = {};
      for (let key in program.samplers) {
        texUnits[key] = program.samplers[key].texUnit;
      }
      program.link(texUnits);
    }
  }

  async newShaderProgramsAsync<T extends ShaderProgramsDefs>(defs: T): Promise<{[key in keyof T]: ShaderProgram}> {
    let uris = new Set<string>();
    for (let key in defs) {
      if (defs[key].vs.uri) { uris.add(defs[key].vs.uri); }
      if (defs[key].fs.uri) { uris.add(defs[key].fs.uri); }
    }
    await shaderRegistry.fetch(uris);
    return this.newShaderPrograms(defs);
  }

  newVertexArray(buffers: VertexArrayDef) {
    return new VertexArray(this, buffers);
  }

  newVertexBuffer(name: string, buffer: VertexBufferDef, dynamic: boolean) {
    return new VertexBuffer(this, name, buffer, dynamic);
  }

  newTexture2D(options: Texture2DDef) {
    return new Texture2D(this, options);
  }

  newTextureCube(options: TextureCubeDef) {
    return new TextureCube(this, options);
  }

  newTexture2DFromElem(elem: HTMLImageElement) {
    return new Texture2D(this, {elem: elem});
  }

  newFramebuffer(color: null | Texture | Texture2DDef | Array<Texture | Texture2DDef>,
                 depth?: null | Texture2D | Texture2DDef, target: TextureTarget = GL.TEXTURE_2D) {
    let colorTex: null | Texture | Texture[];
    let depthTex: null | Texture2D | undefined;

    if (color) {
      if (Array.isArray(color)) {
        colorTex = new Array<Texture>();
        for (let c of color) {
          colorTex.push(this.coerceTex(c));
        };
      } else {
        colorTex = this.coerceTex(color);
      }
    } else {
      colorTex = null;
    }

    if (depth != null) {
      if ((<Texture2D>depth).handle !== undefined) {
        depthTex = <Texture2D>depth;
      } else {
        depthTex = this.newTexture2D(depth);
      }
    } else {
      depthTex = null;
    }
    return new Framebuffer(this, colorTex, depthTex, target);
  }

  setSharedUniformBlock(name: string, uniforms: UniformBlockSetting) {
    (<UniformBlock>this.sharedUniformBlocks[name]).set(this.gl, uniforms);
  }

  useProgram(shader: ShaderProgram) {
    this.boundShader = shader;
    this.gl.useProgram(shader.handle);
  }

  // Calls setUniform on the currently bound shader program.
  setUniform(..._args: any[]) {
    ShaderProgram.prototype.setUniform.apply(this.boundShader, arguments);
  }

  // Calls setUniformBlock on the currently bound shader program.
  setUniformBlock(..._args: any[]) {
    ShaderProgram.prototype.setUniformBlock.apply(this.boundShader, arguments);
  }

  // Calls bindTexture on the currently bound shader program.
  bindTexture(name: string, tex: Texture) {
    this.boundShader.bindTexture(name, tex);
  }

  bindFramebuffer(fb: Framebuffer, x: GLint = 0, y: GLint = 0, w?: GLsizei, h?: GLsizei) {
    this.boundFramebuffer = fb;
    const gl = this.gl;
    let handle;
    if (fb) {
      handle = fb.handle;
      if (w === undefined) { w = fb.width; }
      if (h === undefined) { h = fb.height; }
    } else {
      handle = null;
      if (w === undefined) { w = gl.drawingBufferWidth; }
      if (h === undefined) { h = gl.drawingBufferHeight; }
    }
    gl.bindFramebuffer(GL.FRAMEBUFFER, handle);
    gl.viewport(x, y, w, h);

    gl.drawBuffers(COLOR_ATTACHMENTS[fb == null ? 0 : fb.color.length]);
  }

  draw(vertexArray: VertexArray, type: GLenum = GL.TRIANGLES, offset = 0, count = 0) {
    const gl = this.gl;
    gl.bindVertexArray(vertexArray.handle);
    if (vertexArray.ib) {
      gl.drawElements(type, count || vertexArray.ib.numIndices, vertexArray.ib.type, offset);
    } else {
      gl.drawArrays(type, offset, count || vertexArray.numVertices);
    }
  }

  // Forcibly draw arrays even if the vertex array has an index buffer.
  // This is useful for drawing a mesh using POINTs.
  drawArrays(vertexArray: VertexArray, type: GLenum = GL.TRIANGLES, offset = 0, count = 0) {
    const gl = this.gl;
    if (vertexArray != null) {
      gl.bindVertexArray(vertexArray.handle);
    }
    gl.drawArrays(type, offset, count || vertexArray.numVertices);
  }

  // Wrap remaining GL functions.
  // TODO(tom): add the rest as needed.
  // TODO(tom): is it more efficient to bind the gl functions?
  bindSampler(unit: GLuint, sampler: WebGLSampler) { this.gl.bindSampler(unit, sampler); }
  bindBuffer(target: BufferTarget, buffer: Buffer) { this.gl.bindBuffer(target, buffer.handle); }
  bindVertexArray(va: VertexArray) { this.gl.bindVertexArray(va.handle); }
  blendColor(r: GLclampf, g: GLclampf, b: GLclampf, a: GLclampf) { this.gl.blendColor(r, g, b, a); }
  blendEquation(mode: BlendEquation = GL.FUNC_ADD) { this.gl.blendEquation(mode); }
  blendEquationSeparate(rgb: BlendEquation = GL.FUNC_ADD, a: BlendEquation = GL.FUNC_ADD) { this.gl.blendEquationSeparate(rgb, a); }
  blendFunc(src: BlendFunc = GL.ONE, dst: BlendFunc = GL.ZERO) { this.gl.blendFunc(src, dst); }
  blendFuncSeparate(srcRgb: BlendFunc = GL.ONE, dstRgb: BlendFunc = GL.ZERO, srcAlpha: BlendFunc = GL.ONE, dstAlpha: BlendFunc = GL.ONE) { this.gl.blendFuncSeparate(srcRgb, dstRgb, srcAlpha, dstAlpha); }

  clear(mask: GLbitfield) { this.gl.clear(mask); }
  clearColor(r: GLclampf = 0, g: GLclampf = 0, b: GLclampf = 0, a: GLclampf = 0) { this.gl.clearColor(r, g, b, a); }
  colorMask(r: GLboolean = true, g: GLboolean = true, b: GLboolean = true, a: GLboolean = true) { this.gl.colorMask(r, g, b, a); }
  stencilMask(mask: GLuint) { this.gl.stencilMask(mask); }
  createSampler(): WebGLSampler { return this.gl.createSampler(); }
  depthMask(flag: GLboolean = true) { this.gl.depthMask(flag); }
  depthFunc(func: CompareFunc) { this.gl.depthFunc(func); }
  disable(cap: Capability) { this.gl.disable(cap); }
  enable(cap: Capability) { this.gl.enable(cap); }

  polygonOffset(factor: GLfloat, units: GLfloat) { this.gl.polygonOffset(factor, units); }

  // TODO(tom): strongly type.
  stencilFunc(func: GLenum, ref: GLint, mask: GLuint) { this.gl.stencilFunc(func, ref, mask); }
  stencilOp(fail: GLenum, zfail: GLenum, zpass: GLenum) { this.gl.stencilOp(fail, zfail, zpass); }
  clearStencil(s: GLint) { this.gl.clearStencil(s); }

  generateMipmap(target: MipmapTarget) { this.gl.generateMipmap(target); }
  getParameter(pname: GLenum) { return this.gl.getParameter(pname); }

  // TODO(tom): strongly type the tex parameters.
  texParameteri(target: GLenum, pname: GLenum, param: GLint) { this.gl.texParameteri(target, pname, param); }
  texParameterf(target: GLenum, pname: GLenum, param: GLfloat) { this.gl.texParameterf(target, pname, param); }

  samplerParamteri(sampler: WebGLSampler, pname: SamplerParameter, param: GLint) { this.gl.samplerParameteri(sampler, pname, param); }
  samplerParamterf(sampler: WebGLSampler, pname: SamplerParameter, param: GLfloat) { this.gl.samplerParameteri(sampler, pname, param); }

  readBuffer(src: ReadBuffer) { this.gl.readBuffer(src); }

  // TODO(tom): add support for PIXEL_PACK_BUFFER to avoid blocking:
  //   https://www.khronos.org/registry/webgl/specs/latest/2.0/#3.7.10
  readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: TextureFormat,
             type: TextureType, pixels: TypedArray, offset=0) {
    this.gl.readPixels(x, y, width, height, format, type, pixels, offset);
  }

  viewport(x: GLint = 0, y: GLint = 0, w?: GLsizei, h?: GLsizei) {
    if (w === undefined) { w = this.canvas.width; }
    if (h === undefined) { h = this.canvas.height; }
    this.gl.viewport(x, y, w, h);
  }

  private coerceTex(tex: Texture2D | Texture2DDef) {
    if (isTexture(tex)) {
      return tex;
    } else {
      return this.newTexture2D(tex);
    }
  }
}
