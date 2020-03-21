import {NumericArray} from 'toybox/util/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

const _tmp = new Float32Array(3);

export function newZero() {
  return new Float32Array(3);
}

export function newFromValues(x: number, y: number, z: number) {
  const dst = new Float32Array(3);
  dst[0] = x;
  dst[1] = y;
  dst[2] = z;
  return dst;
}

export function newFromArray(a: ArgType) {
  const dst = new Float32Array(3);
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  return dst;
}

export function newFromVec(a: ArgType) {
  const dst = new Float32Array(3);
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  return dst;
}

export function setZero(dst: Type) {
  dst[0] = 0;
  dst[1] = 0;
  dst[2] = 0;
  return dst;
}

export function setFromValues(dst: Type, x: number, y: number, z: number) {
  dst[0] = x;
  dst[1] = y;
  dst[2] = z;
  return dst;
}

export function setFromArray(dst: Type, a: ArgType) {
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  return dst;
}

export function setFromVec(dst: Type, a: ArgType) {
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  return dst;
}

export function add(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] + b[0];
  dst[1] = a[1] + b[1];
  dst[2] = a[2] + b[2];
  return dst;
}

// dst.xyz = a.xyz + b.xyz * s;
export function addScaled(dst: Type, a: ArgType, b: ArgType, s: number) {
  dst[0] = a[0] + b[0] * s;
  dst[1] = a[1] + b[1] * s;
  dst[2] = a[2] + b[2] * s;
  return dst;
}

export function sub(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] - b[0];
  dst[1] = a[1] - b[1];
  dst[2] = a[2] - b[2];
  return dst;
}

export function mul(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] * b[0];
  dst[1] = a[1] * b[1];
  dst[2] = a[2] * b[2];
  return dst;
}

export function div(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] - b[0];
  dst[1] = a[1] - b[1];
  dst[2] = a[2] - b[2];
  return dst;
}

export function neg(dst: Type, a: ArgType) {
  dst[0] = -a[0];
  dst[1] = -a[1];
  dst[2] = -a[2];
  return dst;
}

// TODO(tom): swap s & a parameters.
export function scale(dst: Type, s: number, a: ArgType) {
  dst[0] = s * a[0];
  dst[1] = s * a[1];
  dst[2] = s * a[2];
  return dst;
}

export function pow(dst: Type, a: ArgType, p: number) {
  dst[0] = Math.pow(a[0], p);
  dst[1] = Math.pow(a[1], p);
  dst[2] = Math.pow(a[2], p);
  return dst;
}

export function dot(a: ArgType, b: ArgType) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(dst: Type, a: ArgType, b: ArgType) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  dst[0] = ay * bz - az * by;
  dst[1] = az * bx - ax * bz;
  dst[2] = ax * by - ay * bx;
  return dst;
}

export function normalize(dst: Type, a: ArgType) {
  const s = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  dst[0] = s * a[0];
  dst[1] = s * a[1];
  dst[2] = s * a[2];
  return dst;
}

export function safeNormalize(dst: Type, a: ArgType, defaultVal: ArgType) {
  const s = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  if (s < 0.0000001) {
    dst[0] = defaultVal[0];
    dst[1] = defaultVal[1];
    dst[2] = defaultVal[2];
  } else {
    dst[0] = s * a[0];
    dst[1] = s * a[1];
    dst[2] = s * a[2];
  }
  return dst;
}

export function length(a: ArgType) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function lengthSqr(a: ArgType) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

export function distance(a: ArgType, b: ArgType) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distanceSqr(a: ArgType, b: ArgType) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  return dx * dx + dy * dy + dz * dz;
}

export function abs(dst: Type, a: ArgType) {
  dst[0] = Math.abs(a[0]);
  dst[1] = Math.abs(a[1]);
  dst[2] = Math.abs(a[2]);
  return dst;
}

export function min(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = Math.min(a[0], b[0]);
  dst[1] = Math.min(a[1], b[1]);
  dst[2] = Math.min(a[2], b[2]);
  return dst;
}

export function max(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = Math.max(a[0], b[0]);
  dst[1] = Math.max(a[1], b[1]);
  dst[2] = Math.max(a[2], b[2]);
  return dst;
}

export function lerp(dst: Type, a: ArgType, b: ArgType, t: number) {
  const x = a[0], y = a[1], z = a[2];
  dst[0] = (b[0] - x) * t + x;
  dst[1] = (b[1] - y) * t + y;
  dst[2] = (b[2] - z) * t + z;
  return dst;
}

export function midpoint(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = (a[0] + b[0]) * 0.5;
  dst[1] = (a[1] + b[1]) * 0.5;
  dst[2] = (a[2] + b[2]) * 0.5;
  return dst;
}

// Sets `dst` to an unit length vector perpendicular to `a`.
// The exact direction of `dst` is undefined, but consistent: the same vector
// is calculated for all input vectors pointing in the same direction,
// regardless of their length.
// The vector returned can be used construct right-handed 3D reference frame
// from a single vector. If `a` is assumed to be the X axis, the returned vector
// should be used as the Y axis. If `a` is the Y axis, the returned vector is Z.
// If `a` is the Z axis, the returned vector is X.
// For example, to generate a full right-handed 3D reference frame from a single
// vector `v`:
//   const z = v3.normalize(v3.createZero(), v);
//   const x = v3.perpendicular(v3.createZero(), z);
//   const y = v3.cross(v3.createZero(), z, x);
export function perpendicular(dst: Type, a: ArgType) {
  const ax = Math.abs(a[0]);
  const ay = Math.abs(a[1]);
  const az = Math.abs(a[2]);
  if (Math.max(ax, ay, az) < 0.0000001) {
    return setFromValues(dst, 0, 0, 1);
  }
  const v = setZero(_tmp);
  if (ax > ay || az > ay) {
    v[1] = 1;
  } else {
    v[0] = 1;
  }
  cross(dst, v, a);
  return normalize(dst, dst);
}

// Sets dst to the vector i reflected about normal n.
// To produce correct result, n must be normalized.
export function reflect(dst: Type, i: Type, n: Type) {
  addScaled(dst, i, n, -2 * dot(n, i));
  return dst;
}
