import * as vec2 from 'toybox/math/vec2';
import * as vec3 from 'toybox/math/vec3';

import * as icosahedron from 'toybox/geom/icosahedron';
import {Mesh, FlatMesh, flatten} from 'toybox/geom/mesh';

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

function subdivide(positions: vec3.Type[], faces: number[], edges: number[]) {
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

  return {
    positions: newPositions.values,
    faceIndices: newFaces,
    edgeIndices: newEdges.values,
  };
}

let cache: Mesh[] = [icosahedron.mesh];
let flatCache: FlatMesh[] = [icosahedron.flatMesh];

export function create(subdivisions: number) {
  if (subdivisions < 0) {
    throw new Error(`subdivisions must be >= 0, got ${subdivisions}`);
  }
  let mesh = cache[subdivisions];
  if (mesh === undefined) {
    let base = create(subdivisions - 1);
    mesh = subdivide(base.positions, base.faceIndices, base.edgeIndices);
    // Normalize the subdivided vertex positions, skiping over the vertices
    // copied from the base mesh.
    for (let i = base.positions.length; i < mesh.positions.length; ++i) {
      let x = mesh.positions[i];
      vec3.normalize(x, x);
    }
    cache[subdivisions] = mesh;
  }

  return mesh;
}

export function createFlat(subdivisions: number) {
  if (subdivisions < 0) {
    throw new Error(`subdivisions must be >= 0, got ${subdivisions}`);
  }
  let mesh = flatCache[subdivisions];
  if (mesh === undefined) {
    mesh = flatten(create(subdivisions));
    flatCache[subdivisions] = mesh;
  }
  return mesh;
}
