import * as vec2 from 'toybox/math/vec2';
import * as vec3 from 'toybox/math/vec3';

import * as icosahedron from 'toybox/geom/icosahedron';
import {Mesh, FlatMesh, flatten, subdivide} from 'toybox/geom/mesh';

let cache: Mesh[] = [icosahedron.mesh];
let flatCache: FlatMesh[] = [icosahedron.flatMesh];

export function getMesh(numSubdivisions: number) {
  if (numSubdivisions < 0) {
    throw new Error(`numSubdivisions must be >= 0, got ${numSubdivisions}`);
  }
  let mesh = cache[numSubdivisions];
  if (mesh === undefined) {
    let base = getMesh(numSubdivisions - 1);
    mesh = subdivide(base.positions, base.faceIndices, base.edgeIndices);
    // Normalize the subdivided vertex positions, skiping over the vertices
    // copied from the base mesh.
    for (let i = base.positions.length; i < mesh.positions.length; ++i) {
      let x = mesh.positions[i];
      vec3.normalize(x, x);
    }
    cache[numSubdivisions] = mesh;
  }

  return mesh;
}

export function getFlatMesh(numSubdivisions: number) {
  if (numSubdivisions < 0) {
    throw new Error(`numSubdivisions must be >= 0, got ${numSubdivisions}`);
  }
  let mesh = flatCache[numSubdivisions];
  if (mesh === undefined) {
    mesh = flatten(getMesh(numSubdivisions));
    flatCache[numSubdivisions] = mesh;
  }
  return mesh;
}
