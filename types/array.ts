export interface ConstArrayView<T> {
  readonly length: number;
  readonly [n: number]: T;
}

export interface MutableArrayView<T> {
  readonly length: number;
  [n: number]: T;
}

export type TypedArray =
    Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array |
    Int32Array | Uint32Array | Float32Array;

export type TypedArrayConstructor = {
  new(data: number | NumericArray | Object | ArrayBuffer,
      byteOffset?: number, length?: number): TypedArray;
};

export type NumericArray = number[] | TypedArray;

export class TypedArrayList {
  length = 0;
  data: TypedArray;

  constructor(public ctor: TypedArrayConstructor, public capacity = 0) {
    this.data = this.capacity > 0 ? new ctor(this.capacity) : null;
  }

  push(...args: number[]) {
    const n = args.length;
    const newLength = this.length + n;
    if (newLength > this.capacity) {
      this.grow(newLength);
    }
    //this.data.set(args, this.length);
    for (let i = 0, j = this.length; i < n; ++i, ++j) {
      this.data[j] = args[i];
    }
    this.length = newLength;
  }

  pushVec3(...args: NumericArray[]) {
    const n = args.length;
    const newLength = this.length + n * 3;
    if (newLength > this.capacity) {
      this.grow(newLength);
    }
    for (let i = 0, j = this.length; i < n; ++i) {
      let a = args[i];
      this.data[j++] = a[0];
      this.data[j++] = a[1];
      this.data[j++] = a[2];
    }
    this.length = newLength;
  }

  clear() {
    this.length = 0;
  }

  resize(length: number) {
    if (length > this.capacity) {
      this.grow(length);
    }
    this.length = length;
  }

  grow(newLength: number) {
    const newCapacity = Math.max(8, this.capacity * 2, newLength);
    const newData = new this.ctor(newCapacity);
    if (this.data) {
      newData.set(this.data);
    }
    this.capacity = newCapacity;
    this.data = newData;
  }
}

// TODO(tom): rnd should be a Random object with a randint(a, b) method.
export function shuffle<T>(a: MutableArrayView<T>, rnd: () => number, length?: number): MutableArrayView<T> {
  rnd = rnd || Math.random;
  let i = length !== undefined ? length : a.length;
  while (i > 0) {
    let j = (rnd() * i) | 0;
    i -= 1;
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
