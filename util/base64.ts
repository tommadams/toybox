const bytesToBase64Chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export function bytesToBase64(bytes: Uint8Array, offset=0, length?: number) {
  let chars = bytesToBase64Chars;

  let begin = offset;
  let end = length !== undefined ? begin + length : bytes.length;

  let output = [];
  let i = begin;
  while (i + 2 < end) {
    let a = bytes[i++];
    let b = bytes[i++];
    let c = bytes[i++];
    output.push(
        chars.charAt(a >> 2),
        chars.charAt(((a & 0x3) << 4) | (b >> 4)),
        chars.charAt(((b & 0xf) << 2) | (c >> 6)),
        chars.charAt(c & 0x3f));
  }
  if (i < end) {
    let bValid = i + 1 < end;
    let cValid = i + 2 < end;
    let a = bytes[i++];
    let b = bValid ? bytes[i++] : 0;
    let c = cValid ? bytes[i++] : 0;
    output.push(
        chars.charAt(a >> 2),
        chars.charAt(((a & 0x3) << 4) | (b >> 4)),
        chars.charAt(bValid ? ((b & 0xf) << 2) | (c >> 6) : 64),
        chars.charAt(cValid ? c & 0x3f : 64));
  }
  return output.join('');
};
