import {assertTrue, assertEqual, assertRoughlyEqual, assertElementsRoughlyEqual, runTests} from '../util/test_util';
import {NumericArray} from '../types/array';

import * as intersect2d from './intersect2d';
import * as vec2 from './vec2';



let E = 0.000001;


interface ExpectedResult {
  result: boolean;
  t?: number;
  p?: number[];
  n?: number[];
}


function normalize(v: NumericArray) {
  if (!v) { return v; }
  let l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  v[0] /= l;
  v[1] /= l;
  return v;
}


function checkResult(want: ExpectedResult, result: boolean, intersection: intersect2d.Intersection2d) {
  assertEqual('result', want.result, result);
  if (result && want.result) {
    assertRoughlyEqual('t', want.t, intersection.t, E);
    if (isNaN(want.n[0])) {
      for (let i = 0; i < 2; ++i) {
        assertTrue(isNaN(want.n[i]));
        assertTrue(isNaN(intersection.n[i]));
      }
    } else {
      assertElementsRoughlyEqual('n', want.n, intersection.n, E);
    }
  }
}

export function testIntersectRaySquare() {
  let tests = [
    {
      name: 'Zero area hit',
      p: [-2, 0], v: [1, 0], min: [0, 0], max: [0, 0],
      want: { result: true, t: 2, n: [-1, 0] }
    },
    {
      name: 'Zero area miss',
      p: [-2, E], v: [1, 0], min: [0, 0], max: [0, 0],
      want: { result: false }
    },
    {
      name: 'Normal miss',
      p: [-10, 0], v: [1, 1], min: [-3, -1], max: [3, 1],
      want: { result: false }
    },
    {
      name: '+x hit',
      p: [-6, 1], v: [1, 0], min: [-4, -5], max: [3, 7],
      want: { result: true, t: 2, n: [-1, 0] }
    },
    {
      name: '+x miss',
      p: [7, 1], v: [1, 0], min: [-4, -5], max: [3, 7],
      want: { result: false }
    },
    {
      name: '-x hit',
      p: [6, 1], v: [-1, 0], min: [-4, -5], max: [3, 7],
      want: { result: true, t: 3, n: [1, 0] }
    },
    {
      name: '-x miss',
      p: [-7, 1], v: [-1, 0], min: [-4, -5], max: [3, 7],
      want: { result: false }
    },
    {
      name: '+y hit',
      p: [-2, -10], v: [0, 1], min: [-4, -5], max: [3, 7],
      want: { result: true, t: 5, n: [0, -1] }
    },
    {
      name: '+y miss',
      p: [1, 10], v: [0, 1], min: [-4, -5], max: [3, 7],
      want: { result: false }
    },
    {
      name: '-y hit',
      p: [3, 9], v: [0, -1], min: [-4, -5], max: [3, 7],
      want: { result: true, t: 2, n: [0, 1] }
    },
    {
      name: '-y miss',
      p: [3, 9], v: [0, 1], min: [-4, -5], max: [3, 7],
      want: { result: false }
    },
    {
      name: 'corner',
      p: [-3, -3], v: [1, 1], min: [-2, -2], max: [3, 7],
      want: { result: true, t: 1.41421358, n: [-1, 0] }
    },
    {
      name: 'origin inside (-1, 0)',
      p: [-3, -2], v: [1, 1], min: [-4, -4], max: [4, 4],
      want: { result: true, t: 0, n: [-1, 0] }
    },
    {
      name: 'origin inside (1, 0)',
      p: [2, 1], v: [1, 1], min: [-4, -4], max: [4, 4],
      want: { result: true, t: 0, n: [1, 0] }
    },
    {
      name: 'origin inside (0, -1)',
      p: [1, -2], v: [1, 1], min: [-4, -4], max: [4, 4],
      want: { result: true, t: 0, n: [0, -1] }
    },
    {
      name: 'origin inside (0, 1)',
      p: [1, 2], v: [1, 1], min: [-4, -4], max: [4, 4],
      want: { result: true, t: 0, n: [0, 1] }
    }
  ];

  for (let test of tests) {
    let intersection = new intersect2d.Intersection2d();
    normalize(test.v);
    normalize(test.want.n);
    console.log(test.name);
    let result = intersect2d.raySquare(
        vec2.newFromArray(test.p),
        vec2.newFromArray(test.v),
        vec2.newFromArray(test.min),
        vec2.newFromArray(test.max),
        intersection);

    checkResult(test.want, result, intersection);
  }
}

export function testIntersectRayCircle() {
  let tests = [
    {
      name: 'Zero area hit',
      p: [-2, 0], v: [1, 0], c: [0, 0], r: 0,
      want: { result: true, t: 2, n: [-1, 0] }
    },
    {
      name: 'Zero area miss',
      p: [2, E], v: [-1, 0], c: [0, 0], r: 0,
      want: { result: false }
    },
    {
      name: 'Normal hit',
      p: [2, 3], v: [-1, -3.1], c: [1, 1], r: 0.4,
      want: { result: true, t: 1.996045, n: [0.968022, 0.250867] }
    },
    {
      name: 'Normal miss',
      p: [2, 3], v: [1, 3.1], c: [1, 1], r: 0.4,
      want: { result: false }
    },
    {
      name: 'Tangent',
      p: [-4, -3], v: [1, 0], c: [0, 0], r: 3,
      want: { result: true, t: 4, n: [0, -1] }
    },
    {
      name: 'Origin inside',
      p: [-1, -2], v: [1, 1], c: [0, 0], r: 5,
      want: { result: true, t: 0, n: [-1, -2] }
    },
    {
      name: 'Origin co-incident with center',
      p: [-1, -2], v: [3, 1], c: [-1, -2], r: 5,
      want: { result: true, t: 0, n: [-3, -1] }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect2d.Intersection2d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect2d.rayCircle(
        vec2.newFromArray(test.p),
        vec2.newFromArray(test.v),
        vec2.newFromArray(test.c),
        test.r,
        intersection);

    checkResult(test.want, result, intersection);
  }
}

export function testIntersectSweptCircleSquare() {
  let tests = [
    {
      name: 'Zero area hit',
      p: [-2, 0], v: [1, 0], r: 0, min: [0, 0], max: [0, 0],
      want: { result: true, t: 2, n: [-1, 0] }
    },
    {
      name: 'Zero radius edge hit',
      p: [4, 3], v: [-1, 0], r: 0, min: [-1, -2], max: [2, 5],
      want: { result: true, t: 2, n: [1, 0] }
    },
    {
      name: 'Tiny radius corner hit',
      p: [-3, 3], v: [1, -1], r: E, min: [-2, -6], max: [7, 2],
      want: { result: true, t: 1.4142136 - E, n: [-1, 0] }
    },
    {
      name: 'corner hit',
      p: [-3.1, 3], v: [1, -1], r: 0.5, min: [-2, -6], max: [7, 2],
      want: { result: true, t: 0.9899495, n: [-0.8, 0.6] }
    },
    {
      name: 'corner miss',
      p: [-2.1, 1.8], v: [1, 1], r: 1, min: [-1, -1], max: [1, 1],
      want: { result: false }
    },
    {
      name: 'inside square',
      p: [0.1, -0.2], v: [-2, 1], r: 1, min: [-1, -1], max: [1, 1],
      want: { result: true, t: 0, n: [0, -1] }
    },
    {
      name: 'inside corner towards',
      p: [-1.1, 1.2], v: [1, 1], r: 1, min: [-1, -1], max: [1, 1],
      want: { result: true, t: 0, n: [-1, 2] }
    },
    {
      name: 'inside corner away',
      p: [-1.1, 1.2], v: [-1, 1], r: 1, min: [-1, -1], max: [1, 1],
      want: { result: true, t: 0, n: [-1, 2] }
    },
  ];

  for (let test of tests) {
    let intersection = new intersect2d.Intersection2d();
    normalize(test.v); normalize(test.want.n);
    console.log(test.name);
    let result = intersect2d.sweptCircleSquare(
        vec2.newFromArray(test.p),
        vec2.newFromArray(test.v),
        test.r,
        vec2.newFromArray(test.min),
        vec2.newFromArray(test.max),
        intersection);

    checkResult(test.want, result, intersection);
  }
}

runTests(this);
