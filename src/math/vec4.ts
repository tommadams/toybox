import {NumericArray} from '../types/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

export function newZero() {
  return new Float32Array(4);
}

export function newFromValues(x: number, y: number, z: number, w: number) {
  let dst = new Float32Array(4);
  dst[0] = x;
  dst[1] = y;
  dst[2] = z;
  dst[3] = w;
  return dst;
}

export function setFromValues(dst: Type, x: number, y: number, z: number, w: number) {
  dst[0] = x;
  dst[1] = y;
  dst[2] = z;
  dst[3] = w;
  return dst;
}

export function normalize(dst: Type, a: ArgType) {
  const s = 1 / Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  dst[0] = s * a[0];
  dst[1] = s * a[1];
  dst[2] = s * a[2];
  dst[3] = s * a[3];
  return dst;
}

export function scale(dst: Type, a: ArgType, s: number) {
  dst[0] = a[0] * s;
  dst[1] = a[1] * s;
  dst[2] = a[2] * s;
  dst[3] = a[3] * s;
  return dst;
}

export function toString(v: ArgType, precision=3, sep=' ') {
  let a = v[0].toFixed(precision);
  let b = v[1].toFixed(precision);
  let c = v[2].toFixed(precision);
  let d = v[3].toFixed(precision);
  if (a[0] != '-') { a = ' ' + a; }
  if (b[0] != '-') { b = ' ' + b; }
  if (c[0] != '-') { c = ' ' + c; }
  if (d[0] != '-') { d = ' ' + d; }
  return `[${a}${sep}${b}${sep}${c}${sep}${d}]`;
}
