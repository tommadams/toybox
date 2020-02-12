import * as mat4 from 'toybox/math/mat4';
import * as vec3 from 'toybox/math/vec3';

import {GL} from 'toybox/gl/constants';
import {Context} from 'toybox/gl/context';
import {Framebuffer} from 'toybox/gl/framebuffer';
import {Texture2DDef} from 'toybox/gl/texture';

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

  // Resolution of each faces.
  size = 0;

  // TODO(tom): add an option to share the same depth buffer between all faces.
  constructor(ctx: Context, colorDef: null | Texture2DDef, depthDef: null | Texture2DDef,
              public near: number, public far: number) {
    if (colorDef != null) {
      this.checkDimensions(colorDef);
    }
    if (depthDef != null) {
      this.checkDimensions(depthDef);
    }
    vec3.setZero(tmp);
    this.proj = mat4.newPerspective(0.5 * Math.PI, 1, near, far);
    for (let i = 0; i < 6; ++i) {
      let fb = ctx.newFramebuffer(colorDef, depthDef, GL.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      let view = mat4.newLookAt(tmp, TARGET[i], UP[i]);
      this.faces.push(new DynamicCubeMap.Face(NAME[i], fb, view, this.proj));
    }
  }

  setOrigin(o: vec3.ArgType) {
    for (let i = 0; i < 6; ++i) {
      let face = this.faces[i];
      vec3.add(tmp, o, TARGET[i]);
      mat4.setLookAt(face.view, o, tmp, UP[i]);
      mat4.mul(face.viewProj, this.proj, face.view);
    }
  }

  private checkDimensions(def: Texture2DDef) {
    let w = def.width || def.size;
    let h = def.height || def.size;
    if (w != h) {
      throw new Error(`expected square faces, got${w}x${h}`);
    }
    if (this.size == 0) {
      this.size = w;
    } else if (this.size != w) {
      throw new Error(`expected ${this.size}x${this.size}, got ${w}x${h}`);
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
