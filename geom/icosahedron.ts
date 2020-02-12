import * as vec3 from 'toybox/math/vec3';

import {Mesh, flatten} from 'toybox/geom/mesh';

const positions: vec3.Type[] = (() => {
  const theta = 0.4 * Math.PI;
  const phi = Math.atan(0.5);
  let sp = Math.sin(phi);
  let cp = Math.cos(phi);

  let vertices: vec3.Type[] = [];
  vertices.push(vec3.newFromValues(0, 1, 0));

  let a = -Math.PI / 2 - theta / 2;
  for (let i = 0; i < 5; ++i) {
    vertices.push(vec3.newFromValues(cp * Math.cos(a), sp, cp * Math.sin(a)));
    a += theta;
  }

  let b = -Math.PI / 2;
  for (let i = 0; i < 5; ++i) {
    vertices.push(vec3.newFromValues(cp * Math.cos(b), -sp, cp * Math.sin(b)));
    b += theta;
  }

  vertices.push(vec3.newFromValues(0, -1, 0));

  return vertices;
})();

const faceIndices = [
  // Top cap.
  0, 2, 1,
  0, 3, 2,
  0, 4, 3,
  0, 5, 4,
  0, 1, 5,

  // First row.
  2,  6, 1,
  3,  7, 2,
  4,  8, 3,
  5,  9, 4,
  1, 10, 5,

  // Second row.
  10, 1,  6,
  6,  2,  7,
  7,  3,  8,
  8,  4,  9,
  9,  5, 10,

  // Bottom cap.
  11,  9, 10,
  11,  8,  9,
  11,  7,  8,
  11,  6,  7,
  11, 10,  6,
];

const edgeIndices = [
  // Top spokes.
  0, 1,  0, 2,  0, 3,  0, 4,  0, 5,

  // Top ring.
  1, 2,  2, 3,  3, 4,  4, 5,  5, 1,

  // Zig-zag around rows.
  1, 6,  6, 2,  2, 7,  7, 3,  3, 8,  8, 4,  4, 9,  9, 5,  5, 10,  10, 1,

  // Bottom ring.
  10, 9,  9, 8,  8, 7,  7, 6,  6, 10,

  // Bottom spokes.
  11, 10,  11, 9,  11, 8,  11, 7,  11, 6,
];

export let mesh = {positions, faceIndices, edgeIndices};
export let flatMesh = flatten(mesh);
