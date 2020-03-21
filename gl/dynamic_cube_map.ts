import * as mat4 from 'toybox/math/mat4';
import * as vec3 from 'toybox/math/vec3';

import {GL} from 'toybox/gl/constants';
import {Context} from 'toybox/gl/context';
import {TextureInternalFormat, TextureMinFilter} from 'toybox/gl/constants';
import {Framebuffer} from 'toybox/gl/framebuffer';
import {Texture2D, TextureCube} from 'toybox/gl/texture';
import {TypedArray, TypedArrayConstructor} from 'toybox/util/array';

let tmp = vec3.newZero();

export const FORWARD = [
  vec3.newFromValues( 1,  0,  0),  // +X
  vec3.newFromValues(-1,  0,  0),  // -X
  vec3.newFromValues( 0,  1,  0),  // +Y
  vec3.newFromValues( 0, -1,  0),  // -Y
  vec3.newFromValues( 0,  0,  1),  // +Z
  vec3.newFromValues( 0,  0, -1),  // -Z
];

export const UP = [
  vec3.newFromValues( 0, -1,  0),  // +X
  vec3.newFromValues( 0, -1,  0),  // -X
  vec3.newFromValues( 0,  0,  1),  // +Y
  vec3.newFromValues( 0,  0, -1),  // -Y
  vec3.newFromValues( 0, -1,  0),  // +Z
  vec3.newFromValues( 0, -1,  0),  // -Z
];

export const RIGHT = [
  vec3.newFromValues( 0,  0, -1),  // +X
  vec3.newFromValues( 0,  0,  1),  // -X
  vec3.newFromValues( 1,  0,  0),  // +Y
  vec3.newFromValues( 1,  0,  0),  // -Y
  vec3.newFromValues( 1,  0,  0),  // +Z
  vec3.newFromValues(-1,  0,  0),  // -Z
];

export const NAME = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

export class DynamicCubeMap {
  // Projection matrix: shared between all faces.
  proj: mat4.Type;

  // Per-face data.
  faces: DynamicCubeMap.Face[] = [];

  // Color textures.
  color: TextureCube[] = [];

  // 2D depth texture shared between all faces.
  depth: Texture2D;

  /**
    * @param ctx
    * @param size cube map resolution..
    * @param format array of framebuffer formats, one per render target.
    * @param near near clip plane distance.
    * @param far far clip plane distance.
    * @param readPixels if true, allocate arrays for each face for the pixel
    *                   data to be read back into.
    */
  constructor(ctx: Context, public size: number, format: DynamicCubeMap.Format[],
              public near: number, public far: number, public readPixels=false) {
    // TODO(tom): add support for depth-only cube maps.
    // Create a cube texture.
    for (let f of format) {
      this.color.push(ctx.newTextureCube({size: size, filter: f.filter, format: f.format}));
    }

    // Create a 2D depth texture that will be shared between faces.
    // TODO(tom): support depth-only, no-depth, and different depth precisions.
    this.depth = ctx.newTexture2D({size: size, format: GL.DEPTH_COMPONENT16});

    let eyePos = vec3.setZero(tmp);
    this.proj = mat4.newPerspective(0.5 * Math.PI, 1, near, far);
    for (let i = 0; i < 6; ++i) {
      let fb = ctx.newFramebuffer(this.color, this.depth, GL.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      let view = mat4.newLookAt(eyePos, FORWARD[i], UP[i]);
      this.faces.push(new DynamicCubeMap.Face(NAME[i], fb, view, this.proj));
    }

    if (this.readPixels) {
      for (let target of this.color) {
        let numChannels: number;
        switch (target.format) {
          case GL.RGBA:
          case GL.RGBA_INTEGER:
            numChannels = 4;
            break;

          case GL.RGB:
          case GL.RGB_INTEGER:
            numChannels = 3;
            break;

          case GL.RED:
          case GL.RED_INTEGER:
            numChannels = 1;
            break;

          default:
            throw new Error(`unsupported format ${target.format}`);
        }

        let ctor: TypedArrayConstructor;
        switch (target.type) {
          case GL.UNSIGNED_BYTE:
            ctor = Uint8Array;
            break;

          case GL.UNSIGNED_SHORT_5_6_5:
          case GL.UNSIGNED_SHORT_4_4_4_4:
          case GL.UNSIGNED_SHORT_5_5_5_1:
            ctor = Uint16Array;
            break;

          case GL.FLOAT:
            ctor = Float32Array;
            break;

          default:
            throw new Error(`unsupported type ${target.type}`);
        }
        for (let [i, face] of this.faces.entries()) {
          face.pixels.push(new ctor(this.size * this.size * numChannels));
        }
      }
    }
  }

  setOrigin(origin: vec3.ArgType) {
    for (let i = 0; i < 6; ++i) {
      let face = this.faces[i];
      let target = vec3.add(tmp, origin, FORWARD[i]);
      mat4.setLookAt(face.view, origin, target, UP[i]);
      mat4.mul(face.viewProj, this.proj, face.view);
    }
  }
}

export namespace DynamicCubeMap {
  export interface Format {
    filter?: TextureMinFilter;
    format: TextureInternalFormat;
  }

  export class Face {
    viewProj = mat4.newZero();

    // If the parent cube map has requested readPixels support, pixels contains
    // TypedArrays of correct size and format for writing the data two: one for
    // each render target.
    // Empty otherwise.
    pixels: TypedArray[] = [];

    constructor(public name: string, public fb: Framebuffer, public view: mat4.Type, proj: mat4.Type) {
      mat4.mul(this.viewProj, proj, this.view);
    }
  }
}
