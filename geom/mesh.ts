import * as vec3 from 'toybox/math/vec3';

export type IndexArray = Uint8Array | Uint16Array | Uint32Array;

// Simple mesh representation.
// Meshes are easier to work with than FlatMeshes.
// TODO(tom): extend this to support vertex colors & normals.
export class Mesh {
  constructor(public positions: vec3.Type[],
              public faceIndices: number[],
              public edgeIndices: number[]) {}

  clone() {
    let p = new Array<vec3.Type>(this.positions.length);
    for (let i = 0; i < p.length; ++i) {
      p[i] = vec3.newFromVec(this.positions[i]);
    }
    return new Mesh(p, this.faceIndices.slice(0), this.edgeIndices.slice(0));
  }
}

// Flattened mesh representation.
// FlatMeshes are easier to create vertex and index buffers from that Meshes.
export class FlatMesh {
  // Array of flattened positions.
  positions: Float32Array;

  // Face indices.
  // Each value is position number rther than an index into positions.
  // To index the positions array, multiply the index value by 3, e.g.
  //   x = positions[faceIndices[i] * 3];
  //   y = positions[faceIndices[i] * 3 + 1];
  //   z = positions[faceIndices[i] * 3 + 2];
  faceIndices: IndexArray;

  // Edge indices.
  // Each value is position number rther than an index into positions.
  // To index the positions array, multiply the index value by 3, e.g.
  //   x = positions[edgeIndices[i] * 3];
  //   y = positions[edgeIndices[i] * 3 + 1];
  //   z = positions[edgeIndices[i] * 3 + 2];
  edgeIndices: IndexArray;

  constructor(positions: Float32Array,
              faceIndices: IndexArray,
              edgeIndices: IndexArray) {
    this.positions = positions;
    this.faceIndices = faceIndices;
    this.edgeIndices = edgeIndices;
  }
}

// Flattens a Mesh into a FlatMesh.
export function flatten(src: Mesh) {
  let n = src.positions.length;
  let ctor = n <= 256 ? Uint8Array : n <= 65536 ? Uint16Array : Uint32Array;
  let dst = new FlatMesh(
      new Float32Array(3 * src.positions.length),
      new ctor(src.faceIndices),
      new ctor(src.edgeIndices));
  let i = 0;
  for (let x of src.positions) {
    dst.positions[i++] = x[0];
    dst.positions[i++] = x[1];
    dst.positions[i++] = x[2];
  }
  return dst;
}

class EdgeSet {
  private map = new Map<string, number>();
  values: number[] = [];

  add(a: number, b: number) {
    let key = a < b ? `${a},${b}` : `${b},${a}`;
    let idx = this.map.get(key);
    if (idx === undefined) {
      idx = this.values.length;
      this.values.push(a, b);
      this.map.set(key, idx);
    }
    return idx;
  }
}

class Vec3Set {
  private map = new Map<string, number>();
  values: vec3.Type[] = [];

  add(v: vec3.Type) {
    let key = v.join(',');
    let idx = this.map.get(key);
    if (idx === undefined) {
      idx = this.values.length;
      this.values.push(vec3.newFromVec(v));
      this.map.set(key, idx);
    }
    return idx;
  }
}

export function subdivide(positions: vec3.Type[], faces: number[], edges: number[]) {
  let newPositions = new Vec3Set();
  let newFaces: number[] = [];
  let newEdges = new EdgeSet();

  for (let x of positions) {
    newPositions.add(x);
  }

  for (let i = 0; i < faces.length;) {
    let ai = faces[i++];
    let bi = faces[i++];
    let ci = faces[i++];

    let a = positions[ai];
    let b = positions[bi];
    let c = positions[ci];

    let ab = vec3.midpoint(vec3.newZero(), a, b);
    let bc = vec3.midpoint(vec3.newZero(), b, c);
    let ca = vec3.midpoint(vec3.newZero(), c, a);
    let abi = newPositions.add(ab);
    let bci = newPositions.add(bc);
    let cai = newPositions.add(ca);

    newFaces.push(ai, abi, cai);
    newFaces.push(bi, bci, abi);
    newFaces.push(ci, cai, bci);
    newFaces.push(abi, bci, cai);

    newEdges.add(ai, abi);
    newEdges.add(abi, bi);
    newEdges.add(bi, bci);
    newEdges.add(bci, ci);
    newEdges.add(ci, cai);
    newEdges.add(cai, ai);
    newEdges.add(abi, bci);
    newEdges.add(bci, cai);
    newEdges.add(cai, abi);
  }

  return new Mesh(newPositions.values, newFaces, newEdges.values);
}
