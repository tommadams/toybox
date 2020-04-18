// RGB third order spherical harmonics.

import {vec3} from './vec3';

export namespace sh3 {

export type Type = Float32Array;

const pi4 = 4 * Math.PI;
const pi16 = 16 * Math.PI;

// Radiance to irradiance coefficients.
const A_0 = Math.PI;
const A_1 = 2 * Math.PI / 3;
const A_2 = Math.PI / 4;

// First band.
const Y_0_0 = Math.sqrt(1 / pi4);

// Second band.
const Y_1n1 = Math.sqrt(3 / pi4);
const Y_1_0 = Math.sqrt(3 / pi4);
const Y_1p1 = Math.sqrt(3 / pi4);

// Third band.
const Y_2n2 = Math.sqrt(15 / pi4);
const Y_2n1 = Math.sqrt(15 / pi4);
const Y_2_0 = Math.sqrt(5 / pi16);
const Y_2p1 = Math.sqrt(15 / pi4);
const Y_2p2 = Math.sqrt(15 / pi16);

// console.log(pi4, pi16);
// console.log(A_0, A_1, A_2);
// console.log(Y_0_0);
// console.log(Y_1n1, Y_1_0, Y_1p1);
// console.log(Y_2n2, Y_2n1, Y_2_0, Y_2p1, Y_2p2);

export function newZero() {
  return new Float32Array(27);
}

export function setZero(dst: Type) {
  dst.fill(0);
}

export function setFromSh(dst: Type, src: Type) {
  dst[0] = src[0];
  dst[1] = src[1];
  dst[2] = src[2];
  dst[3] = src[3];
  dst[4] = src[4];
  dst[5] = src[5];
  dst[6] = src[6];
  dst[7] = src[7];
  dst[8] = src[8];
  dst[9] = src[9];

  dst[10] = src[10];
  dst[11] = src[11];
  dst[12] = src[12];
  dst[13] = src[13];
  dst[14] = src[14];
  dst[15] = src[15];
  dst[16] = src[16];
  dst[17] = src[17];
  dst[18] = src[18];
  dst[19] = src[19];

  dst[20] = src[20];
  dst[21] = src[21];
  dst[22] = src[22];
  dst[23] = src[23];
  dst[24] = src[24];
  dst[25] = src[25];
  dst[26] = src[26];
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

  c = Y_1n1 * y;
  dst[3] += c * r;
  dst[4] += c * g;
  dst[5] += c * b;

  c = Y_1_0 * z;
  dst[6] += c * r;
  dst[7] += c * g;
  dst[8] += c * b;

  c = Y_1p1 * x;
  dst[9]  += c * r;
  dst[10] += c * g;
  dst[11] += c * b;

  c = Y_2n2 * x * y;
  dst[12] += c * r;
  dst[13] += c * g;
  dst[14] += c * b;

  c = Y_2n1 * y * z;
  dst[15] += c * r;
  dst[16] += c * g;
  dst[17] += c * b;

  c = Y_2_0 * (3 * z * z - 1);
  dst[18] += c * r;
  dst[19] += c * g;
  dst[20] += c * b;

  c = Y_2p1 * z * x;
  dst[21] += c * r;
  dst[22] += c * g;
  dst[23] += c * b;

  c = Y_2p2 * (x * x - y * y);
  dst[24] += c * r;
  dst[25] += c * g;
  dst[26] += c * b;
}

export function radianceToIrradiance(dst: Type, src: Type) {
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

export function reconstruct(dst: vec3.Type, sh: Type, dir: vec3.Type) {
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
  c = Y_1n1 * y;
  r += c * sh[3];
  g += c * sh[4];
  b += c * sh[5];

  c = Y_1_0 * z;
  r += c * sh[6];
  g += c * sh[7];
  b += c * sh[8];

  c = Y_1p1 * x;
  r += c * sh[9];
  g += c * sh[10];
  b += c * sh[11];

  // Third band.
  c = Y_2n2 * x * y;
  r += c * sh[12];
  g += c * sh[13];
  b += c * sh[14];

  c = Y_2n1 * y * z;
  r += c * sh[15];
  g += c * sh[16];
  b += c * sh[17];

  c = Y_2_0 * (3 * z * z - 1);
  r += c * sh[18];
  g += c * sh[19];
  b += c * sh[20];

  c = Y_2p1 * z * x;
  r += c * sh[21];
  g += c * sh[22];
  b += c * sh[23];

  c = Y_2p2 * (x * x - y * y);
  r += c * sh[24];
  g += c * sh[25];
  b += c * sh[26];

  dst[0] = r;
  dst[1] = g;
  dst[2] = b;
}

export function lerp(dst: Type, a: Type, b: Type, t: number) {
  let s = 1 - t;
  dst[0] = s * a[0] + t * b[0];
  dst[1] = s * a[1] + t * b[1];
  dst[2] = s * a[2] + t * b[2];
  dst[3] = s * a[3] + t * b[3];
  dst[4] = s * a[4] + t * b[4];
  dst[5] = s * a[5] + t * b[5];
  dst[6] = s * a[6] + t * b[6];
  dst[7] = s * a[7] + t * b[7];
  dst[8] = s * a[8] + t * b[8];
  dst[9] = s * a[9] + t * b[9];

  dst[10] = s * a[10] + t * b[10];
  dst[11] = s * a[11] + t * b[11];
  dst[12] = s * a[12] + t * b[12];
  dst[13] = s * a[13] + t * b[13];
  dst[14] = s * a[14] + t * b[14];
  dst[15] = s * a[15] + t * b[15];
  dst[16] = s * a[16] + t * b[16];
  dst[17] = s * a[17] + t * b[17];
  dst[18] = s * a[18] + t * b[18];
  dst[19] = s * a[19] + t * b[19];

  dst[20] = s * a[20] + t * b[20];
  dst[21] = s * a[21] + t * b[21];
  dst[22] = s * a[22] + t * b[22];
  dst[23] = s * a[23] + t * b[23];
  dst[24] = s * a[24] + t * b[24];
  dst[25] = s * a[25] + t * b[25];
  dst[26] = s * a[26] + t * b[26];
}

/**
 * Bilinear interpolation of four SH on a unit square:
 *   a---b
 *   |   |
 *   c---d
 * @param a top-left SH
 * @param b top-right SH
 * @param c bottom-left SH
 * @param d bottom-right SH
 * @param u X interpolation factor in the range [0, 1]
 * @param v Y interpolation factor in the range [0, 1]
 */
export function bilerp(dst: Type, a: Type, b: Type, c: Type, d: Type, u: number, v: number) {
  let iu = 1 - u;
  let iv = 1 - v;
  for (let i = 0; i < 26; ++i) {
    dst[i] = iv * (iu * a[i] + u * b[i]) +
              v * (iu * c[i] + u * d[i]);
  }
}

}
