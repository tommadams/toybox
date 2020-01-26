import {NumericArray} from 'toybox/util/array'

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
