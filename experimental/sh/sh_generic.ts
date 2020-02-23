import * as vec3 from 'toybox/math/vec3';
import * as mat4 from 'toybox/math/mat4';

import * as icosphere from 'toybox/geom/icosphere';
import {Context} from 'toybox/gl/context';
import {GL} from 'toybox/gl/constants';
import {DynamicDraw} from 'toybox/gl/dynamic_draw';

import * as SH from 'toybox/math/sh_generic';

let canvas = document.createElement('canvas');
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.append(canvas);
canvas.width = Math.floor(canvas.offsetWidth / 2);
canvas.height = Math.floor(canvas.offsetHeight / 2);

let ctx = new Context(canvas, {depth: true, antialias: true});
let draw = new DynamicDraw(ctx);

ctx.onInit(() => {
  ctx.bindFramebuffer(null);

  let aspect = canvas.width / canvas.height;
  let view = mat4.newLookAt(vec3.scale(vec3.newZero(), 2.2, [-1, 1, 4]), [-1, 0, 0], [0, 1, 0]);
  let proj = mat4.newPerspective(60 * Math.PI / 180, aspect, 0.001, 100);
  let viewProj = mat4.mul(mat4.newZero(), proj, view);

  let spacing = 1.8;
  let maxL = 4;
  for (let l = 0; l <= maxL; ++l) {
    let ofs = vec3.newFromValues(0, (maxL / 2 - l) * spacing, 0);

    for (let m = -l; m <= l; ++m) {
      ofs[0] = m * spacing;

      let col = vec3.newFromValues(1, 1, 1);
      let sphere = icosphere.getMesh(5).clone();
      let colors: vec3.Type[] = [];
      for (let p of sphere.positions) {
        let theta = Math.acos(p[1]);
        let phi = Math.atan2(p[0], p[2]);
        let s = SH.SH(l, m, theta, phi);
        let col: vec3.Type;
        if (s > 0) {
          col = vec3.newFromValues(1.0, 0.9, 0.2);
        } else {
          s = -s;
          col = vec3.newFromValues(0.2, 0.9, 1.0);
        }
        colors.push(vec3.scale(col, s, col));
        vec3.scale(p, s, p);

        vec3.add(p, p, ofs);
      }

      for (let i = 0; i < sphere.faceIndices.length;) {
        let i0 = sphere.faceIndices[i++];
        let i1 = sphere.faceIndices[i++];
        let i2 = sphere.faceIndices[i++];
        let p0 = sphere.positions[i0];
        let p1 = sphere.positions[i1];
        let p2 = sphere.positions[i2];
        let c0 = colors[i0];
        let c1 = colors[i1];
        let c2 = colors[i2];
        draw.triangles.push(p0[0], p0[1], p0[2], c0[0], c0[1], c0[2], 1);
        draw.triangles.push(p1[0], p1[1], p1[2], c1[0], c1[1], c1[2], 1);
        draw.triangles.push(p2[0], p2[1], p2[2], c2[0], c2[1], c2[2], 1);
      }

      draw.axis(mat4.newTranslate(ofs[0], ofs[1], ofs[2]), 1, [0, 0, 0]);
    }
  }

  ctx.enable(GL.DEPTH_TEST);
  ctx.disable(GL.CULL_FACE);
  ctx.depthMask(true);
  ctx.colorMask(true, true, true, true);
  ctx.clearColor(0.9, 0.9, 0.9, 1);
  ctx.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
  ctx.colorMask(true, true, true, false);

  ctx.enable(GL.POLYGON_OFFSET_FILL);
  ctx.polygonOffset(1, 1);

  draw.flush(viewProj);
});

ctx.init();
