import {EPSILON} from './constants';
import * as vec2 from './vec2';

/**
 * Details about an intersection.
 * Populated by the various intersect functions.
 */
export class Intersection2d {
  // TODO(tom): Calculate intersection position too.
  n = vec2.newZero();
  constructor(public t=Infinity) {}

  set(other: Intersection2d) {
    this.t = other.t;
    vec2.setFromVec(this.n, other.n);
  }
}

// temporaries for rayCircle.
let rcM = vec2.newZero();

// temporaries for sweptCircleSquare.
let swsEmin = vec2.newZero();
let swsEmax = vec2.newZero();
let swsQ = vec2.newZero();
let swsC = vec2.newZero();
let swsJ = new Intersection2d();

/**
 * @param P Ray origin.
 * @param V Ray direction.
 * @param C Circle center.
 * @param r Circle radius.
 * @param i Intersection result, populated on a hit.
 * @return {boolean} true if the ray hits the circle.
 */
export function rayCircle(P: vec2.Type, V: vec2.Type, C: vec2.Type, r: number, i: Intersection2d) {
  let M = vec2.sub(rcM, P, C);

  let a = vec2.dot(M, V);
  let b = vec2.dot(M, M) - r * r;
  if (a > 0 && b > 0) { return false; }
  let discr = a * a - b;
  if (discr < 0) { return false; }

  let t = Math.max(0, -a - Math.sqrt(discr));
  if (t >= i.t) { return false; }

  i.t = t;
  vec2.add(i.n, P, vec2.scale(i.n, i.t, V));
  vec2.sub(i.n, i.n, C);
  let mag = vec2.length(i.n);
  if (mag > 0) {
    vec2.scale(i.n, 1 / mag, i.n);
  } else {
    vec2.neg(i.n, V);
  }
  return true;
}


function calcNormalForPointInSquare(P: vec2.Type, min: vec2.Type, max: vec2.Type, n: vec2.Type) {
  let midx = 0.5 * (max[0] + min[0]);
  let midy = 0.5 * (max[1] + min[1]);
  let dx = P[0] - midx;
  let dy = P[1] - midy;
  if (Math.abs(dx) > Math.abs(dy)) {
    n[0] = dx < 0 ? -1 : 1;
    n[1] = 0;
  } else {
    n[0] = 0;
    n[1] = dy < 0 ? -1 : 1;
  }
}


/**
 * @param P Ray origin.
 * @param V Ray direction.
 * @param min Square minimum corner.
 * @param max Square maximum corner.
 * @param i Intersection result, populated only on hit.
 * @return {boolean} true if the ray hits the square closer than i.t.
 */
export function raySquare(P: vec2.Type, V: vec2.Type, min: vec2.Type, max: vec2.Type, i: Intersection2d) {
  let tMin = 0;
  let tMax = Infinity;
  let minIdx = -1;

  for (let idx = 0; idx < 2; ++idx) {
    if (V[idx] == 0) {
      if (P[idx] < min[idx] || P[idx] > max[idx]) return false;
    } else {
      // Compute intersection t value of ray with near and far plane of slab.
      let t1 = (min[idx] - P[idx]) / V[idx];
      let t2 = (max[idx] - P[idx]) / V[idx];
      // Make t1 be intersection with near plane, t2 with far plane.
      if (t1 > t2) {
        let tmp = t1; t1 = t2; t2 = tmp;
      }
      // Compute the intersection of slab intersections intervals.
      if (t1 > tMin) {
        tMin = t1;
        if (tMin >= i.t) return false;
        minIdx = idx;
      }
      tMax = Math.min(tMax, t2);
      // Exit with no collision as soon as slab intersection becomes empty.
      if (tMin > tMax) return false;
    }
  }

  if (minIdx == -1) {
    i.t = 0;
    calcNormalForPointInSquare(P, min, max, i.n);
  } else {
    vec2.setFromValues(i.n, 0, 0);
    i.n[minIdx] = -Math.sign(V[minIdx]);
  }
  i.t = tMin;
  return true;
}

/**
 * @param P Circle origin.
 * @param V Circle direction.
 * @param r Circle radius.
 * @param min Square minimum corner.
 * @param max Square maximum corner.
 * @param i Intersection result, populated only on hit.
 * @return {boolean} true if the circle hits the square closer than the
 *     current i.t.
 */
export function sweptCircleSquare(P: vec2.Type, V: vec2.Type, r: number, min: vec2.Type, max: vec2.Type, i: Intersection2d) {
  // Expand the square's bounds by the circle radius.
  let emin = vec2.setFromValues(swsEmin, min[0] - r, min[1] - r);
  let emax = vec2.setFromValues(swsEmax, max[0] + r, max[1] + r);

  // Ray cast against the enlarged square.
  let j = swsJ;
  j.set(i);
  if (!raySquare(P, V, emin, emax, j)) { return false; }

  if (r > EPSILON) {
    // Check if the ray hit a corner.
    let q = vec2.add(swsQ, P, vec2.scale(swsQ, j.t, V));
    let u = 0;
    let v = 0;
    if (q[0] < min[0]) { u |= 1; }
    if (q[1] < min[1]) { u |= 2; }
    if (q[0] > max[0]) { v |= 1; }
    if (q[1] > max[1]) { v |= 2; }

    if ((u | v) == 3) {
      // x y u v
      // - - 3 0
      // - + 1 2
      // + - 2 1
      // + + 0 3
      let x = (u & 1) ? min[0] : max[0];
      let y = (u & 2) ? min[1] : max[1];
      return rayCircle(P, V, vec2.setFromValues(swsC, x, y), r, i);
    }
  }

  i.set(j);
  return true;
}
