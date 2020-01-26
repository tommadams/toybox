import {NumericArray} from 'toybox/util/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

const _tmp = new Float32Array(2);

export function newZero() {
  return new Float32Array(2);
}

export function newFromValues(x: number, y: number) {
  const dst = new Float32Array(2);
  dst[0] = x;
  dst[1] = y;
  return dst;
}

export function newFromArray(a: ArgType) {
  const dst = new Float32Array(2);
  dst[0] = a[0];
  dst[1] = a[1];
  return dst;
}

export function newFromVec(a: ArgType) {
  const dst = new Float32Array(2);
  dst[0] = a[0];
  dst[1] = a[1];
  return dst;
}

export function setZero(dst: Type) {
  dst[0] = 0;
  dst[1] = 0;
  return dst;
}

export function setFromValues(dst: Type, x: number, y: number) {
  dst[0] = x;
  dst[1] = y;
  return dst;
}

export function setFromArray(dst: Type, a: ArgType) {
  dst[0] = a[0];
  dst[1] = a[1];
  return dst;
}

export function setFromVec(dst: Type, a: ArgType) {
  dst[0] = a[0];
  dst[1] = a[1];
  return dst;
}

export function add(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] + b[0];
  dst[1] = a[1] + b[1];
  return dst;
}

export function sub(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] - b[0];
  dst[1] = a[1] - b[1];
  return dst;
}

export function mul(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] * b[0];
  dst[1] = a[1] * b[1];
  return dst;
}

export function div(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = a[0] - b[0];
  dst[1] = a[1] - b[1];
  return dst;
}

export function neg(dst: Type, a: ArgType) {
  dst[0] = -a[0];
  dst[1] = -a[1];
  return dst;
}

// TODO(tom): swap s & a parameters.
export function scale(dst: Type, s: number, a: ArgType) {
  dst[0] = s * a[0];
  dst[1] = s * a[1];
  return dst;
}

export function dot(a: ArgType, b: ArgType) {
  return a[0] * b[0] + a[1] * b[1];
}

export function normalize(dst: Type, a: ArgType) {
  const s = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  dst[0] = s * a[0];
  dst[1] = s * a[1];
  return dst;
}

export function length(a: Type) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

export function lengthSqr(a: Type) {
  return a[0] * a[0] + a[1] * a[1];
}

export function distance(a: ArgType, b: ArgType) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSqr(a: ArgType, b: ArgType) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return dx * dx + dy * dy;
}

export function abs(dst: Type, a: ArgType) {
  dst[0] = Math.abs(a[0]);
  dst[1] = Math.abs(a[1]);
  return dst;
}

export function min(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = Math.min(a[0], b[0]);
  dst[1] = Math.min(a[1], b[1]);
  return dst;
}

export function max(dst: Type, a: ArgType, b: ArgType) {
  dst[0] = Math.max(a[0], b[0]);
  dst[1] = Math.max(a[1], b[1]);
  return dst;
}
