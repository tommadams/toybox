export function linearFloatToSrgbByteAccurate(src: Float32Array, exposure: number) {
  let scale = Math.pow(2, exposure);
  let dst = new Uint8Array(src.length);
  for (let i = 0; i < src.length; ++i) {
    let x = Math.max(0, src[i] * scale);
    if (x < 0.0031308) {
      x *= 12.92;
    } else {
      x = 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    }
    dst[i] = Math.min(255, 255 * x);
  }
  return dst;
}

export function linearFloatToSrgbByteApproximate(src: Float32Array, exposure: number) {
  let scale = Math.pow(2, exposure);
  let dst = new Uint8Array(src.length);
  for (let i = 0; i < src.length; ++i) {
    let x = Math.max(0, src[i] * scale);
    x = Math.pow(x, 1 / 2.2);
    dst[i] = Math.min(255, 255 * x);
  }
  return dst;
}
