// RGB third order spherical harmonics.

import * as vec3 from 'toybox/math/vec3';
import {NumericArray} from 'toybox/util/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

const pi4 = 4 * Math.PI;
const pi16 = 16 * Math.PI;

// Radiance to irradiance coefficients.
const A_0 = Math.PI;
const A_1 = 2 * Math.PI / 3;
const A_2 = Math.PI / 4;

// First band.
const Y_0_0 = Math.sqrt(1 / pi4);

// Second band.
const Yn1_1 = Math.sqrt(3 / pi4);
const Y_0_1 = Math.sqrt(3 / pi4);
const Yp1_1 = Math.sqrt(3 / pi4);

// Third band.
const Yn2_2 = Math.sqrt(15 / pi4);
const Yn1_2 = Math.sqrt(15 / pi4);
const Y_0_2 = Math.sqrt(5 / pi16);
const Yp1_2 = Math.sqrt(15 / pi4);
const Yp2_2 = Math.sqrt(15 / pi16);

export function newZero() {
  return new Float32Array(27);
}

export function project(dst: Type, col: vec3.ArgType, dir: vec3.ArgType) {
  let x = dir[0];
  let y = dir[1];
  let z = dir[2];

  let r = col[0];
  let g = col[1];
  let b = col[2];
  let c: number;

  c = Y_0_0;
  dst[0] += c * r;
  dst[1] += c * g;
  dst[2] += c * b;

  c = Yn1_1 * y;
  dst[3] += c * r;
  dst[4] += c * g;
  dst[5] += c * b;

  c = Y_0_1 * z;
  dst[6] += c * r;
  dst[7] += c * g;
  dst[8] += c * b;

  c = Yp1_1 * x;
  dst[9]  += c * r;
  dst[10] += c * g;
  dst[11] += c * b;

  c = Yn2_2 * x * y;
  dst[12] += c * r;
  dst[13] += c * g;
  dst[14] += c * b;

  c = Yn1_2 * y * z;
  dst[15] += c * r;
  dst[16] += c * g;
  dst[17] += c * b;

  c = Y_0_2 * (3 * z * z - 1);
  dst[18] += c * r;
  dst[19] += c * g;
  dst[20] += c * b;

  c = Yp1_2 * z * x;
  dst[21] += c * r;
  dst[22] += c * g;
  dst[23] += c * b;

  c = Yp2_2 * (x * x - y * y);
  dst[24] += c * r;
  dst[25] += c * g;
  dst[26] += c * b;
}

export function radianceToIrradiance(dst: Type, src: ArgType) {
  // First band.
  dst[0]  = A_0 * src[0];
  dst[1]  = A_0 * src[1];
  dst[2]  = A_0 * src[2];

  // Second band.
  dst[3]  = A_1 * src[3];
  dst[4]  = A_1 * src[4];
  dst[5]  = A_1 * src[5];
  dst[6]  = A_1 * src[6];
  dst[7]  = A_1 * src[7];
  dst[8]  = A_1 * src[8];
  dst[9]  = A_1 * src[9];
  dst[10] = A_1 * src[10];
  dst[11] = A_1 * src[11];

  // Third band.
  dst[12] = A_2 * src[12];
  dst[13] = A_2 * src[13];
  dst[14] = A_2 * src[14];
  dst[15] = A_2 * src[15];
  dst[16] = A_2 * src[16];
  dst[17] = A_2 * src[17];
  dst[18] = A_2 * src[18];
  dst[19] = A_2 * src[19];
  dst[20] = A_2 * src[20];
  dst[21] = A_2 * src[21];
  dst[22] = A_2 * src[22];
  dst[23] = A_2 * src[23];
  dst[24] = A_2 * src[24];
  dst[25] = A_2 * src[25];
  dst[26] = A_2 * src[26];
}

export function evalDirection(dst: vec3.Type, sh: Type, dir: vec3.Type) {
  let x = dir[0];
  let y = dir[1];
  let z = dir[2];

  let c: number;

  // First band.
  c = Y_0_0;
  let r = c * sh[0];
  let g = c * sh[1];
  let b = c * sh[2];

  // Second band.
  c = Yn1_1 * y;
  r += c * sh[3];
  g += c * sh[4];
  b += c * sh[5];

  c = Y_0_1 * z;
  r += c * sh[6];
  g += c * sh[7];
  b += c * sh[8];

  c = Yp1_1 * x;
  r += c * sh[9];
  g += c * sh[10];
  b += c * sh[11];

  // Third band.
  c = Yn2_2 * x * y;
  r += c * sh[12];
  g += c * sh[13];
  b += c * sh[14];

  c = Yn1_2 * y * z;
  r += c * sh[15];
  g += c * sh[16];
  b += c * sh[17];

  c = Y_0_2 * (3 * z * z - 1);
  r += c * sh[18];
  g += c * sh[19];
  b += c * sh[20];

  c = Yp1_2 * z * x;
  r += c * sh[21];
  g += c * sh[22];
  b += c * sh[23];

  c = Yp2_2 * (x * x - y * y);
  r += c * sh[24];
  g += c * sh[25];
  b += c * sh[26];

  dst[0] = r;
  dst[1] = g;
  dst[2] = b;
}
