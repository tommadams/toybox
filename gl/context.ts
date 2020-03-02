import {Block, Shader, ShaderDefines, ShaderProgram, UniformBlockSetting} from 'toybox/gl/shader';
import {Framebuffer} from 'toybox/gl/framebuffer';
import {GL, BlendEquation, BlendFunc, BufferTarget, Capability, CompareFunc, MipmapTarget, ReadBuffer, SamplerParameter, TextureFormat, TextureTarget, TextureType} from 'toybox/gl/constants';
import {ShaderRegistry} from 'toybox/gl/shader_registry';
import {Profiler} from 'toybox/gl/profiler';
import {Texture, Texture2D, Texture2DDef, TextureCube, TextureCubeDef} from 'toybox/gl/texture';
import {Buffer, VertexArray, VertexArrayDef, VertexBuffer, VertexBufferDef} from 'toybox/gl/vertex_array';
import {memoize} from 'toybox/util/memoize';
import {TypedArray} from 'toybox/util/array';

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

export class Context {
  gl: WebGL2RenderingContext;

  // Which optional WebGL extensions were found.
  optionalExtensions: {[index: string]: boolean} = {};

  // A place to put arbitrary per-context data.
  data = new Map<string, any>();

  // Currently bound framebuffer, or null if the back buffer is bound.
  boundFramebuffer: Framebuffer | null = null;

  // TODO(tom): make shaderRegistry private, adding new public methods to
  // the Context as required.
  shaderRegistry: ShaderRegistry;

  // Map of uniform blocks shared between shaders.
  // Useful for things like camera matrices, lighting rigs, etc.
  // Maps from uniform block name to binding initially, which avoids the caller
  // having to specify the layout of all shared uniform blocks when
  // constructing the context. The first time a shader is constructed that uses
  // a shared uniform block, it replaces the binding value with the actual
  // shader Block instance (see the ShaderProgram code for details).
  // TODO(tom): change sharedUniformBlocks to a Map and remove numSharedUniformBlocks.
  public sharedUniformBlocks: {[index: string]: number | Block} = {};
  public numSharedUniformBlocks = 0;

  private vertexAttribBindings: {[index: string]: number} = {};
  private maxVertexAttribs: number;
  private numVertexAttribBindings = 0;

  private boundShader: ShaderProgram;

  private promises: Promise<any>[];

  private pixelRatio = 1;

  private profiler: Profiler;

  public init: () => void;

  public initialized = false;

  constructor(public canvas: HTMLCanvasElement, options: ContextOptions) {
    options = options || {};
    this.gl = canvas.getContext('webgl2', options) as WebGL2RenderingContext;

    this.profiler = new Profiler(this, options.profileHud);

    this.pixelRatio = Math.round(
        options.pixelRatio || window.devicePixelRatio || 1);

    // TODO(tom): remove this once all constants have been added
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

    this.promises = [new Promise((resolve) => {
      this.init = resolve;
    })];

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

    this.shaderRegistry = new ShaderRegistry(this);

    this.resizeCanvas();
  }

  get drawingBufferWidth(): number {
    return this.gl.drawingBufferWidth;
  }
  get drawingBufferHeight(): number {
    return this.gl.drawingBufferHeight;
  }

  onInit(fn: () => void) {
    let len = this.promises.length;
    Promise.all(this.promises).then(() => { 
      if (len == this.promises.length) {
        this.initialized = true;
        fn();
      } else {
        this.onInit(fn);
      }
    });
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

  newShaderProgram(vsUri: string, fsUri: string, defines?: ShaderDefines) {
    const gl = this.gl;
    const program = new ShaderProgram(this);
    const loadPromises = [this.shaderRegistry.load(vsUri),
                          this.shaderRegistry.load(fsUri)];
    const promise = Promise.all(loadPromises).then((promiseValues) => {
      const vs = this.shaderRegistry.compile(GL.VERTEX_SHADER, vsUri, defines);
      const fs = this.shaderRegistry.compile(GL.FRAGMENT_SHADER, fsUri, defines);
      program.setShaders(vs, fs);
      program.link();
    });
    this.promises.push(promise);
    return program;
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
    (<Block>this.sharedUniformBlocks[name]).set(this.gl, uniforms);
  }

  useProgram(shader: ShaderProgram) {
    this.boundShader = shader;
    this.gl.useProgram(shader.handle);
  }

  // Calls setUniform on the currently bound shader program.
  setUniform(...args: any[]) {
    ShaderProgram.prototype.setUniform.apply(this.boundShader, arguments);
  }

  // Calls setUniformBlock on the currently bound shader program.
  setUniformBlock(...args: any[]) {
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
  }

  draw(vertexArray: VertexArray, type: GLenum = GL.TRIANGLES, count = 0, offset = 0) {
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
  drawArrays(vertexArray: VertexArray, type: GLenum = GL.TRIANGLES, count = 0, offset = 0) {
    const gl = this.gl;
    gl.bindVertexArray(vertexArray.handle);
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
