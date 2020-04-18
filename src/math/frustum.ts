import {mat4} from './mat4';
import {vec3} from './vec3';
import {vec4} from './vec4';

export namespace frustum {

export type Type = Float32Array[];

export const enum Planes {
  LRTB = 4,
  LRTBN = 5,
  LRTBNF = 6,
}

export function newZero(planes: Planes) {
  switch (planes) {
    case Planes.LRTB:
      return [vec4.newZero(), vec4.newZero(), vec4.newZero(), vec4.newZero()];
    case Planes.LRTBN:
      return [vec4.newZero(), vec4.newZero(), vec4.newZero(), vec4.newZero(),
              vec4.newZero()];
    case Planes.LRTBNF:
      return [vec4.newZero(), vec4.newZero(), vec4.newZero(), vec4.newZero(),
              vec4.newZero(), vec4.newZero()];
  }
}

export function newUnnormalizedFromProj(planes: Planes, proj: mat4.Type) {
  return setUnnormalizedFromProj(newZero(planes), proj);
}

export function setUnnormalizedFromProj(dst: Type, proj: mat4.Type) {
  let p00 = proj[0], p01 = proj[1], p02 = proj[2], p03 = proj[3];
  let p10 = proj[4], p11 = proj[5], p12 = proj[6], p13 = proj[7];
  let p20 = proj[8], p21 = proj[9], p22 = proj[10], p23 = proj[11];
  let p30 = proj[12], p31 = proj[13], p32 = proj[14], p33 = proj[15];

  vec4.setFromValues(dst[0], p03 + p00, p13 + p10, p23 + p20, p33 + p30);
  vec4.setFromValues(dst[1], p03 - p00, p13 - p10, p23 - p20, p33 - p30);
  vec4.setFromValues(dst[2], p03 - p01, p13 - p11, p23 - p21, p33 - p31);
  vec4.setFromValues(dst[3], p03 + p01, p13 + p11, p23 + p21, p33 + p31);

  if (dst.length > 4) {
    vec4.setFromValues(dst[4], p02, p12, p22, p32);
    if (dst.length > 5) {
      vec4.newFromValues(p03 - p02, p13 - p12, p23 - p22, p33 - p32);
    }
  }

  return dst;
}

export function newNormalizedFromProj(planes: Planes, proj: mat4.Type) {
  return setNormalizedFromProj(newZero(planes), proj);
}

export function setNormalizedFromProj(dst: Type, proj: mat4.Type) {
  setUnnormalizedFromProj(dst, proj);
  for (let p of dst) {
    // Note we scale by the length of the first three elements of the plane
    // only (its normal).
    let s = 1 / vec3.length(p);
    vec4.scale(p, p, s);
  }
  return dst;
}

export function newPerspective(fieldOfViewY: number, aspect: number) {
  // TODO(tom): Add support for near and far planes.
  let t = 0.5 * fieldOfViewY;
  let s = Math.sin(t);
  let c = Math.cos(t);
  let bottom = vec4.newFromValues(0, c, -s, 0);
  let top = vec4.newFromValues(0, -c, -s, 0);

  t = Math.atan(aspect * Math.tan(t));
  s = Math.sin(t);
  c = Math.cos(t);
  let left = vec4.newFromValues(c, 0, -s, 0);
  let right = vec4.newFromValues(-c, 0, -s, 0);

  return [left, right, top, bottom];
}

}
