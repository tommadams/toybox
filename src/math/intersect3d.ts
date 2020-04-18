import {EPSILON} from './constants'
import {vec3} from './vec3'

/**
 * Details about an intersection.
 * Populated by the various intersect functions.
 */
export class Intersection3d {
  t: number;
  p = vec3.newZero();
  n = vec3.newZero();

  constructor(opt_t?: number) {
    this.t = opt_t !== undefined ? opt_t : Infinity;
  }

  set(other: Intersection3d) {
    this.t = other.t;
    vec3.setFromVec(this.n, other.n);
    vec3.setFromVec(this.p, other.p);
  }
}

// Temporaries for raySphere.
let rsM = vec3.newZero();

// Temporaries for sweptSphereQuadrilateral.
let ssqAB = vec3.newZero();
let ssqAC = vec3.newZero();
let ssqN = vec3.newZero();
let ssqX = vec3.newZero();
let ssqY = vec3.newZero();

// Temporaries for sweptSphereTriangle.
let sstAB = vec3.newZero();
let sstAC = vec3.newZero();
let sstN = vec3.newZero();
let sstX = vec3.newZero();
let sstY = vec3.newZero();

// Temporaries for sweptSphereEdge_.
let sseAB = vec3.newZero();
let sseAP = vec3.newZero();
let sseQ = vec3.newZero();
let sseR = vec3.newZero();
let sseX = vec3.newZero();
let sseXP = vec3.newZero();
let edgeIntersection = new Intersection3d();

// Temporaries for pointInTriangle.
let pitA = vec3.newZero();
let pitB = vec3.newZero();
let pitC = vec3.newZero();
let pitU = vec3.newZero();
let pitV = vec3.newZero();
let pitW = vec3.newZero();

// Temporaries for pointInQuadrilateral.
let piqN = vec3.newZero();
let piqA = vec3.newZero();
let piqB = vec3.newZero();
let piqC = vec3.newZero();
let piqD = vec3.newZero();
let piqX = vec3.newZero();


/// /**
///  * @param {!vec3.Type} P Point.
///  * @param {!vec3.Type} A First capsule point.
///  * @param {!vec3.Type} B Second capsule point.
///  * @param {number} r Capsule radius.
///  * @param {!toybox.Intersection3d} i Intersection result:
///  *     t: the distance of the point inside the capsule
///  *     p: the closest point on the capsule surface
///  *     n: the capsule's surface normal at p
///  * @param {vec3.Type} opt_coincident_N optional intersection normal to use if
///  *     P is coincident with the line AB.
///  * @return {boolean}
///  */
/// pointCapsule = function(P, A, B, r, i, opt_coincident_N) {
///   let tmp = pointCapsule;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let abLenSqr = vec3.magnitudeSquared(AB);
///   if (abLenSqr == 0) {
///     return pointSphere(P, A, r, i, opt_coincident_N);
///   }
/// 
///   let AP = vec3.subtract(P, A, tmp.AP_);
///   let t = vec3.dot(AP, AB) / abLenSqr;
/// 
///   if (t <= 0) {
///     if (!opt_coincident_N) {
///       opt_coincident_N = AP;
///       toybox.makePerpendicularVector_(AB, opt_coincident_N);
///     }
///     return pointSphere(P, A, r, i, opt_coincident_N);
///   }
///   if (t >= 1) {
///     if (!opt_coincident_N) {
///       opt_coincident_N = AP;
///       toybox.makePerpendicularVector_(AB, opt_coincident_N);
///     }
///     return pointSphere(P, B, r, i, opt_coincident_N);
///   }
/// 
///   let X = vec3.lerp(A, B, t, tmp.X_);
///   let XP = vec3.subtract(P, X, tmp.XP_);
/// 
///   let xpLenSqr = vec3.magnitudeSquared(XP);
///   if (xpLenSqr > r * r) { return false; }
/// 
///   let xpLen = Math.sqrt(xpLenSqr);
///   i.t = r - xpLen;
///   if (xpLen > 0) {
///     vec3.scale(XP, 1 / xpLen, i.n);
///   } else {
///     if (opt_coincident_N) {
///       vec3.setFromVec3f(i.n, opt_coincident_N);
///     } else {
///       toybox.makePerpendicularVector_(AB, i.n);
///     }
///   }
///   vec3.add(P, vec3.scale(i.n, i.t, i.p), i.p);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// pointCapsule.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// pointCapsule.AP_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// pointCapsule.XP_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// pointCapsule.X_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Point.
///  * @param {!vec3.Type} C Sphere center.
///  * @param {number} r Sphere radius.
///  * @param {!toybox.Intersection3d} i Intersection result.
///  *     t: the distance of the point inside the sphere
///  *     p: the closest point on the sphere surface
///  *     n: the sphere's surface normal at p
///  * @param {vec3.Type} opt_coincident_N optional intersection normal to use if
///  *     P and C are coincident.
///  * @return {boolean}
///  */
/// pointSphere = function(P, C, r, i, opt_coincident_N) {
///   let tmp = pointSphere;
/// 
///   let CP = vec3.subtract(P, C, tmp.CP_);
///   let cpLenSqr = vec3.magnitudeSquared(CP);
///   if (cpLenSqr > r * r) { return false; }
///   let cpLen = Math.sqrt(cpLenSqr);
///   i.t = r - cpLen;
///   if (cpLen == 0) {
///     if (opt_coincident_N) {
///       vec3.setFromVec3f(i.n, opt_coincident_N);
///     } else {
///       vec3.setFromValues(i.n, 0, 1, 0);
///     }
///   } else {
///     vec3.scale(CP, 1 / cpLen, i.n);
///   }
///   vec3.add(P, vec3.scale(i.n, i.t, i.p), i.p);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// pointSphere.CP_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Ray origin.
///  * @param {!vec3.Type} V Ray direction.
///  * @param {!vec3.Type} A First capsule point.
///  * @param {!vec3.Type} B Second capsule point.
///  * @param {number} r Capsule radius.
///  * @param {!toybox.Intersection3d} i Intersection result.
///  * @return {boolean}
///  */
/// rayCapsule = function(P, V, A, B, r, i) {
///   let tmp = rayCapsule;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let d = vec3.dot(AB, AB);
/// 
///   // Degenerate case of a spherical capsule.
///   if (d == 0) { return raySphere(P, V, A, r, i); }
/// 
///   let AP = vec3.subtract(P, A, tmp.AP_);
///   let m = vec3.dot(V, AB) / d;
///   let n = vec3.dot(AP, AB) / d;
///   let Q = vec3.subtract(V, vec3.scale(AB, m, tmp.Q_), tmp.Q_);
///   let R = vec3.subtract(AP, vec3.scale(AB, n, tmp.R_), tmp.R_);
/// 
///   // a can be 0.0 if V is parallel to AB.
///   // To simplify the logic somewhat, we allow division by 0.0 when calculating
///   // discr and check for a == 0.0 where appropriate.
///   let a = vec3.dot(Q, Q);
/// 
///   let b = 2 * vec3.dot(Q, R);
///   let c = vec3.dot(R, R) - r * r;
/// 
///   // TODO(tom): Use a more robust algorithm to solve the quadratic equation:
///   //   2c / (-b -+ sqrt(b^2 -4ac))
///   // temp = -0.5 * (b + sign(b) * sqrt(b*b - 4*a*c);
///   // x1 = temp / a;
///   // x2 = c / temp;
///   // Remember to check for division by zero!
/// 
///   let discr = b * b - 4 * a * c;
///   if (discr < 0) { return false; }
/// 
///   let sqrtDiscr = Math.sqrt(discr);
///   let tMax = (-b + sqrtDiscr) / (2 * a);
///   if (tMax < 0 && a != 0) { return false; }
/// 
///   let tMin = (-b - sqrtDiscr) / (2 * a);
///   if (tMin < 0 || a == 0) {
///     // Ray origin is either inside infinite cylinder or ray is parallel to AB.
///     if (n < 0) { return raySphere(P, V, A, r, i); }
///     if (n > 1) { return raySphere(P, V, B, r, i); }
/// 
///     // Ray origin is inside cylindrical part of capsule.
///     let X = vec3.add(A, vec3.scale(AB, n, tmp.X_), tmp.X_);
///     let XP = vec3.subtract(P, X, tmp.XP_);
///     let len = vec3.magnitude(XP);
/// 
///     // Ray is parallel to AB and outside of the infinite cylinder.
///     if (a == 0 && len > r) { return false; }
/// 
///     i.t = 0;
///     if (len > 0) {
///       vec3.scale(XP, 1 / len, i.n);
///     } else {
///       toybox.makePerpendicularVector_(AB, i.n);
///     }
///     vec3.setFromVec3f(i.p, P);
///     return true;
///   }
/// 
///   if (tMin >= i.t) { return false; }
/// 
///   let ct = tMin * m + n;
///   if (ct < 0) { return raySphere(P, V, A, r, i); }
///   if (ct > 1) { return raySphere(P, V, B, r, i); }
/// 
///   let X = vec3.add(A, vec3.scale(AB, ct, tmp.X_), tmp.X_);
/// 
///   i.t = tMin;
///   vec3.add(P, vec3.scale(V, i.t, i.p), i.p);
///   vec3.normalize(vec3.subtract(i.p, X, i.n), i.n);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.AP_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.Q_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.R_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.X_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayCapsule.XP_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Ray origin.
///  * @param {!vec3.Type} V Ray direction.
///  * @param {!vec4.Type} plane The plane [a, b, c, d],
///  *     where ax + by + cz + d = 0.
///  * @param {!toybox.Intersection3d} i Intersection result, populated only on hit.
///  * @return {boolean} true if the ray hits the plane.
///  */
/// rayPlane = function(P, V, plane, i) {
///   let PN = vec3.dot(P, plane);
///   let VN = vec3.dot(V, plane);
///   if (VN >= 0) { return false; }
/// 
///   let t = (plane[3] - PN) / VN;
///   if (t < 0 || t >= i.t) { return false; }
/// 
///   i.t = t;
///   vec3.add(P, vec3.scale(V, i.t, i.p), i.p);
///   vec3.setFromVec3f(i.n, plane);
///   return true;
/// }
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Ray origin.
///  * @param {!vec3.Type} V Ray direction.
///  * @param {!vec3.Type} A First quadrilateral vertex.
///  * @param {!vec3.Type} B Second quadrilateral vertex.
///  * @param {!vec3.Type} C Third quadrilateral vertex.
///  * @param {!vec3.Type} D Fourth quadrilateral vertex.
///  * @param {!toybox.Intersection3d} i Intersection result, populated only on hit.
///  * @return {boolean} true if the ray hits the quadrilateral.
///  */
/// rayQuadrilateral = function(P, V, A, B, C, D, i) {
///   // Intersection is performed against the two triangles ABC and ACD:
///   // A --- D
///   // | \   |
///   // |  \  |
///   // |   \ |
///   // B --- C
///   let tmp = rayQuadrilateral;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let AC = vec3.subtract(C, A, tmp.AC_);
///   // TODO(tom): This normal faces the wrong way.
///   let N = vec3.cross(AB, AC, tmp.N_);
/// 
///   let denom = -vec3.dot(V, N);
///   if (denom <= 0) { return false; }
/// 
///   let AP = vec3.subtract(P, A, tmp.AP_);
///   let t = vec3.dot(AP, N);
///   if (t < 0) { return false; }
/// 
///   t /= denom;
///   if (t >= i.t) { return false; }
/// 
///   let E = vec3.cross(AP, V, tmp.E_);
///   let v = vec3.dot(AC, E);
///   if (v > denom) { return false; }
/// 
///   if (v < 0) {
///     vec3.subtract(D, A, AB);
///     v = vec3.dot(AB, E);
///     denom = -vec3.dot(V, vec3.cross(AC, AB, N));
///     if (v < 0) { return false; }
///     let w = -vec3.dot(AC, E);
///     if (w < 0 || v + w > denom) { return false; }
///   } else {
///     let w = -vec3.dot(AB, E);
///     if (w < 0 || v + w > denom) { return false; }
///   }
/// 
///   i.t = t;
///   vec3.add(P, vec3.scale(V, i.t, i.p), i.p);
///   vec3.normalize(N, i.n);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayQuadrilateral.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayQuadrilateral.AC_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayQuadrilateral.AP_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayQuadrilateral.E_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayQuadrilateral.N_ = vec3.create();


/**
 * @param P Ray origin.
 * @param V Ray direction.
 * @param C Sphere center.
 * @param r Sphere radius.
 * @param i Intersection result, populated only on hit.
 * @return {boolean} true if the ray hits the sphere.
 */
export function raySphere(
    P: vec3.Type, V: vec3.Type, C: vec3.Type, r: number, i: Intersection3d) {
  let M = vec3.sub(rsM, P, C);

  let a = vec3.dot(M, V);
  let b = vec3.dot(M, M) - r * r;
  if (a > 0 && b > 0) { return false; }
  let discr = a * a - b;
  if (discr < 0) { return false; }

  let t = Math.max(0, -a - Math.sqrt(discr));
  if (t >= i.t) { return false; }

  i.t = t;
  vec3.add(i.p, P, vec3.scale(i.p, i.t, V));
  vec3.sub(i.n, i.p, C);
  let mag = vec3.length(i.n);
  if (mag > 0) {
    vec3.scale(i.n, 1 / mag, i.n);
  } else {
    vec3.neg(i.n, V);
  }
  return true;
}
/// 
/// 
/// /** @private {!vec3.Type} */
/// raySphere.M_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Ray origin.
///  * @param {!vec3.Type} V Ray direction.
///  * @param {!vec3.Type} A First triangle vertex.
///  * @param {!vec3.Type} B Second triangle vertex.
///  * @param {!vec3.Type} C Third triangle vertex.
///  * @param {!toybox.Intersection3d} i Intersection result, populated only on hit.
///  * @return {boolean} true if the ray hits the triangle.
///  */
/// rayTriangle = function(P, V, A, B, C, i) {
///   let tmp = rayTriangle;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let AC = vec3.subtract(C, A, tmp.AC_);
///   let N = vec3.cross(AB, AC, tmp.N_);
/// 
///   let denom = -vec3.dot(V, N);
///   if (denom <= 0) { return false; }
/// 
///   let AP = vec3.subtract(P, A, tmp.AP_);
///   let t = vec3.dot(AP, N);
///   if (t < 0) { return false; }
/// 
///   t /= denom;
///   if (t >= i.t) { return false; }
/// 
///   let E = vec3.cross(AP, V, tmp.E_);
///   let v = vec3.dot(AC, E);
///   if (v < 0 || v > denom) { return false; }
///   let w = -vec3.dot(AB, E);
///   if (w < 0 || v + w > denom) { return false; }
/// 
///   i.t = t;
///   vec3.add(P, vec3.scale(V, i.t, i.p), i.p);
///   vec3.normalize(N, i.n);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayTriangle.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayTriangle.AC_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayTriangle.AP_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayTriangle.E_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// rayTriangle.N_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Sphere center.
///  * @param {number} r Sphere radius.
///  * @param {!vec3.Type} A First triangle vertex.
///  * @param {!vec3.Type} B Second triangle vertex.
///  * @param {!vec3.Type} C Third triangle vertex.
///  * @param {!toybox.Intersection3d} i Intersection result, populated only on hit.
///  * @return {boolean} true if the sphere intersects the triangle.
///  */
/// sphereTriangle = function(P, r, A, B, C, i) {
///   let tmp = sphereTriangle;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let AC = vec3.subtract(C, A, tmp.AC_);
/// 
///   let N = vec3.cross(AB, AC, tmp.N_);
///   vec3.normalize(N, N);
/// 
///   // Intersect the sphere and the triangle's plane.
///   let dist = vec3.dot(N, P) - vec3.dot(N, A);
///   let absDist = Math.abs(dist);
///   if (absDist > r) { return false; }
/// 
///   if (dist < 0) {
///     vec3.negate(N, N);
///   }
/// 
///   // Check if the intersection point is inside the triangle.
///   if (pointInTriangle(P, A, B, C)) {
///     i.t = absDist;
///     vec3.subtract(P, vec3.scale(N, i.t, i.p), i.p);
///     vec3.setFromVec3f(i.n, N);
///     return true;
///   }
/// 
///   let result = pointCapsule(P, A, B, r, i, N) ||
///       pointCapsule(P, B, C, r, i, N) ||
///       pointCapsule(P, C, A, r, i, N);
///   if (result) {
///     vec3.add(P, vec3.scale(i.n, i.t, i.p), i.p);
///   }
///   return result;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereTriangle.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereTriangle.AC_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereTriangle.N_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Sphere center.
///  * @param {number} r Sphere radius.
///  * @param {!vec3.Type} A First quadrilateral vertex.
///  * @param {!vec3.Type} B Second quadrilateral vertex.
///  * @param {!vec3.Type} C Third quadrilateral vertex.
///  * @param {!vec3.Type} D Fourth quadrilateral vertex.
///  * @param {!toybox.Intersection3d} i Intersection result, populated only on hit.
///  * @return {boolean} true if the sphere intersects the quadrilateral.
///  */
/// sphereQuadrilateral = function(P, r, A, B, C, D, i) {
///   let tmp = sphereQuadrilateral;
/// 
///   let AB = vec3.subtract(B, A, tmp.AB_);
///   let AC = vec3.subtract(C, A, tmp.AC_);
/// 
///   let N = vec3.cross(AB, AC, tmp.N_);
///   vec3.normalize(N, N);
/// 
///   // Intersect the swept sphere and the triangle's plane.
///   let dist = vec3.dot(N, P) - vec3.dot(N, A);
///   let absDist = Math.abs(dist);
///   if (absDist > r) { return false; }
/// 
///   if (dist < 0) {
///     vec3.negate(N, N);
///   }
/// 
///   // Check if the intersection point is inside the triangle.
///   if (pointInQuadrilateral(P, A, B, C, D)) {
///     i.t = absDist;
///     vec3.subtract(P, vec3.scale(N, i.t, i.p), i.p);
///     vec3.setFromVec3f(i.n, N);
///     return true;
///   }
/// 
///   let result = pointCapsule(P, A, B, r, i, N) ||
///       pointCapsule(P, B, C, r, i, N) ||
///       pointCapsule(P, C, D, r, i, N) ||
///       pointCapsule(P, D, A, r, i, N);
///   if (result) {
///     vec3.subtract(P, vec3.scale(i.n, i.t, i.p), i.p);
///   }
///   return result;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereQuadrilateral.AB_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereQuadrilateral.AC_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// sphereQuadrilateral.N_ = vec3.create();
/// 
/// 
/// /**
///  * @param {!vec3.Type} P Sphere origin.
///  * @param {!vec3.Type} V Sphere direction.
///  * @param {number} r Sphere radius.
///  * @param {!vec4.Type} plane Plane.
///  * @param {!toybox.Intersection3d} i intersection result, populated only on hit.
///  * @return {boolean} true if the sphere hits the quadrilateral closer than the
///  *     current i.t.
///  */
/// sweptSpherePlane = function(P, V, r, plane, i) {
///   let tmp = sweptSpherePlane;
/// 
///   let denom = vec3.dot(plane, V);
///   if (denom > -toybox.EPSILON) { return false; }
/// 
///   let t;
/// 
///   // Intersect the swept sphere and the quadrilateral's plane.
///   let dist = vec3.dot(plane, P) - plane[3];
///   if (Math.abs(dist) <= r) {
///     t = 0.0;
///   } else {
///     if (denom * dist >= 0.0) { return false; }
///     if (dist < 0.0) { r = -r; }
///     t = (r - dist) / denom;
///   }
/// 
///   if (t >= i.t) { return false; }
/// 
///   i.t = t;
///   vec3.add(P, vec3.scale(V, i.t, i.p), i.p);
///   vec3.setFromVec3f(i.n, plane);
///   return true;
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// sweptSpherePlane.N_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// sweptSpherePlane.X_ = vec3.create();


/**
 * Helper method for the intersect.sweptSphere functions.
 * It is similar to intersect.rayCapsule, but only checks the spherical endcap
 * for vertex A. Since we test every edge of a polygon, there's no need to
 * check both endcaps; doing so would end up each vertex twice.
 * @param P Sphere origin.
 * @param V Sphere direction.
 * @param r Sphere radius.
 * @param A First edge vertex.
 * @param B Second edge vertedx.
 * @param i Intersection result.
 * @param N Polygon normal.
 * @return {boolean} true if the sphere hits the edge closer than the
 *     current i.t.
 * @private
 */
function sweptSphereEdge_(
    P: vec3.Type, V: vec3.Type, r: number,
    A: vec3.Type, B: vec3.Type, i: Intersection3d, N: vec3.Type) {
  let AB = vec3.sub(sseAB, B, A);
  let d = vec3.dot(AB, AB);

  let AP = vec3.sub(sseAP, P, A);
  let m = vec3.dot(V, AB) / d;
  let n = vec3.dot(AP, AB) / d;
  let Q = vec3.sub(sseQ, V, vec3.scale(sseQ, m, AB));
  let R = vec3.sub(sseR, AP, vec3.scale(sseR, n, AB));

  // TODO(tom): Remove this
  if (!isFinite(Q[0])) {
    debugger;
  }

  // a can be 0.0 V is parallel to AB.
  // To simplify the logic somewhat, we allow division by 0.0 when calculating
  // discr and check for a == 0.0 where appropriate.
  let a = vec3.dot(Q, Q);

  let b = 2 * vec3.dot(Q, R);
  let c = vec3.dot(R, R) - r * r;

  let discr = b * b - 4 * a * c;
  if (discr < 0) { return false; }

  let sqrtDiscr = Math.sqrt(discr);
  let tMax = (-b + sqrtDiscr) / (2 * a);
  if (tMax < 0 && a != 0) { return false; }

  let tMin = (-b - sqrtDiscr) / (2 * a);
  if (tMin < 0 || a == 0) {
    // Ray origin is either inside infinite cylinder or ray is parallel to AB.
    if (n < 0) { return raySphere(P, V, A, r, i); }
    if (n > 1) { return false; }

    // Ray origin is inside the edge's cylinder.
    let X = vec3.add(sseX, A, vec3.scale(sseX, n, AB));
    let XP = vec3.sub(sseXP, P, X);
    let len = vec3.length(XP);

    // Ray is parallel to AB and outside of the infinite cylinder.
    if (a == 0 && len > r) { return false; }

    i.t = 0;
    vec3.setFromVec(i.p, P);
    if (len > 0) {
      vec3.scale(i.n, 1 / len, XP);
    } else {
      vec3.setFromVec(i.n, N);
    }
    return true;
  }

  if (tMin >= i.t) { return false; }

  let ct = tMin * m + n;
  if (ct < 0) { return raySphere(P, V, A, r, i); }
  if (ct > 1) { return false; }

  let X = vec3.add(sseX, A, vec3.scale(sseX, ct, AB));

  i.t = tMin;
  vec3.add(i.p, vec3.scale(i.p, i.t, V), P);
  vec3.normalize(i.n, vec3.sub(i.n, i.p, X));
  return true;
}

/**
 * @param P Sphere origin.
 * @param V Sphere direction.
 * @param r Sphere radius.
 * @param A First quadrilateral vertex.
 * @param B Second quadrilateral vertex.
 * @param C Third quadrilateral vertex.
 * @param D Fourth quadrilateral vertex.
 * @param i Intersection result, populated only on hit.
 * @return {boolean} true if the sphere hits the quadrilateral closer than the
 *     current i.t.
 */
export function sweptSphereQuadrilateral(
    P: vec3.Type, V: vec3.Type, r: number,
    A: vec3.Type, B: vec3.Type, C: vec3.Type, D: vec3.Type,
    i: Intersection3d) {
  let AB = vec3.sub(ssqAB, B, A);
  let AC = vec3.sub(ssqAC, C, A);

  let N = vec3.cross(ssqN, AB, AC);
  vec3.normalize(N, N);

  let denom = vec3.dot(N, V);
  if (denom > -EPSILON) { return false; }

  // Intersect the swept sphere and the quadrilateral's plane.
  let X, t;
  let np = vec3.dot(N, P);
  let dist = np - vec3.dot(N, A);
  if (Math.abs(dist) <= r) {
    // Sphere already intersects the quadrilateral's plane.
    // Project the sphere center onto the plane and use that as the intersection
    // point.
    t = 0.0;
    X = vec3.add(ssqX, P, vec3.scale(ssqX, -dist, N));
  } else {
    if (denom * dist >= 0.0) { return false; }
    if (dist < 0.0) { r = -r; }

    t = (r - dist) / denom;
    if (t >= i.t) { return false; }

    X = vec3.add(ssqX, P, vec3.scale(ssqX, t, V));
    vec3.sub(X, X, vec3.scale(ssqY, r, N));
  }

  if (t >= i.t) { return false; }

  // Check if the intersection point is inside the quadrilateral.
  if (pointInQuadrilateral(X, A, B, C, D)) {
    i.t = t;
    vec3.add(i.p, P, vec3.scale(i.p, i.t, V));
    vec3.setFromVec(i.n, N);
    return true;
  }

  let ei = edgeIntersection;
  ei.t = i.t;

  // Note the slightly unusual ordering of the logical ORs: we don't
  // want to to short-ciruit any of the calls to intersect.sweptSphereEdge_.
  // TODO(tom): why not?
  let result = sweptSphereEdge_(P, V, r, A, B, ei, N);
  result = sweptSphereEdge_(P, V, r, B, C, ei, N) || result;
  result = sweptSphereEdge_(P, V, r, C, D, ei, N) || result;
  result = sweptSphereEdge_(P, V, r, D, A, ei, N) || result;

  if (result) {
    if (vec3.dot(ei.n, V) > -EPSILON) { return false; }
    i.t = ei.t;
    vec3.setFromVec(i.p, ei.p);
    vec3.setFromVec(i.n, ei.n);
  }
  return result;
}


/**
 * @param P Sphere origin.
 * @param V Sphere direction.
 * @param r Sphere radius.
 * @param A First triangle vertex.
 * @param B Second triangle vertex.
 * @param C Third triangle vertex.
 * @param i Intersection result, populated only on hit.
 * @return {boolean} true if the sphere hits the triangle closer than the
 *       current i.t.
 */
export function sweptSphereTriangle(
    P: vec3.Type, V: vec3.Type, r: number,
    A: vec3.Type, B: vec3.Type, C: vec3.Type,
    i: Intersection3d) {
  let AB = vec3.sub(sstAB, B, A);
  let AC = vec3.sub(sstAC, C, A);

  let N = vec3.cross(sstN, AB, AC);
  vec3.normalize(N, N);

  let denom = vec3.dot(N, V);
  if (denom > -EPSILON) { return false; }

  // Intersect the swept sphere and the triangle's plane.
  let X, t;
  let np = vec3.dot(N, P);
  let dist = np - vec3.dot(N, A);
  if (Math.abs(dist) <= r) {
    // Sphere already intersects the triangle's plane.
    // Project the sphere center onto the plane and use that as the intersection
    // point.
    t = 0.0;
    X = vec3.add(sstX, P, vec3.scale(sstX, -np, N));
  } else {
    if (denom * dist >= 0.0) { return false; }
    if (dist < 0.0) { r = -r; }

    t = (r - dist) / denom;
    if (t >= i.t) { return false; }

    X = vec3.add(sstX, P, vec3.scale(sstX, t, V));
    vec3.sub(X, X, vec3.scale(sstY, r, N));
  }

  if (t >= i.t) { return false; }

  // Check if the intersection point is inside the triangle.
  if (pointInTriangle(X, A, B, C)) {
    i.t = t;
    vec3.add(i.p, P, vec3.scale(i.p, i.t, V));
    vec3.setFromVec(i.n, N);
    return true;
  }

  let ei = edgeIntersection;
  ei.t = i.t;

  // Note the slightly unusual ordering of the logical ORs: we don't
  // want to to short-ciruit any of the calls to sweptSphereEdge_.
  let result = sweptSphereEdge_(P, V, r, A, B, ei, N);
  result = sweptSphereEdge_(P, V, r, B, C, ei, N) || result;
  result = sweptSphereEdge_(P, V, r, C, A, ei, N) || result;

  if (result) {
    if (vec3.dot(ei.n, V) > -EPSILON) { return false; }
    i.t = ei.t;
    vec3.setFromVec(i.p, ei.p);
    vec3.setFromVec(i.n, ei.n);
  }
  return result;
}
/// 
/// 
/// /**
///  * Sets result to a unit length vector that is perpendicular to V.
///  * @param {!vec3.Type} V
///  * @param {!vec3.Type} result
///  * @private
///  */
/// toybox.makePerpendicularVector_ = function(V, result) {
///   let tmp = toybox.makePerpendicularVector_;
/// 
///   let absV = vec3.abs(V, tmp.absV_);
/// 
///   let minElem;
///   if (absV[0] < absV[1]) {
///     minElem = absV[0] < absV[2] ? 0 : 2;
///   } else {
///     minElem = absV[1] < absV[2] ? 1 : 2;
///   }
/// 
///   let W = vec3.setFromValues(tmp.W_, 0, 0, 0);
///   W[minElem] = 1;
/// 
///   vec3.normalize(vec3.cross(V, W, result), result);
/// }
/// 
/// 
/// /** @private {!vec3.Type} */
/// toybox.makePerpendicularVector_.W_ = vec3.create();
/// 
/// 
/// /** @private {!vec3.Type} */
/// toybox.makePerpendicularVector_.absV_ = vec3.create();

export function pointInTriangle(
    P: vec3.Type, A: vec3.Type, B: vec3.Type, C: vec3.Type) {
  A = vec3.sub(pitA, A, P);
  B = vec3.sub(pitB, B, P);
  C = vec3.sub(pitC, C, P);

  let U = vec3.cross(pitU, A, B);
  let V = vec3.cross(pitV, B, C);
  if (vec3.dot(U, V) < 0) { return false; }
  let W = vec3.cross(pitW, C, A);
  return vec3.dot(V, W) >= 0;
}

export function pointInQuadrilateral(
    P: vec3.Type, A: vec3.Type, B: vec3.Type, C: vec3.Type, D: vec3.Type) {
  let N = vec3.cross(
      piqN,
      vec3.sub(piqA, B, A),
      vec3.sub(piqB, D, A));

  A = vec3.sub(piqA, A, P);
  B = vec3.sub(piqB, B, P);
  C = vec3.sub(piqC, C, P);
  D = vec3.sub(piqD, D, P);

  if (vec3.dot(N, vec3.cross(piqX, A, B)) < 0) { return false; }
  if (vec3.dot(N, vec3.cross(piqX, B, C)) < 0) { return false; }
  if (vec3.dot(N, vec3.cross(piqX, C, D)) < 0) { return false; }
  if (vec3.dot(N, vec3.cross(piqX, D, A)) < 0) { return false; }
  return true;
}
