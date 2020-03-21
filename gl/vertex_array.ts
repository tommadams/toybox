import {Context} from 'toybox/gl/context'
import {NumericArray, TypedArray, TypedArrayConstructor, TypedArrayList} from 'toybox/util/array'
import {GL, BufferUsage, DataType} from 'toybox/gl/constants'

export interface StreamDef {
  // Number of elements 
  size: number;

  // If specified, the vertex attribute name in the shader to bind to.
  // If undefined, the name is taken from the StreamDef's property name in the
  // parent object.
  attrib?: string;

  // For types BYTE and SHORT, normalizes the values to [-1, 1] if true.
  // For types BYTE and SHORT, normalizes the values to [0, 1] if true.
  // For types FLOAT and HALF_FLOAT, no effect.
  normalize?: boolean;
}

export interface BufferDef {
  dynamic?: boolean;
  type?: GLenum;
  num?: number;
  data?: NumericArray;
}

export interface SingleStreamVertexBufferDef extends BufferDef, StreamDef {}

export interface MultiStreamVertexBufferDef extends BufferDef {
  streams?: Array<StreamDef>;
}

export type VertexBufferDef = SingleStreamVertexBufferDef | MultiStreamVertexBufferDef;

export interface IndexBufferDef extends BufferDef {}

export interface VertexArrayDef {
  indices?: IndexBufferDef;
  [index: string]: VertexBufferDef;
}

function getGlType(data: NumericArray, defaultType?: DataType): DataType {
  if (Array.isArray(data) && defaultType !== undefined) { return defaultType; }
  if (data instanceof Int8Array) { return GL.BYTE; }
  if (data instanceof Uint8Array) { return GL.UNSIGNED_BYTE; }
  if (data instanceof Uint8ClampedArray) { return GL.UNSIGNED_BYTE; }
  if (data instanceof Int16Array) { return GL.SHORT; }
  if (data instanceof Uint16Array) { return GL.UNSIGNED_SHORT; }
  if (data instanceof Int32Array) { return GL.INT; }
  if (data instanceof Uint32Array) { return GL.UNSIGNED_INT; }
  if (data instanceof Float32Array) { return GL.FLOAT; }
  throw new Error(`unsupported type ${typeof(data)}`);
}

function getArrayType(glType: DataType): TypedArrayConstructor {
  switch (glType) {
  case GL.BYTE: return Int8Array;
  case GL.UNSIGNED_BYTE: return Uint8Array;
  case GL.SHORT: return Int16Array;
  case GL.UNSIGNED_SHORT: return Uint16Array;
  case GL.INT: return Int32Array;
  case GL.UNSIGNED_INT: return Uint32Array;
  case GL.FLOAT: return Float32Array;
  }
  throw new Error(`unsupported type ${glType}`);
}

function getGlSize(type: number): number {
  switch (type) {
    case GL.BYTE: case GL.UNSIGNED_BYTE: return 1;
    case GL.SHORT: case GL.UNSIGNED_SHORT: return 2;
    case GL.INT: case GL.UNSIGNED_INT: case GL.FLOAT: return 4;
    default: throw new Error(`unsupported GL type ${type}`);
  }
}


function coerceData(data: NumericArray | null, defaultType: TypedArrayConstructor): TypedArray | null {
  if (!data) {
    return null;
  } else if (Array.isArray(data)) {
    return new defaultType(data);
  }
  return data;
}

class VertexStream {
  constructor(public vb: VertexBuffer,
              public attrib: string,
              public binding: number,
              public size: number,
              public normalize = false) {}
}

function isMultiStreamVertexBufferDef(buffer: VertexBufferDef): buffer is MultiStreamVertexBufferDef {
  return (<MultiStreamVertexBufferDef>buffer).streams !== undefined;
}

export class Buffer {
  handle: WebGLBuffer;
  usage: BufferUsage;
  dynamicData: TypedArrayList = null;

  constructor(gl: WebGL2RenderingContext, public type: DataType, dynamic: boolean) {
    this.handle = gl.createBuffer();
    this.usage = dynamic ? GL.DYNAMIC_DRAW : GL.STATIC_DRAW;
  }

  protected setSubDataImpl(
      gl: WebGL2RenderingContext, target: GLenum, data: TypedArray, srcOffset: number, 
      dstOffset: number, numElems: number) {
    gl.bindBuffer(target, this.handle);
    const type = getGlType(data);
    if (this.type != type) {
      throw new Error(`data type mismatch expected ${this.type}, got ${type}`);
    }

    const elemBytes = data.BYTES_PER_ELEMENT;
    gl.bufferSubData(target, dstOffset * elemBytes, data, srcOffset, numElems);
  }
}

export class DynamicVertexBufferElement {
  [index: string]: TypedArray;
  __buffer__: TypedArray;
}

export class VertexBuffer extends Buffer {
  numVertices = 0;
  streams = new Array<VertexStream>();
  stride = 0;
  name: string;

  constructor(ctx: Context, name: string, buffer: VertexBufferDef,
              dynamic: boolean) {
    super(ctx.gl, buffer.type || getGlType(buffer.data, GL.FLOAT), dynamic);
    const data = coerceData(buffer.data, Float32Array);
    this.name = name;

    const gl = ctx.gl;

    gl.bindBuffer(GL.ARRAY_BUFFER, this.handle);

    if (isMultiStreamVertexBufferDef(buffer)) {
      for (let src of buffer.streams) {
        let attrib = src.attrib || name;
        let binding = ctx.getVertexAttribBinding(attrib);
        let stream = new VertexStream(
            this, attrib, binding, src.size, src.normalize);
        gl.enableVertexAttribArray(binding);
        this.stride += stream.size;
        this.streams.push(stream);
      }
    } else {
      let attrib = buffer.attrib || name;
      let binding = ctx.getVertexAttribBinding(attrib);
      let stream = new VertexStream(
          this, attrib, binding, buffer.size, buffer.normalize);
      gl.enableVertexAttribArray(binding);
      this.stride = stream.size;
      this.streams.push(stream);
    }

    if (data && data.length != 0) {
      this.setData(gl, data, buffer.num);
    } else if (buffer.num) {
      this.numVertices = buffer.num;
      const numBytes = buffer.num * this.stride * getGlSize(this.type);
      gl.bufferData(GL.ARRAY_BUFFER, numBytes, this.usage);
    }

    this.setVertexAttribPointers(ctx);

    if (dynamic) {
      this.dynamicData = new TypedArrayList(getArrayType(this.type),
                                            this.numVertices * this.stride);
      if (data) {
        let dst = this.dynamicData.data;
        for (let i = 0; i < data.length; ++i) {
          dst[i] = data[i];
        }
      }
    }
  }

  setData(gl: WebGL2RenderingContext, data: NumericArray, numVertices?: number) {
    gl.bindBuffer(GL.ARRAY_BUFFER, this.handle);
    data = coerceData(data, Float32Array);

    const type = getGlType(data);
    if (this.type != type) {
      throw new Error(`data type mismatch expected ${this.type}, got ${type}`);
    }

    if (numVertices === undefined) {
      if (data.length % this.stride != 0) {
        throw new Error(`data length ${data.length} is not divisible by stride ${this.stride}`);
      }
      numVertices = data.length / this.stride;
    }
    if (numVertices >= this.numVertices) {
      gl.bufferData(GL.ARRAY_BUFFER, data, this.usage);
    } else {
      gl.bufferSubData(GL.ARRAY_BUFFER, 0, data, 0);
    }
    this.numVertices = numVertices;
  }

  setSubData(
      gl: WebGL2RenderingContext, data: NumericArray, srcOffset: number,
      dstOffset: number, numVertices: number) {
    this.setSubDataImpl(
        gl, GL.ARRAY_BUFFER, coerceData(data, Float32Array),
        this.stride * srcOffset, this.stride * dstOffset,
        this.stride * numVertices);
  }

  newVertex() {
    let elemSize = getGlSize(this.type);
    let buffer = new this.dynamicData.ctor(this.stride);
    let byteOffset = 0;
    let v: DynamicVertexBufferElement = { __buffer__: buffer };
    for (let stream of this.streams) {
      v[stream.attrib] = new this.dynamicData.ctor(
          buffer.buffer, byteOffset, stream.size);
      byteOffset += elemSize * stream.size;
    }
    return v;
  }

  set(i: number, v: DynamicVertexBufferElement) {
    let n = this.stride;
    let ofs = i * n;
    let dst = this.dynamicData.data;
    let src = v.__buffer__;
    for (let i = 0; i < n; ++i) {
      dst[i + ofs] = src[i];
    }
  }

  push(v: DynamicVertexBufferElement) {
    let n = this.stride;
    let ofs = this.dynamicData.length;
    this.dynamicData.resize(ofs + n);

    let dst = this.dynamicData.data;
    let src = v.__buffer__;
    for (let i = 0; i < n; ++i) {
      dst[i + ofs] = src[i];
    }

    ++this.numVertices;
  }

  resize(numVertices: number) {
    this.dynamicData.resize(numVertices * this.stride);
    this.numVertices = numVertices;
  }

  // Used by the VertexBuffer constructor and VertexArray.bindVertexBuffer.
  setVertexAttribPointers(ctx: Context) {
    const gl = ctx.gl;
    let offset = 0;
    const bytesPerElement = getGlSize(this.type);
    for (let stream of this.streams) {
      gl.vertexAttribPointer(
          stream.binding, stream.size, this.type, stream.normalize,
          this.stride * bytesPerElement, offset * bytesPerElement);
      offset += stream.size;
    }
  }
}

export class IndexBuffer extends Buffer {
  numIndices = 0;

  constructor(ctx: Context, buffer: IndexBufferDef, dynamic: boolean) {
    super(ctx.gl, buffer.type || getGlType(buffer.data, GL.UNSIGNED_SHORT), dynamic);
    const data = coerceData(buffer.data, Uint16Array);

    const gl = ctx.gl;

    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.handle);
    if (data) {
      this.setData(gl, data, buffer.num);
    } else if (buffer.num) {
      this.numIndices = buffer.num;
      const numBytes = buffer.num * getGlSize(this.type);
      gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, numBytes, this.usage);
    }
  }

  setData(gl: WebGL2RenderingContext, data: NumericArray, numIndices?: number) {
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.handle);
    data = coerceData(data, Uint16Array);
    const type = getGlType(data);
    if (this.type != type) {
      throw new Error(`data type mismatch expected ${this.type}, got ${type}`);
    }

    this.numIndices = numIndices !== undefined ? numIndices : data.length;
    // TODO(tom): call bufferSubData to avoid uploading all of data if
    // opt_numIndices < data.length.
    gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, data, this.usage);
  }

  setSubData(
      gl: WebGL2RenderingContext, data: NumericArray, srcOffset: number,
      dstOffset: number, numIndices: number) {
    this.setSubDataImpl(
        gl, GL.ELEMENT_ARRAY_BUFFER, coerceData(data, Uint16Array),
        srcOffset, dstOffset, numIndices);
  }
}

export class VertexArray {
  handle: WebGLVertexArrayObject;

  // Number of vertices in the array.
  numVertices = 0;

  // List of all VertexBuffers in the array.
  vbs: {[index: string]: VertexBuffer} = {};

  // Optional index buffer.
  ib: IndexBuffer = null;

  constructor(public ctx: Context, buffers: VertexArrayDef) {
    const gl = ctx.gl;
    this.handle = gl.createVertexArray();
    gl.bindVertexArray(this.handle);

    let first = true;
    for (let name in buffers) {
      const buffer = buffers[name];
      if (name == 'indices') {
        this.ib = new IndexBuffer(ctx, buffer, buffer.dynamic || false);
      } else {
        let vb = new VertexBuffer(ctx, name, buffer, buffer.dynamic || false);
        this.vbs[name] = vb;
        if (first) {
          this.numVertices = vb.numVertices;
          first = false;
        } else {
          this.numVertices = Math.min(this.numVertices, vb.numVertices);
        }
      }
    }

    gl.bindVertexArray(null);
  }

  setVertexData(name: string, data: NumericArray, numVertices?: number) {
    const gl = this.ctx.gl;
    const vb = this.vbs[name];
    gl.bindVertexArray(this.handle);
    vb.setData(gl, data, numVertices);
    this.numVertices = vb.numVertices;
    for (let name in this.vbs) {
      this.numVertices = Math.min(this.numVertices, this.vbs[name].numVertices);
    }
    // TODO(tom): can we safely avoid some of these unbinds?
    gl.bindVertexArray(null);
  }

  setVertexSubData(name: string, data: NumericArray, srcOffset: number, dstOffset: number, numVertices: number) {
    const gl = this.ctx.gl;
    const vb = this.vbs[name];
    gl.bindVertexArray(this.handle);
    vb.setSubData(gl, data, srcOffset, dstOffset, numVertices);
    gl.bindVertexArray(null);
  }

  setIndexData(data: NumericArray, numIndices?: number) {
    const gl = this.ctx.gl;
    gl.bindVertexArray(this.handle);
    this.ib.setData(gl, data, numIndices);
    gl.bindVertexArray(null);
  }

  setIndexSubData(data: NumericArray, srcOffset: number, dstOffset: number, numIndices: number) {
    const gl = this.ctx.gl;
    gl.bindVertexArray(this.handle);
    this.ib.setSubData(gl, data, srcOffset, dstOffset, numIndices);
    gl.bindVertexArray(null);
  }

  bindVertexBuffer(vb: VertexBuffer) {
    if (this.vbs[vb.name] != vb) {
      const ctx = this.ctx;
      ctx.bindVertexArray(this);
      ctx.bindBuffer(GL.ARRAY_BUFFER, vb);
      vb.setVertexAttribPointers(ctx);
      this.vbs[vb.name] = vb;
    }
  }

  bindIndexBuffer(ib: IndexBuffer) {
    const ctx = this.ctx;
    ctx.bindVertexArray(this);
    ctx.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ib);
    this.ib = ib;
  }
}
