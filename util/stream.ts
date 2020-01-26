export class Stream {
  private data_: DataView;
  private ofs_ = 0;
  constructor(private buf_: ArrayBuffer) {
    this.data_ = new DataView(this.buf_);
  }

  getOfs() { return this.ofs_; }
  setOfs(ofs: number) { this.ofs_ = ofs; }
  getLength() { return this.data_.byteLength; }

  readInt8() {
    var v = this.data_.getInt8(this.ofs_);
    this.ofs_ += 1;
    return v;
  }

  readInt16() {
    var v = this.data_.getInt16(this.ofs_, true);
    this.ofs_ += 2;
    return v;
  }

  readInt32() {
    var v = this.data_.getInt32(this.ofs_, true);
    this.ofs_ += 4;
    return v;
  }

  readUint8() {
    var v = this.data_.getUint8(this.ofs_);
    this.ofs_ += 1;
    return v;
  }

  readUint16() {
    var v = this.data_.getUint16(this.ofs_, true);
    this.ofs_ += 2;
    return v;
  }

  readUint32() {
    var v = this.data_.getUint32(this.ofs_, true);
    this.ofs_ += 4;
    return v;
  }

  readFloat32() {
    var v = this.data_.getFloat32(this.ofs_, true);
    this.ofs_ += 4;
    return v;
  }

  readFloat64() {
    var v = this.data_.getFloat64(this.ofs_, true);
    this.ofs_ += 8;
    return v;
  }

  readInt8Array(length: number) {
    var v = new Int8Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getInt8(this.ofs_);
      this.ofs_ += 1;
    }
    return v;
  }

  readInt16Array(length: number) {
    var v = new Int16Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getInt16(this.ofs_, true);
      this.ofs_ += 2;
    }
    return v;
  }

  readInt32Array(length: number) {
    var v = new Int32Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getInt32(this.ofs_, true);
      this.ofs_ += 4;
    }
    return v;
  }

  readUint8Array(length: number) {
    var v = new Uint8Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getUint8(this.ofs_);
      this.ofs_ += 1;
    }
    return v;
  }

  readUint16Array(length: number) {
    var v = new Uint16Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getUint16(this.ofs_, true);
      this.ofs_ += 2;
    }
    return v;
  }

  readUint32Array(length: number) {
    var v = new Uint32Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getUint32(this.ofs_, true);
      this.ofs_ += 4;
    }
    return v;
  }

  readFloat32Array(length: number) {
    var v = new Float32Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getFloat32(this.ofs_, true);
      this.ofs_ += 4;
    }
    return v;
  }

  readFloat64Array(length: number) {
    var v = new Float64Array(length);
    for (var i = 0; i < length; ++i) {
      v[i] = this.data_.getFloat64(this.ofs_, true);
      this.ofs_ += 8;
    }
    return v;
  }

  skip(numBytes: number) {
    this.ofs_ += numBytes;
  }
}
