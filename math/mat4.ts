import * as qt from 'toybox/math/quat'
import * as v3 from 'toybox/math/vec3'
import * as v4 from 'toybox/math/vec4'
import {NumericArray} from 'toybox/util/array'

export type Type = Float32Array;
export type ArgType = NumericArray;

const _x = v3.newZero();
const _y = v3.newZero();
const _z = v3.newZero();

export function newZero() {
  return new Float32Array(16);
}

export function newIdentity() {
  return setIdentity(new Float32Array(16));
}

export function newFromAxisAngle(axis: v3.Type, angle: number) {
  return setFromAxisAngle(new Float32Array(16), axis, angle);
}

export function newFromArray(a: Float32Array) {
  return setFromArray(new Float32Array(16), a);
}

export function newFromValues(
    a00: number, a01: number, a02: number, a03: number,
    a10: number, a11: number, a12: number, a13: number,
    a20: number, a21: number, a22: number, a23: number,
    a30: number, a31: number, a32: number, a33: number) {
  const dst = new Float32Array(16);
  dst[0]  = a00; dst[1]  = a01; dst[2]  = a02; dst[3]  = a03;
  dst[4]  = a10; dst[5]  = a11; dst[6]  = a12; dst[7]  = a13;
  dst[8]  = a20; dst[9]  = a21; dst[10] = a22; dst[11] = a23;
  dst[12] = a30; dst[13] = a31; dst[14] = a32; dst[15] = a33;
  return dst;
}

export function newFromMat(a: ArgType) {
  return setFromMat(new Float32Array(16), a);
}
export function newFromQuat(q: qt.ArgType) {
  return setFromQuat(new Float32Array(16), q);
}

export function newFromRows(a: v4.ArgType, b: v4.ArgType, c: v4.ArgType, d: v4.ArgType) {
  return setFromRows(new Float32Array(16), a, b, c, d);
}

export function newScale(x: number, y: number, z: number) {
  return setScale(new Float32Array(16), x, y, z);
}

export function newTranslate(x: number, y: number, z: number) {
  return setTranslate(new Float32Array(16), x, y, z);
}

export function newOrtho(left: number, right: number, top: number, bottom: number, near: number, far: number) {
  return setOrtho(new Float32Array(16), left, right, top, bottom, near, far);
}

export function newPerspective(fovy: number, aspect: number, near: number, far: number) {
  return setPerspective(new Float32Array(16), fovy, aspect, near, far);
}

export function newLookAt(eye: v3.ArgType, target: v3.ArgType, up: v3.ArgType) {
  return setLookAt(new Float32Array(16), eye, target, up);
}

export function newRotateX(a: number) {
  return setRotateX(new Float32Array(16), a);
}

export function newRotateY(a: number) {
  return setRotateY(new Float32Array(16), a);
}

export function newRotateZ(a: number) {
  return setRotateZ(new Float32Array(16), a);
}

export function newAffine(x: v3.ArgType, y: v3.ArgType, z: v3.ArgType, t: v3.ArgType) {
  return setAffine(new Float32Array(16), x, y, z, t);
}


export function setZero(dst: Type) {
  dst.fill(0);
  return dst;
}


export function setIdentity(dst: Type) {
  dst.fill(0);
  dst[0] = 1; dst[5] = 1; dst[10] = 1; dst[15] = 1;
  return dst;
}


export function setFromArray(dst: Type, a: ArgType) {
  dst[0] = a[0]; dst[1] = a[1]; dst[2] = a[2]; dst[3] = a[3];
  dst[4] = a[4]; dst[5] = a[5]; dst[6] = a[6]; dst[7] = a[7];
  dst[8] = a[8]; dst[9] = a[9]; dst[10] = a[10]; dst[11] = a[11];
  dst[12] = a[12]; dst[13] = a[13]; dst[14] = a[14]; dst[15] = a[15];
  return dst;
}


export function setFromAxisAngle(dst: Type, axis: v3.ArgType, angle: number) {
  const c = Math.cos(angle);
  const d = 1 - c;
  const s = Math.sin(angle);
  const ax = axis[0];
  const ay = axis[1];
  const az = axis[2];

  dst[0] = ax * ax * d + c;
  dst[1] = ax * ay * d + az * s;
  dst[2] = ax * az * d - ay * s;
  dst[3] = 0;
  dst[4] = ax * ay * d - az * s;
  dst[5] = ay * ay * d + c;
  dst[6] = ay * az * d + ax * s;
  dst[7] = 0;
  dst[8] = ax * az * d + ay * s;
  dst[9] = ay * az * d - ax * s;
  dst[10] = az * az * d + c;
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;
  return dst;
}


export function setFromQuat(dst: Type, q: qt.ArgType) {
  const a = q[0], b = q[1], c = q[2], d = q[3];
  const a2 = 2 * a, b2 = 2 * b, c2 = 2 * c;
  const da = a2 * d;
  const db = b2 * d;
  const dc = c2 * d;
  const aa = a2 * a;
  const ab = b2 * a;
  const ac = c2 * a;
  const bb = b2 * b;
  const bc = c2 * b;
  const cc = c2 * c;

  dst[0] = 1 - (bb + cc);
  dst[1] = ab + dc;
  dst[2] = ac - db;
  dst[3] = 0;
  dst[4] = ab - dc;
  dst[5] = 1 - (aa + cc);
  dst[6] = bc + da;
  dst[7] = 0;
  dst[8] = ac + db;
  dst[9] = bc - da;
  dst[10] = 1 - (aa + bb);
  dst[11] = 0;
  dst[12] = 0;
  dst[13] = 0;
  dst[14] = 0;
  dst[15] = 1;
  return dst;
}


export function setFromValues(
    dst: Type,
    a00: number, a01: number, a02: number, a03: number,
    a10: number, a11: number, a12: number, a13: number,
    a20: number, a21: number, a22: number, a23: number,
    a30: number, a31: number, a32: number, a33: number) {
  dst[0]  = a00; dst[1]  = a01; dst[2]  = a02; dst[3]  = a03;
  dst[4]  = a10; dst[5]  = a11; dst[6]  = a12; dst[7]  = a13;
  dst[8]  = a20; dst[9]  = a21; dst[10] = a22; dst[11] = a23;
  dst[12] = a30; dst[13] = a31; dst[14] = a32; dst[15] = a33;
  return dst;
}


export function setFromMat(dst: Type, a: ArgType) {
  dst[0] = a[0]; dst[1] = a[1]; dst[2] = a[2]; dst[3] = a[3];
  dst[4] = a[4]; dst[5] = a[5]; dst[6] = a[6]; dst[7] = a[7];
  dst[8] = a[8]; dst[9] = a[9]; dst[10] = a[10]; dst[11] = a[11];
  dst[12] = a[12]; dst[13] = a[13]; dst[14] = a[14]; dst[15] = a[15];
  return dst;
}


export function setFromRows(dst: Type, a: v4.ArgType, b: v4.ArgType, c: v4.ArgType, d: v4.ArgType) {
  dst[0] = a[0]; dst[1] = a[1]; dst[2] = a[2]; dst[3] = a[3];
  dst[4] = b[0]; dst[5] = b[1]; dst[6] = b[2]; dst[7] = b[3];
  dst[8] = c[0]; dst[9] = c[1]; dst[10] = c[2]; dst[11] = c[3];
  dst[12] = d[0]; dst[13] = d[1]; dst[13] = d[2]; dst[14] = d[3];
  return dst;
}


export function setScale(dst: Type, x: number, y: number, z: number) {
  dst.fill(0);
  dst[0] = x; dst[5] = y; dst[10] = z; dst[15] = 1;
  return dst;
}


export function setTranslate(dst: Type, x: number, y: number, z: number) {
  dst.fill(0);
  dst[0] = 1; dst[5] = 1; dst[10] = 1;
  dst[12] = x; dst[13] = y; dst[14] = z; dst[15] = 1;
  return dst;
}


export function setOrtho(dst: Type, left: number, right: number, bottom: number, top: number, near: number, far: number) {
  const x = 2 / (right - left);
  const y = 2 / (top - bottom);
  const z = -2 / (far - near);
  const a = -(right + left) / (right - left);
  const b = -(top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);

  dst.fill(0);
  dst[0] = x;
  dst[5] = y;
  dst[10] = z;
  dst[12] = a;
  dst[13] = b;
  dst[14] = c;
  dst[15] = 1;
  return dst;
}


export function setPerspective(dst: Type, fovy: number, aspect: number, near: number, far: number) {
  const a = fovy / 2;
  const fn = far - near;
  const cot = Math.cos(a) / Math.sin(a);

  dst.fill(0);
  dst[0] = cot / aspect;
  dst[5] = cot;
  dst[10] = -(far + near) / fn;
  dst[11] = -1;
  dst[14] = -(2 * near * far) / fn;
  return dst;
}


export function setLookAt(dst: Type, eye: v3.ArgType, target: v3.ArgType, up: v3.ArgType) {
  v3.normalize(_z, v3.sub(_z, eye, target));
  v3.normalize(_x, v3.cross(_x, up, _z));
  v3.normalize(_y, v3.cross(_y, _z, _x));
  dst[0] = _x[0]; dst[4] = _x[1]; dst[8] = _x[2];
  dst[1] = _y[0]; dst[5] = _y[1]; dst[9] = _y[2];
  dst[2] = _z[0]; dst[6] = _z[1]; dst[10] = _z[2];
  dst[3] = 0; dst[7] = 0; dst[11] = 0;
  dst[12] = -v3.dot(_x, eye);
  dst[13] = -v3.dot(_y, eye);
  dst[14] = -v3.dot(_z, eye);
  dst[15] = 1;
  return dst;
}


export function setRotateX(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
  dst[4] = 0; dst[5] = c; dst[6] = s; dst[7] = 0;
  dst[8] = 0; dst[9] = -s; dst[10] = c; dst[11] = 0;
  dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
  return dst;
}


export function setRotateY(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  dst[0] = c; dst[1] = 0; dst[2] = -s; dst[3] = 0;
  dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
  dst[8] = s; dst[9] = 0; dst[10] = c; dst[11] = 0;
  dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
  return dst;
}


export function setRotateZ(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  dst[0] = c; dst[1] = s; dst[2] = 0; dst[3] = 0;
  dst[4] = -s; dst[5] = c; dst[6] = 0; dst[7] = 0;
  dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
  dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;
  return dst;
}


export function setAffine(dst: Type, x: v3.ArgType, y: v3.ArgType, z: v3.ArgType, t: v3.ArgType) {
  dst[0]  = x[0]; dst[1]  = x[1]; dst[2]  = x[2]; dst[3]  = 0;
  dst[4]  = y[0]; dst[5]  = y[1]; dst[6]  = y[2]; dst[7]  = 0;
  dst[8]  = z[0]; dst[9]  = z[1]; dst[10] = z[2]; dst[11] = 0;
  dst[12] = t[0]; dst[13] = t[1]; dst[14] = t[2]; dst[15] = 1;
  return dst;
}


export function getRow(dst: v4.Type, row: number, m: ArgType) {
  row *= 4;
  dst[0] = m[row++]; dst[1] = m[row++]; dst[2] = m[row++]; dst[3] = m[row++];
  return dst;
}


export function getX(dst: v3.Type, m: ArgType) {
  dst[0] = m[0]; dst[1] = m[1]; dst[2] = m[2];
  return dst;
}


export function getY(dst: v3.Type, m: ArgType) {
  dst[0] = m[4]; dst[1] = m[5]; dst[2] = m[6];
  return dst;
}


export function getZ(dst: v3.Type, m: ArgType) {
  dst[0] = m[8]; dst[1] = m[9]; dst[2] = m[10];
  return dst;
}


export function getTranslation(dst: v3.Type, m: ArgType) {
  dst[0] = m[12]; dst[1] = m[13]; dst[2] = m[14];
  return dst;
}


export function getCol(dst: v3.Type, col: number, m: ArgType) {
  dst[0] = m[col]; dst[1] = m[col+4]; dst[2] = m[col+8]; dst[3] = m[col+12];
  return dst;
}


export function setRow(dst: Type, row: number, v: v4.ArgType) {
  row *= 4;
  dst[row++] = v[0]; dst[row++] = v[1]; dst[row++] = v[2]; dst[row++] = v[3];
  return dst;
}


export function setRowValues(dst: Type, row: number,
                             a: number, b: number, c: number, d: number) {
  row *= 4;
  dst[row++] = a; dst[row++] = b; dst[row++] = c; dst[row++] = d;
  return dst;
}


export function setCol(dst: Type, col: number, v: v4.ArgType) {
  dst[col] = v[0]; dst[col+4] = v[1]; dst[col+8] = v[2]; dst[col+12] = v[3];
  return dst;
}


export function setColValues(dst: Type, col: number,
                             a: number, b: number, c: number, d: number) {
  dst[col] = a; dst[col+4] = b; dst[col+8] = c; dst[col+12] = d;
  return dst;
}


export function transpose(dst: Type, a: ArgType) {
  if (dst == a) {
    const a10 = a[1], a20 = a[2], a30 = a[3];
    const a21 = a[6], a31 = a[7];
    const a32 = a[11];
    dst[1] = dst[4];
    dst[2] = dst[8];
    dst[3] = dst[12];

    dst[4] = a10;
    dst[6] = dst[9];
    dst[7] = dst[13];

    dst[8] = a20;
    dst[9] = a21;
    dst[11] = dst[14];

    dst[12] = a30;
    dst[13] = a31;
    dst[14] = a32;
  } else {
    dst[0] = a[0]; dst[1] = a[4]; dst[2] = a[8]; dst[3] = a[12];
    dst[4] = a[1]; dst[5] = a[5]; dst[6] = a[9]; dst[7] = a[13];
    dst[8] = a[2]; dst[9] = a[6]; dst[10] = a[10]; dst[11] = a[14];
    dst[12] = a[3]; dst[13] = a[7]; dst[14] = a[11]; dst[15] = a[15];
  }
  return dst;
}


/**
 * Translates the given matrix by x,y,z.  Equvialent to:
 * mat4.multMat(
 *     mat, mat, mat4.newTranslate(x, y, z));
 */
export function translate(m: Type, x: number, y: number, z: number) {
  m[12] += m[0] * x + m[4] * y + m[8] * z;
  m[13] += m[1] * x + m[5] * y + m[9] * z;
  m[14] += m[2] * x + m[6] * y + m[10] * z;
  m[15] += m[3] * x + m[7] * y + m[11] * z;
  return m;
}


export function rotateX(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  const m10 = dst[4], m11 = dst[5], m12 = dst[6],  m13 = dst[7];
  const m20 = dst[8], m21 = dst[9], m22 = dst[10], m23 = dst[11];
  dst[4]  = m10 *  c + m20 * s;
  dst[5]  = m11 *  c + m21 * s;
  dst[6]  = m12 *  c + m22 * s;
  dst[7]  = m13 *  c + m23 * s;
  dst[8]  = m10 * -s + m20 * c;
  dst[9]  = m11 * -s + m21 * c;
  dst[10] = m12 * -s + m22 * c;
  dst[11] = m13 * -s + m23 * c;
  return dst;
}


export function rotateY(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  const m00 = dst[0], m01 = dst[1], m02 = dst[2],  m03 = dst[3];
  const m20 = dst[8], m21 = dst[9], m22 = dst[10], m23 = dst[11];
  dst[0]  = m00 * c + m20 * -s;
  dst[1]  = m01 * c + m21 * -s;
  dst[2]  = m02 * c + m22 * -s;
  dst[3]  = m03 * c + m23 * -s;
  dst[8]  = m00 * s + m20 *  c;
  dst[9]  = m01 * s + m21 *  c;
  dst[10] = m02 * s + m22 *  c;
  dst[11] = m03 * s + m23 *  c;
  return dst;
}


export function rotateZ(dst: Type, a: number) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  const m00 = dst[0], m01 = dst[1], m02 = dst[2], m03 = dst[3];
  const m10 = dst[4], m11 = dst[5], m12 = dst[6], m13 = dst[7];
  dst[0] = m00 *  c + m10 * s;
  dst[1] = m01 *  c + m11 * s;
  dst[2] = m02 *  c + m12 * s;
  dst[3] = m03 *  c + m13 * s;
  dst[4] = m00 * -s + m10 * c;
  dst[5] = m01 * -s + m11 * c;
  dst[6] = m02 * -s + m12 * c;
  dst[7] = m03 * -s + m13 * c;
  return dst;
}


export function invert(dst: Type, a: ArgType) {
  const m00 = a[0],  m01 = a[1],  m02 = a[2],  m03 = a[3];
  const m10 = a[4],  m11 = a[5],  m12 = a[6],  m13 = a[7];
  const m20 = a[8],  m21 = a[9],  m22 = a[10], m23 = a[11];
  const m30 = a[12], m31 = a[13], m32 = a[14], m33 = a[15];

  const a0 = m00 * m11 - m01 * m10;
  const a1 = m00 * m12 - m02 * m10;
  const a2 = m00 * m13 - m03 * m10;
  const a3 = m01 * m12 - m02 * m11;
  const a4 = m01 * m13 - m03 * m11;
  const a5 = m02 * m13 - m03 * m12;
  const b0 = m20 * m31 - m21 * m30;
  const b1 = m20 * m32 - m22 * m30;
  const b2 = m20 * m33 - m23 * m30;
  const b3 = m21 * m32 - m22 * m31;
  const b4 = m21 * m33 - m23 * m31;
  const b5 = m22 * m33 - m23 * m32;

  const det = a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
  const idet = 1.0 / det;
  dst[0] =  ( m11 * b5 - m12 * b4 + m13 * b3) * idet;
  dst[1] =  (-m01 * b5 + m02 * b4 - m03 * b3) * idet;
  dst[2] =  ( m31 * a5 - m32 * a4 + m33 * a3) * idet;
  dst[3] =  (-m21 * a5 + m22 * a4 - m23 * a3) * idet;
  dst[4] =  (-m10 * b5 + m12 * b2 - m13 * b1) * idet;
  dst[5] =  ( m00 * b5 - m02 * b2 + m03 * b1) * idet;
  dst[6] =  (-m30 * a5 + m32 * a2 - m33 * a1) * idet;
  dst[7] =  ( m20 * a5 - m22 * a2 + m23 * a1) * idet;
  dst[8] =  ( m10 * b4 - m11 * b2 + m13 * b0) * idet;
  dst[9] =  (-m00 * b4 + m01 * b2 - m03 * b0) * idet;
  dst[10] = ( m30 * a4 - m31 * a2 + m33 * a0) * idet;
  dst[11] = (-m20 * a4 + m21 * a2 - m23 * a0) * idet;
  dst[12] = (-m10 * b3 + m11 * b1 - m12 * b0) * idet;
  dst[13] = ( m00 * b3 - m01 * b1 + m02 * b0) * idet;
  dst[14] = (-m30 * a3 + m31 * a1 - m32 * a0) * idet;
  dst[15] = ( m20 * a3 - m21 * a1 + m22 * a0) * idet;
  return dst;
}

export function mul(dst: Type, a: ArgType, b: ArgType) {
  const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
  const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
  const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = b[0],  b01 = b[1],  b02 = b[2],  b03 = b[3];
  const b10 = b[4],  b11 = b[5],  b12 = b[6],  b13 = b[7];
  const b20 = b[8],  b21 = b[9],  b22 = b[10], b23 = b[11];
  const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

  dst[0]  = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  dst[1]  = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  dst[2]  = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  dst[3]  = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
                                                         
  dst[4]  = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  dst[5]  = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  dst[6]  = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  dst[7]  = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
                                                         
  dst[8]  = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  dst[9]  = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
                                                         
  dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

  return dst;
}


// Transforms the given position `p` by matrix `m`.
// Applies translation.
export function mulPos(dst: v3.Type, m: ArgType, p: v3.ArgType) {
  const x = p[0], y = p[1], z = p[2];
  dst[0] = x * m[0] + y * m[4] + z * m[8] + m[12];
  dst[1] = x * m[1] + y * m[5] + z * m[9] + m[13];
  dst[2] = x * m[2] + y * m[6] + z * m[10] + m[14];
  return dst;
}


// Transforms the given vector `v` by projective matrix `m`.
// Applies homonegeous divide.
export function mulPosProjective(dst: v3.Type, m: ArgType, p: v3.ArgType) {
  const x = p[0], y = p[1], z = p[2];
  const iw = 1 / (x * m[3] + y * m[7] + z * m[11] + m[15]);
  dst[0] = (x * m[0] + y * m[4] + z * m[8]) * iw;
  dst[1] = (x * m[1] + y * m[5] + z * m[9]) * iw;
  dst[2] = (x * m[2] + y * m[6] + z * m[10]) * iw;
  return dst;
}


// Transforms the given vector `v` by matrix `m`.
// Does not apply translation.
export function mulVec(dst: v3.Type, m: ArgType, v: v3.ArgType) {
  const x = v[0], y = v[1], z = v[2];
  dst[0] = x * m[0] + y * m[4] + z * m[8];
  dst[1] = x * m[1] + y * m[5] + z * m[9];
  dst[2] = x * m[2] + y * m[6] + z * m[10];
  return dst;
}


// Calculates the absolute value of all matrix elements.
// This is useful for calculating the AABB of a transformed AABB:
//   center  = 0.5 * (max + min)
//   center  = center * transform
//   extents = 0.5 * (max - min)
//   extents = center * abs(transform)
//   min = center - extents
//   max = center + extents
export function abs(dst: Type, m: ArgType) {
  dst[0] = Math.abs(m[0]);
  dst[1] = Math.abs(m[1]);
  dst[2] = Math.abs(m[2]);
  dst[3] = Math.abs(m[3]);

  dst[4] = Math.abs(m[4]);
  dst[5] = Math.abs(m[5]);
  dst[6] = Math.abs(m[6]);
  dst[7] = Math.abs(m[7]);

  dst[8] = Math.abs(m[8]);
  dst[9] = Math.abs(m[9]);
  dst[10] = Math.abs(m[10]);
  dst[11] = Math.abs(m[11]);

  dst[12] = Math.abs(m[12]);
  dst[13] = Math.abs(m[13]);
  dst[14] = Math.abs(m[14]);
  dst[15] = Math.abs(m[15]);
  return dst;
}


export function toString(m: Type, precision = 3) {
  let str = '';
  for (let i = 0; i < 16;) {
    let a = m[i++].toFixed(precision);
    let b = m[i++].toFixed(precision);
    let c = m[i++].toFixed(precision);
    let d = m[i++].toFixed(precision);
    if (a[0] != '-') { a = ' ' + a; }
    if (b[0] != '-') { b = ' ' + b; }
    if (c[0] != '-') { c = ' ' + c; }
    if (d[0] != '-') { d = ' ' + d; }
    str += a + ' ' + b + ' ' + c + ' ' + d + '\n';
  }
  return str;
}
