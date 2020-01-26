export type Type = number[] | Uint32Array


export function newZero() {
  return new Uint32Array(2);
}


export function newFromNumber(a: number) {
  const dst = new Uint32Array(2);
  dst[0] = a % 4294967296;
  dst[1] = a / 4294967296;
  return dst;
}


export function newFromParts(hi: number, lo: number) {
  const dst = new Uint32Array(2);
  dst[0] = lo;
  dst[1] = hi;
  return dst
}


export function newFromUint64(a: Type) {
  const dst = new Uint32Array(2);
  dst[0] = a[0];
  dst[1] = a[1];
  return dst
}


export function setZero(dst: Type) {
  dst[0] = 0;
  dst[1] = 0;
  return dst;
}


export function setFromNumber(dst: Type, a: number) {
  dst[0] = a % 4294967296;
  dst[1] = a / 4294967296;
  return dst;
}

export function setFromParts(dst: Type, hi: number, lo: number) {
  dst[0] = lo;
  dst[1] = hi;
  return dst;
}


export function setFromUint64(dst: Type, a: Type) {
  dst[0] = a[0];
  dst[1] = a[1];
  return dst;
}


export function add(dst: Type, a: Type, b: Type) {
  const a0 = a[0] & 0xffff;
  const a1 = a[0] >>> 16;
  const a2 = a[1] & 0xffff;
  const a3 = a[1] >>> 16;

  const b0 = b[0] & 0xffff;
  const b1 = b[0] >>> 16;
  const b2 = b[1] & 0xffff;
  const b3 = b[1] >>> 16;

  let c0 = a0 + b0;
  let c1 = a1 + b1 + (c0 >>> 16);
  let c2 = a2 + b2 + (c1 >>> 16);
  let c3 = a3 + b3 + (c2 >>> 16);

  c0 &= 0xffff;
  c1 &= 0xffff;
  c2 &= 0xffff;
  c3 &= 0xffff;

  dst[0] = c0 | (c1 << 16);
  dst[1] = c2 | (c3 << 16);
  return dst;
}


export function mul(dst: Type, a: Type, b: Type) {
  const a0 = a[0] & 0xffff;
  const a1 = a[0] >>> 16;
  const a2 = a[1] & 0xffff;
  const a3 = a[1] >>> 16;

  const b0 = b[0] & 0xffff;
  const b1 = b[0] >>> 16;
  const b2 = b[1] & 0xffff;
  const b3 = b[1] >>> 16;

  let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
  c0 += a0 * b0;

  c1 += c0 >>> 16;
  c0 &= 0xffff;
  c1 += a1 * b0;
  c2 += c1 >>> 16;
  c1 &= 0xffff;
  c1 += a0 * b1;

  c2 += c1 >>> 16;
  c1 &= 0xffff;
  c2 += a2 * b0;
  c3 += c2 >>> 16;
  c2 &= 0xffff;
  c2 += a1 * b1;
  c3 += c2 >>> 16;
  c2 &= 0xffff;
  c2 += a0 * b2;
  c3 += c2 >>> 16;
  c2 &= 0xffff;

  c3 += a3 * b0 + a2 * b1 + a1 * b2 + a0 * b3;
  c3 &= 0xffff;

  dst[0] = c0 | (c1 << 16);
  dst[1] = c2 | (c3 << 16);
  return dst;
}


export function xor(dst: Type, a: Type, b: Type) {
  dst[0] = a[0] ^ b[0];
  dst[1] = a[1] ^ b[1];
  return dst;
}


export function shr(dst: Type, a: Type, n: number) {
  const a0 = a[0];
  const a1 = a[1];
  if (n < 32) {
    dst[0] = (a0 >>> n) | a1 << (32 - n);
    dst[1] = a1 >>> n;
  } else {
    dst[0] = a1 >>> (n - 32);
    dst[1] = 0 
  }
  return dst;
}


export function shl(dst: Type, a: Type, n: number) {
  const a0 = a[0];
  const a1 = a[1];
  if (n < 32) {
    dst[0] = a0 << n;
    dst[1] = (a1 << n) | (a0 >>> (32 - n));
  } else {
    dst[0] = 0;
    dst[1] = a0 << (n - 32);
  }
  return dst;
}


export function toString(a: Type) {
  let lo = a[0].toString(16);
  let hi = a[1].toString(16);
  lo = '00000000'.substr(0, 8 - lo.length) + lo;
  hi = '00000000'.substr(0, 8 - hi.length) + hi;
  return `0x${hi}${lo}`;
}
