import * as m4 from 'toybox/math/mat4'
import * as v3 from 'toybox/math/vec3'
import {NumericArray} from 'toybox/util/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

// Quaternion is : a*i + b*j + c*k + d
// quat[0] = a
// quat[1] = b
// quat[2] = c
// quat[3] = d


export function newZero() {
  return new Float32Array(4);
}


export function newIdentity() {
  const dst = new Float32Array(4);
  dst[3] = 1;
  return dst;
}


export function newFromValues(a: number, b: number, c: number, d: number) {
  const dst = new Float32Array(4);
  dst[0] = a;
  dst[1] = b;
  dst[2] = c;
  dst[3] = d;
  return dst;
}


export function newFromQuat(q: ArgType) {
  const dst = new Float32Array(4);
  dst[0] = q[0];
  dst[1] = q[1];
  dst[2] = q[2];
  dst[3] = q[3];
  return dst;
}


export function newFromArray(a: ArgType) {
  const dst = new Float32Array(4);
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  dst[3] = a[3];
  return dst;
}


export function newFromMat4(m: m4.ArgType) {
  return setFromMat4(new Float32Array(4), m);
}


export function newFromAxisAngle(axis: v3.ArgType, angle: number) {
  return setFromAxisAngle(new Float32Array(4), axis, angle);
}


export function setIdentity(dst: Type) {
  dst[0] = 0;
  dst[1] = 0;
  dst[2] = 0;
  dst[3] = 1;
  return dst;
}


export function setFromValues(dst: Type, a: number, b: number, c: number, d: number) {
  dst[0] = a;
  dst[1] = b;
  dst[2] = c;
  dst[3] = d;
  return dst;
}


export function setFromQuat(dst: Type, q: ArgType) {
  dst[0] = q[0];
  dst[1] = q[1];
  dst[2] = q[2];
  dst[3] = q[3];
  return dst;
}


export function setFromArray(dst: Type, a: ArgType) {
  dst[0] = a[0];
  dst[1] = a[1];
  dst[2] = a[2];
  dst[3] = a[3];
  return dst;
}


export function setFromMat4(dst: Type, m: m4.ArgType) {
  const sx = m[0], sy = m[5], sz = m[10];
  dst[3] = Math.sqrt(Math.max(0, 1 + sx + sy + sz)) / 2;
  dst[0] = Math.sqrt(Math.max(0, 1 + sx - sy - sz)) / 2;
  dst[1] = Math.sqrt(Math.max(0, 1 - sx + sy - sz)) / 2;
  dst[2] = Math.sqrt(Math.max(0, 1 - sx - sy + sz)) / 2;
  dst[0] = (m[6] - m[9] < 0) != (dst[0] < 0) ? -dst[0] : dst[0];
  dst[1] = (m[8] - m[2] < 0) != (dst[1] < 0) ? -dst[1] : dst[1];
  dst[2] = (m[1] - m[4] < 0) != (dst[2] < 0) ? -dst[2] : dst[2];
  return dst;
}


export function setFromAxisAngle(dst: Type, axis: v3.ArgType, angle: number) {
  const ha = 0.5 * angle;
  const s = Math.sin(ha);
  return setFromValues(dst, s * axis[0], s * axis[1], s * axis[2], Math.cos(ha));
}


export function conjugate(dst: Type, q: ArgType) {
  dst[0] = -q[0];
  dst[1] = -q[1];
  dst[2] = -q[2];
  dst[3] = q[3];
  return dst;
}


export function normalize(dst: Type, q: ArgType) {
  const a = q[0], b = q[1], c = q[2], d = q[3];
  const s = 1 / Math.sqrt(a * a + b * b + c * c + d * d);
  dst[0] = s * a;
  dst[1] = s * b;
  dst[2] = s * c;
  dst[3] = s * d;
  return dst;
}


export function dot(q0: ArgType, q1: ArgType) {
  return q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];
}


export function mul(dst: Type, q0: ArgType, q1: ArgType) {
  const a0 = q0[0], b0 = q0[1], c0 = q0[2], d0 = q0[3];
  const a1 = q1[0], b1 = q1[1], c1 = q1[2], d1 = q1[3];
  dst[0] = d0 * a1 + a0 * d1 + b0 * c1 - c0 * b1;
  dst[1] = d0 * b1 - a0 * c1 + b0 * d1 + c0 * a1;
  dst[2] = d0 * c1 + a0 * b1 - b0 * a1 + c0 * d1;
  dst[3] = d0 * d1 - a0 * a1 - b0 * b1 - c0 * c1;
  return dst;
}


export function slerp(dst: Type, q0: ArgType, q1: ArgType, t: number) {
  let c = dot(q0, q1);
  if (c > 1 || c < -1) {
    return setFromQuat(dst, q1);
  }

  // There are 2 ways to interpolate between two quaternions, choose the shortest.
  let factor = 1;
  if (c < 0) {
    factor = -1;
    c = -c;
  }

  const ang = Math.acos(c);
  let c0, c1;
  if (ang > 0.0000001) {
    // Normal case.
    const is = 1 / Math.sin(ang);
    c0 = Math.sin((1 - t) * ang) * is;
    c1 = factor * Math.sin(t * ang) * is;
  } else {
    // Angle is very small, just do a linear interpolation.
    c0 = (1 - t);
    c1 = t;
  }

  dst[0] = q0[0] * c0 + q1[0] * c1;
  dst[1] = q0[1] * c0 + q1[1] * c1;
  dst[2] = q0[2] * c0 + q1[2] * c1;
  dst[3] = q0[3] * c0 + q1[3] * c1;
  return dst;
}
