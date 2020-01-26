import * as u64 from 'toybox/math/uint64'

const _mul = u64.newFromParts(0x5851f42d, 0x4c957f2d);
const _tmp = u64.newZero();


// Rotate a 32bit value right by rot bits.
function rotr32(value: number, rot: number) {
  const result = (value >>> rot) | (value << ((-rot) & 31));
  return result >>> 0;  // The >>> forces the result to be unsigned.
}


// An implementation of the basic 32bit PCG random number generator.
// http://www.pcg-random.org/
export class PcgRandom32 {
  private state: u64.Type;
  private inc: u64.Type;

  constructor(state: number | u64.Type, seq: number | u64.Type) {
    this.state = u64.newZero();
    this.inc = u64.newZero();

    if (typeof(state) == 'number') {
      u64.setFromNumber(_tmp, state);
    } else {
      u64.setFromUint64(_tmp, state);
    }

    if (typeof(seq) == 'number') {
      u64.setFromNumber(this.inc, seq);
    } else {
      u64.setFromUint64(this.inc, seq);
    }

    u64.shl(this.inc, this.inc, 1);
    this.inc[0] |= 1;

    this._step();
    u64.add(this.state, this.state, _tmp);
    this._step();
  }

  // Returns a random unsigned 32bit integer in the range [0, 0xffffffff].
  next32() {
    // Shuffle the state to generate the final output.
    u64.shr(_tmp, this.state, 18);
    u64.xor(_tmp, _tmp, this.state);
    u64.shr(_tmp, _tmp, 27);
    const result = rotr32(_tmp[0], this.state[1] >>> 27);
    this._step();
    return result;
  }

  // Returns a random floating point number in the range [0, 1).
  random() {
    return this.next32() / 0xffffffff;
  }

  // Returns a random floating point number in the range [a, b).
  uniform(a: number, b: number) {
    return a + (b - a) * this.random();
  }

  // Advance the internal state.
  _step() {
    u64.mul(this.state, this.state, _mul);
    u64.add(this.state, this.state, this.inc);
  }

  fn() {
    return PcgRandom32.prototype.random.bind(this);
  }
}
