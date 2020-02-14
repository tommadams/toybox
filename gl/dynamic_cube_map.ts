import * as mat4 from 'toybox/math/mat4';
import * as vec3 from 'toybox/math/vec3';

import {GL} from 'toybox/gl/constants';
import {Context} from 'toybox/gl/context';
import {Framebuffer} from 'toybox/gl/framebuffer';
import {Texture2D, TextureCube, TextureCubeDef} from 'toybox/gl/texture';

let tmp = vec3.newZero();

const TARGET = [
  vec3.newFromValues( 1,  0,  0),
  vec3.newFromValues(-1,  0,  0),
  vec3.newFromValues( 0,  1,  0),
  vec3.newFromValues( 0, -1,  0),
  vec3.newFromValues( 0,  0,  1),
  vec3.newFromValues( 0,  0, -1),
];

const UP = [
  vec3.newFromValues(0, -1,  0),
  vec3.newFromValues(0, -1,  0),
  vec3.newFromValues(0,  0,  1),
  vec3.newFromValues(0,  0, -1),
  vec3.newFromValues(0, -1,  0),
  vec3.newFromValues(0, -1,  0),
];

export const NAME = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

export class DynamicCubeMap {
  // Projection matrix: shared between all faces.
  proj: mat4.Type;

  // Per-face data.
  faces: DynamicCubeMap.Face[] = [];

  // Color cube map.
  color: TextureCube;

  // 2D depth texture shared between all faces.
  depth: Texture2D;

  // Resolution of each faces.
  size = 0;

  // TODO(tom): add support for depth-only cube maps.
  constructor(ctx: Context, options: TextureCubeDef,
              public near: number, public far: number) {
    // Create a cube texture.
    this.color = ctx.newTextureCube(options);

    // Create a 2D depth texture that will be shared between faces.
    // TODO(tom): support depth-only, no-depth, and different depth precisions.
    this.depth = ctx.newTexture2D({size: options.size, format: GL.DEPTH_COMPONENT16});

    let eyePos = vec3.setZero(tmp);
    this.proj = mat4.newPerspective(0.5 * Math.PI, 1, near, far);
    for (let i = 0; i < 6; ++i) {
      let fb = ctx.newFramebuffer(this.color, this.depth, GL.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      let view = mat4.newLookAt(eyePos, TARGET[i], UP[i]);
      this.faces.push(new DynamicCubeMap.Face(NAME[i], fb, view, this.proj));
    }
  }

  setOrigin(origin: vec3.ArgType) {
    for (let i = 0; i < 6; ++i) {
      let face = this.faces[i];
      let target = vec3.add(tmp, origin, TARGET[i]);
      mat4.setLookAt(face.view, origin, target, UP[i]);
      mat4.mul(face.viewProj, this.proj, face.view);
    }
  }
}

export namespace DynamicCubeMap {
  export class Face {
    viewProj = mat4.newZero();

    constructor(public name: string, public fb: Framebuffer, public view: mat4.Type, proj: mat4.Type) {
      mat4.mul(this.viewProj, proj, this.view);
    }
  }
}