import * as vec3 from 'toybox/math/vec3';

import {Mesh, FlatMesh, flatten} from 'toybox/geom/mesh';

export function newMesh(center: vec3.ArgType, normal: vec3.ArgType, size: number,
                        subdivisions: number) {
  if (subdivisions < 1) {
    throw new Error(`subdivisions must be >= 1, got ${subdivisions}`);
  }
  if (size <= 0) {
    throw new Error(`size must be >= 0, got ${size}`);
  }

  let u = vec3.perpendicular(vec3.newZero(), normal);
  let v = vec3.cross(vec3.newZero(), u, normal);

  let positions: vec3.Type[] = [];
  let faceIndices: number[] = [];
  let edgeIndices: number[] = [];
  for (let j = 0; j <= subdivisions; ++j) {
    let t = size * (j / subdivisions - 0.5);
    for (let i = 0; i <= subdivisions; ++i) {
      let s = size * (i / subdivisions - 0.5);
      let p = vec3.newZero();
      vec3.addScaled(p, center, u, s);
      vec3.addScaled(p, p, v, t);
      positions.push(p);
    }
  }

  for (let j = 0; j < subdivisions; ++j) {
    for (let i = 0; i < subdivisions; ++i) {
      let a = j * (subdivisions + 1) + i;
      let b = a + 1;
      let c = a + subdivisions + 1;
      let d = c + 1;
      faceIndices.push(a, b, c, b, d, c);
      edgeIndices.push(a, b, b, c, c, a);
      if (i == subdivisions - 1) { edgeIndices.push(b, d); }
      if (j == subdivisions - 1) { edgeIndices.push(d, c); }
    }
  }
  return new Mesh(positions, faceIndices, edgeIndices);
}

export function newFlatMesh(center: vec3.ArgType, normal: vec3.ArgType, size: number,
                            subdivisions: number) {
  // TODO(tom): write an optimized version of this that constructs the FlatMesh
  // directly.
  return flatten(newMesh(center, normal, size, subdivisions));
}
