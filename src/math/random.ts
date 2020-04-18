import {uint64} from '../types/uint64'

const _mul = uint64.newFromParts(0x5851f42d, 0x4c957f2d);
const _tmp = uint64.newZero();


// Rotate a 32bit value right by rot bits.
function rotr32(value: number, rot: number) {
  const result = (value >>> rot) | (value << ((-rot) & 31));
  return result >>> 0;  // The >>> forces the result to be unsigned.
}


// An implementation of the basic 32bit PCG random number generator.
// http://www.pcg-random.org/
export class PcgRandom32 {
  private state: uint64.Type;
  private inc: uint64.Type;

  constructor(state: number | uint64.Type, seq: number | uint64.Type) {
    this.state = uint64.newZero();
    this.inc = uint64.newZero();

    if (typeof(state) == 'number') {
      uint64.setFromNumber(_tmp, state);
    } else {
      uint64.setFromUint64(_tmp, state);
    }

    if (typeof(seq) == 'number') {
      uint64.setFromNumber(this.inc, seq);
    } else {
      uint64.setFromUint64(this.inc, seq);
    }

    uint64.shl(this.inc, this.inc, 1);
    this.inc[0] |= 1;

    this._step();
    uint64.add(this.state, this.state, _tmp);
    this._step();
  }

  // Returns a random unsigned 32bit integer in the range [0, 0xffffffff].
  next32() {
    // Shuffle the state to generate the final output.
    uint64.shr(_tmp, this.state, 18);
    uint64.xor(_tmp, _tmp, this.state);
    uint64.shr(_tmp, _tmp, 27);
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
    uint64.mul(this.state, this.state, _mul);
    uint64.add(this.state, this.state, this.inc);
  }

  fn() {
    return PcgRandom32.prototype.random.bind(this);
  }
}
