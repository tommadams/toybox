import * as vec3 from '../math/vec3';

import * as icosahedron from './icosahedron';
import {Mesh, FlatMesh, flatten, subdivide} from './mesh';

let cache: Mesh[] = [icosahedron.mesh];
let flatCache: FlatMesh[] = [icosahedron.flatMesh];

function cacheMesh(numSubdivisions: number) {
  if (numSubdivisions < 0) {
    throw new Error(`numSubdivisions must be >= 0, got ${numSubdivisions}`);
  }
  let mesh = cache[numSubdivisions];
  if (mesh === undefined) {
    let base = cacheMesh(numSubdivisions - 1);
    mesh = subdivide(base.positions, base.faceIndices);
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

export function newMesh(numSubdivisions: number) {
  return cacheMesh(numSubdivisions).clone();
}

export function newFlatMesh(numSubdivisions: number) {
  if (numSubdivisions < 0) {
    throw new Error(`numSubdivisions must be >= 0, got ${numSubdivisions}`);
  }
  let mesh = flatCache[numSubdivisions];
  if (mesh === undefined) {
    mesh = flatten(cacheMesh(numSubdivisions));
    flatCache[numSubdivisions] = mesh;
  }
  return mesh.clone();
}
