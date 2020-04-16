import {NumericArray} from '../types/array';
import {assertTrue, assertEqual, assertNotNull, assertRoughlyEqual, assertElementsRoughlyEqual, runTests} from '../util/test_util';

import * as intersect3d from './intersect3d';
import * as vec3 from './vec3';


let E = 0.000001;


interface ExpectedResult {
  result: boolean;
  t?: number;
  p?: number[];
  n?: number[];
}

function normalize(v: NumericArray) {
  if (!v) { return v; }
  let l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  v[0] /= l;
  v[1] /= l;
  v[2] /= l;
  return v;
}

function checkResult(
    want: ExpectedResult, result: boolean, intersection: intersect3d.Intersection3d) {
  assertEqual('result', want.result, result);
  if (result && want.result) {
    //console.log('want', want);
    //console.log('got', intersection);
    assertNotNull('p', want.p);
    assertRoughlyEqual('t', want.t, intersection.t, E);
    if (isNaN(want.n[0])) {
      for (let i = 0; i < 3; ++i) {
        assertTrue(isNaN(want.n[i]));
        assertTrue(isNaN(intersection.n[i]));
      }
    } else {
      assertElementsRoughlyEqual('n', want.n, intersection.n, E);
    }
    assertElementsRoughlyEqual('p', want.p, intersection.p, E);
  }
}


/*
export function testIntersectPointCapsule() {
  let tests = [
    {
      name: 'Zero radius',
      p: [0, 0, 0], a: [-1, 0, 0], b: [1, 0, 0], r: 0.0,
      want: { result: true, t: 0, p: [0, 0, 0], n: [0, -1, 0] }
    },
    {
      name: 'Capsule is a sphere',
      p: [0, -1, 0], a: [0, 2, 0], b: [0, 2, 0], r: 5.0,
      want: { result: true, t: 2, p: [0, -3, 0], n: [0, -1, 0] }
    },
    {
      name: 'Point, end A coincident',
      p: [-2, 1, 1], a: [-2, 1, 1], b: [3, 2, 1], r: 3.0,
      want: { result: true, t: 3, p: [-1.411652, -1.941742, 1], n: [0.196116, -0.98058, 0] }
    },
    {
      name: 'Point, end B coincident',
      p: [-2, 1, 1], a: [3, 2, 1], b: [-2, 1, 1], r: 3.0,
      want: { result: true, t: 3, p: [-2.588348, 3.9417419, 1], n: [-0.196116, 0.98058, 0] }
    },
    {
      name: 'Point lies on AB',
      p: [2, 1, 0], a: [2, 0, 0], b: [2, 2, 0], r: 2.0,
      want: { result: true, t: 2, p: [4, 1, 0], n: [1, 0, 0] }
    },
    {
      name: 'Touching surface',
      p: [2, 0, 2], a: [0, 2, 2], b: [6, 2, 2], r: 2.0,
      want: { result: true, t: 0, p: [2, 0, 2], n: [0, -1, 0] }
    },
    {
      name: 'Just inside',
      p: [2, 0, 2], a: [0, 2, 2], b: [6, 2, 2], r: 2.0 + E,
      want: { result: true, t: E, p: [2, -E, 2], n: [0, -1, 0] }
    },
    {
      name: 'Touching end A',
      p: [0, 4, 2], a: [2, 4, 2], b: [2, 2, 2], r: 2.0,
      want: { result: true, t: 0, p: [0, 4, 2], n: [-1, 0, 0] }
    },
    {
      name: 'Touching end B',
      p: [2, 1, 6], a: [2, 2, 2], b: [2, 1, 4], r: 2.0,
      want: { result: true, t: 0, p: [2, 1, 6], n: [0, 0, 1] }
    },
    {
      name: 'Inside',
      p: [2, -3, 5], a: [-20, 0, 0], b: [20, 0, 0], r: 10,
      want: { result: true, t: 4.169048, p: [2, -5.144958, 8.574929], n: [0, -3, 5]
      }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    console.log(test.name);
    normalize(test.want.n);
    let result = intersect3d.pointCapsule(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        test.r,
        intersection);

    checkResult(test.want, result, intersection);
  }
}



export function testIntersectPointSphere() {
  let tests = [
    {
      name: 'Zero radius',
      p: [0, 0, 0], c: [0, 0, 0], r: 0.0,
      want: { result: true, t: 0, p: [0, 0, 0], n: [0, 1, 0] }
    },
    {
      name: 'Point and sphere center coincident',
      p: [4, 2, -1], c: [4, 2, -1], r: 3.0,
      want: { result: true, t: 3, p: [4, 5, -1], n: [0, 1, 0] }
    },
    {
      name: 'Touching surface',
      p: [2, 4, 2], c: [2, 2, 2], r: 2.0,
      want: { result: true, t: 0, p: [2, 4, 2], n: [0, 1, 0] }
    },
    {
      name: 'Just inside',
      p: [2, 2, 0], c: [2, 2, 1], r: 1.0 + E,
      want: { result: true, t: 0, p: [2, 2, 0], n: [0, 0, -1] }
    },
    {
      name: 'Inside',
      p: [2, -3, 5], c: [0, 0, 0], r: 10,
      want: { result: true, t: 3.835586, p: [3.244428, -4.866642, 8.111071], n: [2, -3, 5] }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    console.log(test.name);
    normalize(test.want.n);
    let result = intersect3d.pointSphere(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.c),
        test.r,
        intersection);

    checkResult(test.want, result, intersection);
  }
}



export function testIntersectRayCapsule() {
  let tests = [
    {
      name: 'Degenerate spherical case',
      p: [0, 4, 0], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 0], r: 1.0,
      want: { result: true, t: 3, p: [0, 1, 0], n: [0, 1, 0] }
    },
    {
      name: 'Intersect cylinder',
      p: [0, 0, 4], v: [0, 0, -1], a: [-2, 0, 0], b: [2, 0, 0], r: 0.5,
      want: { result: true, t: 3.5, p: [0, 0, 0.5], n: [0, 0, 1] }
    },
    {
      name: 'Intersect sphere A',
      p: [-4, -4, 0], v: [1, 1, 0], a: [1, 1, 0], b: [3, 2, 0], r: 1.0,
      want: { result: true, t: 6.071069, p: [0.292894, 0.292894, 0], n: [-1, -1, 0]
      }
    },
    {
      name: 'Intersect sphere B',
      p: [-4, 0, -4], v: [1, 0, 1], a: [6, 2, 0], b: [1, 0, 1], r: 1.0,
      want: { result: true, t: 6.071069, p: [0.292894, 0, 0.292894], n: [-1, 0, -1] }
    },
    {
      name: 'Inside cylinder',
      p: [0.5, -0.25, 0], v: [-1, 0, 1], a: [2, 2, 2], b: [-2, -2, -2], r: 1.0,
      want: { result: true, t: 0, p: [0.5, -0.25, 0], n: [0.771517, -0.617213, -0.1543034] }
    },
    {
      name: 'Inside sphere A',
      p: [1, 0.1, 0], v: [-1, 4, 2], a: [1, 0, 0], b: [5, 0, 0], r: 1.0,
      want: { result: true, t: 0, p: [1, 0.1, 0], n: [0, 1, 0] }
    },
    {
      name: 'Inside sphere B',
      p: [1, 0.1, 0], v: [-1, 4, 2], a: [-5, 0, 0], b: [1, 0, 0], r: 1.0,
      want: { result: true, t: 0, p: [1, 0.1, 0], n: [0, 1, 0] }
    },
    {
      name: 'Miss from inside infinite cylinder formed by AB and r',
      p: [0.1, 0.1, 10], v: [1, 10, 2], a: [0, 0, -3], b: [0, 0, 4], r: 1.0,
      want: { result: false }
    },
    {
      name: 'Miss pointing away from cylinder',
      p: [0, 0, 4], v: [0, 0, 1], a: [-2, 0, 0], b: [2, 0, 0], r: 0.5,
      want: { result: false }
    },
    {
      name: 'Miss pointing towards cylinder',
      p: [3, 2, 5], v: [-1, -2, -3], a: [4, 0, -3], b: [10, 3, 4], r: 2.0,
      want: { result: false }
    },
    {
      name: 'Parallel to AB towards end A',
      p: [7, 0, 7], v: [-1, 0, -1], a: [3, 0.1, 3], b: [-3, 0.1, -3], r: 1.0,
      want: { result: true, t: 4.661867, p: [3.703562, 0, 3.703562], n: [0.7035624, -0.1, 0.7035624] }
    },
    {
      name: 'Parallel to AB towards end B',
      p: [7, 0, 7], v: [-1, 0, -1], a: [-3, 0.1, -3], b: [3, 0.1, 3], r: 1.0,
      want: { result: true, t: 4.661867, p: [3.703562, 0, 3.703562], n: [0.7035624, -0.1, 0.7035624] }
    },
    {
      name: 'Parallel to AB inside cylinder towards end A',
      p: [1, 0, 1], v: [-1, 0, -1], a: [3, 0.1, 3], b: [-3, 0.1, -3], r: 1.0,
      want: { result: true, t: 0, p: [1, 0, 1], n: [0, -1, 0] }
    },
    {
      name: 'Parallel to AB inside cylinder towards end B',
      p: [1, 0, 1], v: [-1, 0, -1], a: [-3, 0.1, -3], b: [3, 0.1, 3], r: 1.0,
      want: { result: true, t: 0, p: [1, 0, 1], n: [0, -1, 0] }
    },
    {
      name: 'Parallel to AB miss',
      p: [1, 5, 1], v: [-1, 0, -1], a: [-3, 0.1, -3], b: [3, 0.1, 3], r: 1.0,
      want: { result: false }
    },
    {
      name: 'On axis AB towards end A',
      p: [7, 0, 7], v: [-1, 0, -1], a: [3, 0, 3], b: [-3, 0, -3], r: 1.0,
      want: { result: true, t: 4.656855, p: [3.707107, 0, 3.707107], n: [0.7071068, 0, 0.7071068] }
    },
    {
      name: 'On axis AB towards end B',
      p: [7, 0, 7], v: [-1, 0, -1], a: [-3, 0, -3], b: [3, 0, 3], r: 1.0,
      want: { result: true, t: 4.656855, p: [3.707106, 0, 3.707106], n: [0.7071068, 0, 0.7071068] }
    },
    {
      name: 'On axis AB inside cylinder towards end A',
      p: [1, 0, 1], v: [-1, 0, -1], a: [3, 0, 3], b: [-3, 0, -3], r: 1.0,
      want: { result: true, t: 0, p: [1, 0, 1], n: [1, 0, -1] }
    },
    {
      name: 'On axis AB inside cylinder towards end B',
      p: [1, 0, 1], v: [-1, 0, -1], a: [-3, 0, -3], b: [3, 0, 3], r: 1.0,
      want: { result: true, t: 0, p: [1, 0, 1], n: [-1, 0, 1] }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    console.log(test.name);
    normalize(test.v); normalize(test.want.n);
    let result = intersect3d.rayCapsule(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.v),
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        test.r,
        intersection);

    checkResult(test.want, result, intersection);
  }
}



export function testIntersectRayPlane() {
  let tests = [
    {
      p: [0, 0, 0], v: [1, 0, 0], plane: [-1, 0, 0, -2],
      want: { result: true, t: 2, p: [2, 0, 0], n: [-1, 0, 0] }
    },
    {
      p: [5, 0, 0], v: [1, 0, 0], plane: [-1, 0, 0, -2],
      want: { result: false }
    },
    {
      p: [0, 0, 0], v: [1, 0, 0], plane: [1, 0, 0, 2],
      want: { result: false }
    },
    {
      p: [4, 1, 0], v: [0, -1, 0], plane: [0, 1, 0, -1],
      want: { result: true, t: 2, p: [4, -1, 0], n: [0, 1, 0] }
    },
    {
      p: [4, 1, 0], v: [0, -1, 0], plane: [0, -1, 0, 1],
      want: { result: false },
    },
    {
      p: [0, 0, 0], v: [0, 0, 1], plane: [0, 1, 0, 0],
      want: { result: false }
    },
    {
      p: [2, 0, -6], v: [3, -1, 0], plane: [0, 1, 0, 0],
      want: { result: true, t: 0, p: [2, 0, -6], n: [0, 1, 0] }
    },
    {
      p: [2, 2, 2], v: [-1, -1, -1], plane: normalize([1, 1, 1, 0]),
      want: { result: true, t: 3.464102, p: [0, 0, 0], n: [1, 1, 1] }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    let result = intersect3d.rayPlane(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.v),
        vec4.setFromArray(vec4.create(), test.plane),
        intersection);

    checkResult(test.want, result, intersection);
  }
}



export function testIntersectRayQuadrilateral() {
  let tests = [
    {
      name: 'Hit triangle ABC',
      p: [1, 7, 2], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3], d: [3, 0, 0],
      want: { result: true, t: 7, p: [1, 0, 2], n: [0, 1, 0] }
    },
    {
      name: 'Hit triangle ACD',
      p: [2, 8, 1], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3], d: [3, 0, 0],
      want: { result: true, t: 8, p: [2, 0, 1], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner A',
      p: [0, 1, 0], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 1, p: [0, 0, 0], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner B',
      p: [0, 1, 2], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 1, p: [0, 0, 2], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner C',
      p: [2, 1, 2], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 1, p: [2, 0, 2], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner D',
      p: [2, 1, 0], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 1, p: [2, 0, 0], n: [0, 1, 0] }
    },
    {
      name: 'Hit edge AC',
      p: [1, 1, 1], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 1, p: [1, 0, 1], n: [0, 1, 0] }
    },
    {
      name: 'Ray pointing the wrong way',
      p: [0, 1, 0], v: [0, 1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Ray origin behind triangle',
      p: [0, -1, 0], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner A',
      p: [0, 1, -E], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner A',
      p: [-E, 1, 0], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner B',
      p: [0, 1, 2 + E], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner C',
      p: [2 + E, 1, 2 + E], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner D',
      p: [2 + E, 1, 0], v: [0, -1, 0],
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    console.log(test.name);
    normalize(test.v); normalize(test.want.n);
    let result = intersect3d.rayQuadrilateral(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.v),
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        vec3.setFromArray(vec3.create(), test.c),
        vec3.setFromArray(vec3.create(), test.d),
        intersection);

    checkResult(test.want, result, intersection);
  }
}
*/



export function testIntersectRaySphere() {
  let tests = [
    {
      name: 'Normal intersection',
      p: [0, 4, 0], v: [0, -1, 0], c: [0, 0, 0], r: 1.0,
      want: { result: true, t: 3, p: [0, 1, 0], n: [0, 1, 0] }
    },
    {
      name: 'Ray points away from sphere',
      p: [0, 4, 0], v: [0, 1, 0], c: [0, 0, 0], r: 1.0,
      want: { result: false }
    },
    {
      name: 'Top down',
      p: [7, 4, 3], v: [0, -1, 0], c: [7, 0, 3], r: 1.0,
      want: { result: true, t: 3, p: [7, 1, 3], n: [0, 1, 0] }
    },
    {
      name: 'Origin inside sphere',
      p: [1, 2, 3], v: [-3, 1, 7], c: [0, 0, 0], r: 10.0,
      want: { result: true, t: 0, p: [1, 2, 3], n: [1, 2, 3] }
    },
    {
      name: 'Origin and sphere center coincident',
      p: [1, 2, 3], v: [-3, 1, 7], c: [1, 2, 3], r: 10.0,
      want: { result: true, t: 0, p: [1, 2, 3], n: [3, -1, -7] }
    },
    {
      name: 'Intersects at a tangent',
      p: [3, 0, -5], v: [0, 0, 1], c: [0, 0, 0], r: 3.0,
      want: { result: true, t: 5, p: [3, 0, 0], n: [1, 0, 0] }
    },
    {
      name: 'Just miss at a tangent',
      p: [3 + E, 0, -5], v: [0, 0, 1], c: [0, 0, 0], r: 3.0,
      want: { result: false }
    },
    {
      name: 'Diagonal',
      p: [3, 3, 3], v: [-1, -1, -1], c: [0, 0, 0], r: 1.0,
      want: { result: true, t: 4.196153, p: [0.577350, 0.577350, 0.577350], n: [1, 1, 1] }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect3d.raySphere(
        vec3.newFromArray(test.p),
        vec3.newFromArray(test.v),
        vec3.newFromArray(test.c),
        test.r,
        intersection);

    checkResult(test.want, result, intersection);
  }
}



/*
export function testIntersectRayTriangle() {
  let tests = [
    {
      p: [1, 1, 1], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 0],
      want: { result: true, t: 1, p: [1, 0, 1], n: [0, 1, 0] }
    },
    {
      p: [1, 1, 1], v: [0, -1, 0], a: [0, 0, 0], b: [3, 0, 0], c: [0, 0, 3],
      want: { result: false }
    },
    {
      p: [1, -1, 1], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 0],
      want: { result: false }
    },
    {
      p: [1, 1, 1], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 0],
      want: { result: true, t: 1, p: [1, 0, 1], n: [0, 1, 0] }
    },
    {
      p: [0, 1, 0], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 7], c: [7, 0, 0],
      want: { result: true, t: 1, p: [0, 0, 0], n: [0, 1, 0] }
    },
    {
      p: [7, 1, 0], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 7], c: [7, 0, 0],
      want: { result: true, t: 1, p: [7, 0, 0], n: [0, 1, 0] }
    },
    {
      p: [0, 1, 7], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 7], c: [7, 0, 0],
      want: { result: true, t: 1, p: [0, 0, 7], n: [0, 1, 0] }
    },
    {
      p: [E, 1, 7], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 7], c: [7, 0, 0],
      want: { result: false }
    },
    {
      p: [0, 1, 7 + E], v: [0, -1, 0], a: [0, 0, 0], b: [0, 0, 7], c: [7, 0, 0],
      want: { result: false }
    },
    {
      p: [1, 0, 5], v: [0, 0, -1], a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 0],
      want: { result: false }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    let result = intersect3d.rayTriangle(
        vec3.setFromArray(vec3.create(), test.p),
        vec3.setFromArray(vec3.create(), test.v),
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        vec3.setFromArray(vec3.create(), test.c),
        intersection);

    checkResult(test.want, result, intersection);
  }
}



// TODO(tom): Write unit tests.
export function testIntersectSphereQuadrilateral() {
  let tests = [
    {
      name: 'No intersection',
      p: [1, 7, 2], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3], d: [3, 0, 0],
      want: { result: false }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect3d.sphereQuadrilateral(
        vec3.setFromArray(vec3.create(), test.p),
        test.r,
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        vec3.setFromArray(vec3.create(), test.c),
        vec3.setFromArray(vec3.create(), test.d),
        intersection);

    checkResult(test.want, result, intersection);
  }
}



// TODO(tom): Write unit tests.
export function testIntersectSphereTriangle() {
  let tests = [
    {
      name: 'No intersection',
      p: [1, 7, 2], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3],
      want: { result: false }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect3d.sphereQuadrilateral(
        vec3.setFromArray(vec3.create(), test.p),
        test.r,
        vec3.setFromArray(vec3.create(), test.a),
        vec3.setFromArray(vec3.create(), test.b),
        vec3.setFromArray(vec3.create(), test.c),
        intersection);

    checkResult(test.want, result, intersection);
  }
}
*/



export function testIntersectSweptSphereQuadrilateral() {
  let tests = [
    {
      name: 'Hit triangle ABC',
      p: [1, 7, 2], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3], d: [3, 0, 0],
      want: { result: true, t: 6.5, p: [1, 0.5, 2], n: [0, 1, 0] }
    },
    {
      name: 'Hit triangle ACD',
      p: [2, 8, 1], v: [0, -1, 0], r: 0.25,
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3], d: [3, 0, 0],
      want: { result: true, t: 7.75, p: [2, 0.25, 1], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner A, face-on',
      p: [-0.3, 1, -0.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.7354249, p: [-0.3, 0.264575, -0.3], n: [-0.6, 0.5291502, -0.6] }
    },
    {
      name: 'Hit corner A, edge-on',
      p: [-3, 0.1, -3], v: [1, 0, 1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Hit corner B, face-on',
      p: [-0.3, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.7354249, p: [-0.3, 0.264575, 2.3], n: [-0.6, 0.5291502, 0.6] }
    },
    {
      name: 'Hit corner B, edge-on',
      p: [-3, 0.1, 5], v: [1, 0, -1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Hit corner C, face-on',
      p: [2.3, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.7354249, p: [2.3, 0.264575, 2.3], n: [0.6, 0.5291502, 0.6] }
    },
    {
      name: 'Hit corner C, edge-on',
      p: [5, 0.1, 5], v: [-1, 0, -1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Hit corner D, face-on',
      p: [2.3, 1, -0.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.7354249, p: [2.3, 0.264575, -0.3], n: [0.6, 0.5291502, -0.6] }
    },
    {
      name: 'Hit corner D, edge-on',
      p: [5, 0.1, -3], v: [-1, 0, 1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Hit edge AB, face-on',
      p: [-0.3, 1, 1], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.6, p: [-0.3, 0.4, 1], n: [-0.6, 0.8, 0] }
    },
    {
      name: 'Hit edge BC, face-on',
      p: [1, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.6, p: [1, 0.4, 2.3], n: [0, 0.8, 0.6] }
    },
    {
      name: 'Hit edge CD, face-on',
      p: [2.3, 1, 1], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.6, p: [2.3, 0.4, 1], n: [0.6, 0.8, 0] }
    },
    {
      name: 'Hit edge DA, face-on',
      p: [1, 1, -0.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.6, p: [1, 0.4, -0.3], n: [0, 0.8, -0.6] }
    },
    {
      name: 'Ray pointing the wrong way',
      p: [0, 1, 0], v: [0, 1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Ray origin behind quadrilateral',
      p: [0, -1, 0], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner A',
      p: [-0.5 - E, 1, -0.5 - E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner B',
      p: [-0.5, 1, 2.5 + E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner C',
      p: [2.5 + E, 1, 2.5 + E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Just miss corner D',
      p: [2.5 + E, 1, -0.5 - E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: false }
    },
    {
      name: 'Sphere intersects quadrilateral',
      p: [1, -1, 1], v: [0, -1, 0], r: 4,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0, p: [1, -1, 1], n: [0, 1, 0] }
    },
    {
      name: 'Sphere intersects quadrilateral edge',
      p: [0, -1, 1], v: [0, -1, 0], r: 4,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0, p: [0, -1, 1], n: [0, 1, 0] }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect3d.sweptSphereQuadrilateral(
        vec3.newFromArray(test.p),
        vec3.newFromArray(test.v),
        test.r,
        vec3.newFromArray(test.a),
        vec3.newFromArray(test.b),
        vec3.newFromArray(test.c),
        vec3.newFromArray(test.d),
        intersection);

    checkResult(test.want, result, intersection);
  }
}



export function testIntersectSweptSphereTriangle() {
  let tests = [
    {
      name: 'Hit triangle',
      p: [1, 7, 2], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 3], c: [3, 0, 3],
      want: { result: true, t: 6.5, p: [1, 0.5, 2], n: [0, 1, 0] }
    },
    {
      name: 'Hit corner A, face-on',
      p: [-0.3, 1, -0.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0.7354249, p: [-0.3, 0.264575, -0.3], n: [-0.6, 0.5291502, -0.6] }
    },
    {
      name: 'Hit corner A, edge-on',
      p: [-3, 0.1, -3], v: [1, 0, 1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Hit corner B, face-on',
      p: [-0.3, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2], d: [2, 0, 0],
      want: { result: true, t: 0.7354249, p: [-0.3, 0.264575, 2.3], n: [-0.6, 0.5291502, 0.6] }
    },
    {
      name: 'Hit corner B, edge-on',
      p: [-3, 0.1, 5], v: [1, 0, -1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Hit corner C, face-on',
      p: [2.3, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0.7354249, p: [2.3, 0.264575, 2.3], n: [0.6, 0.5291502, 0.6] }
    },
    {
      name: 'Hit corner C, edge-on',
      p: [5, 0.1, 5], v: [-1, 0, -1], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Hit edge AB, face-on',
      p: [-0.3, 1, 1], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0.6, p: [-0.3, 0.4, 1], n: [-0.6, 0.8, 0] }
    },
    {
      name: 'Hit edge BC, face-on',
      p: [1, 1, 2.3], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0.6, p: [1, 0.4, 2.3], n: [0, 0.8, 0.6] }
    },
    {
      name: 'Hit edge CA, face-on',
      p: [1.2, 1, 1], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0.5204169, p: [1.2, 0.479583, 1], n: [0.2, 0.9591663, -0.2] }
    },
    {
      name: 'Ray pointing the wrong way',
      p: [0, 1, 0], v: [0, 1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Ray origin behind quadrilateral',
      p: [0, -1, 0], v: [0, -1, 0], r: 0.5,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Just miss corner A',
      p: [-0.5 - E, 1, -0.5 - E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Just miss corner B',
      p: [-0.5, 1, 2.5 + E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Just miss corner C',
      p: [2.5 + E, 1, 2.5 + E], v: [0, -1, 0], r: 0.7071068,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: false }
    },
    {
      name: 'Sphere intersects triangle',
      p: [1, -1, 1], v: [0, -1, 0], r: 4,
      a: [0, 0, 0], b: [0, 0, 2], c: [2, 0, 2],
      want: { result: true, t: 0, p: [1, -1, 1], n: [0, 1, 0] }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect3d.Intersection3d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect3d.sweptSphereTriangle(
        vec3.newFromArray(test.p),
        vec3.newFromArray(test.v),
        test.r,
        vec3.newFromArray(test.a),
        vec3.newFromArray(test.b),
        vec3.newFromArray(test.c),
        intersection);

    checkResult(test.want, result, intersection);
  }
}

runTests(this);
