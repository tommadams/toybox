import {Context} from 'toybox/gl/context'
import {DataType, GL, TextureInternalFormat, TextureMinFilter, TextureWrap} from 'toybox/gl/constants'

export function inferType(internalFormat: TextureInternalFormat) {
  switch (internalFormat) {
    case GL.RGBA4:
      return GL.UNSIGNED_SHORT_4_4_4_4

    case GL.RGB5_A1:
      return GL.UNSIGNED_SHORT_5_5_5_1

    case GL.RGB565:
      return GL.UNSIGNED_SHORT_5_6_5

    case GL.RGBA16UI: case GL.RG16UI: case GL.R16UI: case GL.RGB16UI:
    case GL.DEPTH_COMPONENT16:
      return GL.UNSIGNED_SHORT

    case GL.RGBA8_SNORM: case GL.RGB8_SNORM: case GL.RG8_SNORM: case GL.RGBA8I:
    case GL.RGB8I: case GL.RG8I: case GL.R8_SNORM: case GL.R8I:
      return GL.BYTE

    case GL.RGBA16I: case GL.RGB16I: case GL.RG16I: case GL.R16I:
      return GL.SHORT;


    case GL.RGBA8: case GL.RGB8: case GL.RG8: case GL.R8: case GL.SRGB8_ALPHA8:
    case GL.SRGB8: case GL.RGBA8UI: case GL.RGB8UI: case GL.LUMINANCE_ALPHA:
    case GL.LUMINANCE: case GL.RG8UI: case GL.R8UI: case GL.RGBA: case GL.RGB:
    case GL.ALPHA:
      return GL.UNSIGNED_BYTE

    case GL.RGB10_A2: case GL.RGB10_A2UI:
      return GL.UNSIGNED_INT_2_10_10_10_REV

    case GL.RGBA16F: case GL.RGB16F: case GL.RG16F: case GL.R16F:
      return GL.HALF_FLOAT

    case GL.RGBA32F: case GL.RGB32F: case GL.RG32F: case GL.R11F_G11F_B10F:
    case GL.RGB9_E5: case GL.R32F: case GL.DEPTH_COMPONENT32F:
      return GL.FLOAT

    case GL.RGBA32UI: case GL.RG32UI: case GL.R32UI: case GL.RGB32UI:
    case GL.DEPTH_COMPONENT24:
      return GL.UNSIGNED_INT

    case GL.DEPTH24_STENCIL8:
      return GL.UNSIGNED_INT_24_8

    case GL.DEPTH32F_STENCIL8:
      return GL.FLOAT_32_UNSIGNED_INT_24_8_REV

    case GL.RGBA32I: case GL.RGB32I: case GL.RG32I: case GL.R32I:
      return GL.INT;

    case GL.R11F_G11F_B10F:
      return GL.UNSIGNED_INT_10F_11F_11F_REV

    case GL.RGB9_E5:
      return GL.UNSIGNED_INT_5_9_9_9_REV
  }

  throw new Error(`unrecognized internal format ${internalFormat}`);
}

export function inferFormat(internalFormat: TextureInternalFormat) {
  switch (internalFormat) {
    case GL.RGBA8: case GL.RGB5_A1: case GL.RGBA4: case GL.SRGB8_ALPHA8:
    case GL.RGBA8_SNORM: case GL.RGBA4: case GL.RGB5_A1: case GL.RGB10_A2:
    case GL.RGB5_A1: case GL.RGBA16F: case GL.RGBA32F: case GL.RGBA16F:
      return GL.RGBA;

    case GL.RGBA8UI: case GL.RGBA8I: case GL.RGBA16UI: case GL.RGBA16I:
    case GL.RGBA32UI: case GL.RGBA32I: case GL.RGB10_A2UI:
      return GL.RGBA_INTEGER

    case GL.RGB8: case GL.RGB565: case GL.SRGB8: case GL.RGB8_SNORM:
    case GL.RGB565: case GL.R11F_G11F_B10F: case GL.RGB9_E5: case GL.RGB16F:
    case GL.R11F_G11F_B10F: case GL.RGB9_E5: case GL.RGB32F: case GL.RGB16F:
    case GL.R11F_G11F_B10F: case GL.RGB9_E5:
      return GL.RGB;

    case GL.RGB8UI: case GL.RGB8I: case GL.RGB16UI: case GL.RGB16I:
    case GL.RGB32UI: case GL.RGB32I:
      return GL.RGB_INTEGER

    case GL.RG8: case GL.RG8_SNORM: case GL.RG16F: case GL.RG32F: case GL.RG16F:
      return GL.RG

    case GL.RG8UI: case GL.RG8I: case GL.RG16UI: case GL.RG16I: case GL.RG32UI:
    case GL.RG32I:
      return GL.RG_INTEGER

    case GL.R8: case GL.R8_SNORM: case GL.R16F: case GL.R32F: case GL.R16F:
      return GL.RED

    case GL.R8UI: case GL.R8I: case GL.R16UI: case GL.R16I: case GL.R32UI:
    case GL.R32I:
      return GL.RED_INTEGER

    case GL.DEPTH_COMPONENT16: case GL.DEPTH_COMPONENT24:
    case GL.DEPTH_COMPONENT32F:
      return GL.DEPTH_COMPONENT

    case GL.DEPTH24_STENCIL8:
    case GL.DEPTH32F_STENCIL8:
      return GL.DEPTH_STENCIL

    case GL.RGBA:
      return GL.RGBA;

    case GL.RGB:
      return GL.RGB

    case GL.LUMINANCE_ALPHA:
      return GL.LUMINANCE_ALPHA;

    case GL.LUMINANCE:
      return GL.LUMINANCE;

    case GL.ALPHA:
      return GL.ALPHA
  } 

  throw new Error(`unrecognized internal format ${internalFormat}`);
}

export interface Texture2DDef {
  width?: number;
  height?: number;
  size?: number;
  filter?: TextureMinFilter;
  wrap?: TextureWrap;
  format?: TextureInternalFormat;
  elem?: HTMLImageElement;
  data?: ArrayBufferView;
  shadow?: boolean;
}

// TODO(tom): sampler objects
export class Texture2D {
  public handle: WebGLTexture;
  public width: number;
  public height: number;
  public filter: number;
  public wrap: number;
  public internalFormat: TextureInternalFormat;
  public compareMode: number;

  constructor(ctx: Context, options: Texture2DDef) {
    const gl = ctx.gl;
    this.handle = gl.createTexture();
    this.width = options.width || options.size || 0;
    this.height = options.height || options.size || 0;
    this.filter = options.filter || GL.NEAREST;
    this.wrap = options.wrap || GL.CLAMP_TO_EDGE;
    this.internalFormat = options.format;
    this.compareMode = GL.NONE;

    let type = inferType(this.internalFormat);
    let format = inferFormat(this.internalFormat);

    gl.bindTexture(GL.TEXTURE_2D, this.handle);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, this.wrap);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, this.wrap);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, this.filter);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, getMagFilter(this.filter));

    if (options.elem) {
      this.width = options.elem.width;
      this.height = options.elem.height;
      gl.texImage2D(GL.TEXTURE_2D, 0, format, format, type, options.elem);
    } else {
      if (!this.internalFormat) {
        throw new Error(`interalFormat is required`);
      }
      const data = options.data || null;
      if (options.shadow) {
        this.compareMode = GL.COMPARE_REF_TO_TEXTURE;
        gl.texParameteri(
            GL.TEXTURE_2D, GL.TEXTURE_COMPARE_MODE, this.compareMode);
        gl.texParameteri(
            GL.TEXTURE_2D, GL.TEXTURE_COMPARE_FUNC, GL.LEQUAL);
      }
      gl.texImage2D(
          GL.TEXTURE_2D, 0, this.internalFormat, this.width, this.height, 0,
          format, type, data);
    }
  }
}

export function getMagFilter(minFilter: TextureMinFilter) {
  if (minFilter == GL.LINEAR_MIPMAP_NEAREST ||
      minFilter == GL.LINEAR_MIPMAP_LINEAR) {
    return GL.LINEAR;
  } else if (minFilter == GL.NEAREST_MIPMAP_NEAREST ||
             minFilter == GL.NEAREST_MIPMAP_LINEAR) {
    return GL.NEAREST;
  }
  return minFilter;
}
