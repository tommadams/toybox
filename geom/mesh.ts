import * as vec3 from 'toybox/math/vec3';

export type IndexArray = Uint8Array | Uint16Array | Uint32Array;

// Simple mesh representation.
// Meshes are easier to work with than FlatMeshes.
export interface Mesh {
  positions: vec3.Type[];
  faceIndices: number[];
  edgeIndices: number[];
}

// Flattened mesh representation.
// FlatMeshes are easier to create vertex and index buffers from that Meshes.
export interface FlatMesh {
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
}

// Flattens a Mesh into a FlatMesh.
export function flatten(src: Mesh) {
  let n = src.positions.length;
  let ctor = n <= 256 ? Uint8Array : n <= 65536 ? Uint16Array : Uint32Array;
  let dst = {
    positions: new Float32Array(3 * src.positions.length),
    faceIndices: new ctor(src.faceIndices),
    edgeIndices: new ctor(src.edgeIndices),
  };
  let i = 0;
  for (let x of src.positions) {
    dst.positions[i++] = x[0];
    dst.positions[i++] = x[1];
    dst.positions[i++] = x[2];
  }
  return dst;
}
