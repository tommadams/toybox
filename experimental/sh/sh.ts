// Grace Cathederal light probe from:
//   https://www.pauldebevec.com/Probes/

import {linearFloatToSrgbByteAccurate} from 'toybox/color/srgb';
import * as vec3 from 'toybox/math/vec3';
import * as sh3 from 'toybox/math/sh3';

// Light probe size in pixels.
let size = 250;

function createCanvas(rgb: Uint8Array, width: number, height: number) {
  if (width * height * 3 != rgb.length) {
    throw new Error(`image size (${width}x${height}) doesn't match data length (${rgb.length})`);
  }

  let canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext('2d');
  let imageData = ctx.createImageData(width, height);

  let srcIdx = 0;
  let dstIdx = 0;
  let dst = imageData.data;
  for (let j = 0; j < size; ++j) {
    for (let i = 0; i < size; ++i) {
      dst[dstIdx++] = rgb[srcIdx++];
      dst[dstIdx++] = rgb[srcIdx++];
      dst[dstIdx++] = rgb[srcIdx++];
      dst[dstIdx++] = 0xff;
    }
  }

  imageData.data.set(dst);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// Sets dst to the direction vector corresponding to the light probe's (u,v)
// coordinate and returns the solid angle.
// Note that the coordinate mapping of Debevec's light probes is not a standard
// spherical environment map where (u,v) defines the (x,y) coordinates of the
// surface normal of the sphere. Instead, the mapping is theta=atan2(v,u),
// phi=pi*sqrt(u*u+v*v) and direction vector is obtained by rotating (0,0,-1)
// by phi around Y and then by theta around -Z.
function unmap(dst: vec3.Type, u: number, v: number) {
  // Calculate direction vector.
  let theta = Math.atan2(v, u);
  let phi = Math.PI * Math.sqrt(u*u + v*v);
  let st = Math.sin(theta);
  let ct = Math.cos(theta);
  let sp = Math.sin(phi);
  let cp = Math.cos(phi);
  vec3.setFromValues(dst, -sp * ct, -sp * st, -cp);

  // Projected solid angle.
  const x = (2 * Math.PI / size) * (2 * Math.PI / size);
  if (phi == 0) {
    return x;
  } else {
    return x * Math.sin(phi) / phi;
  }
}

function run(buf: ArrayBuffer) {
  let src = new Float32Array(buf);

  let dir = vec3.newZero();
  let col = vec3.newZero();
  let sh = sh3.newZero();

  // Project light probe radiance into SH.
  for (let j = 0; j < size; ++j) {
    let v = 2 * (j + 0.5) / size - 1;
    for (let i=0; i<size; ++i) {
      let u = 2 * (i + 0.5) / size - 1;
      if (u*u + v*v > 1) { continue; }

      let idx = 3 * (j * size + i);
      vec3.setFromValues(col, src[idx], src[idx + 1], src[idx + 2]);

      let dOmega = unmap(dir, u, v);
      vec3.scale(col, dOmega, col);
      sh3.project(sh, col, dir);
    }
  }

  // Convert radiance to irradiance.
  sh3.radianceToIrradiance(sh, sh);

  // Expand out of SH.
  let irradiance = new Float32Array(size * size * 3);
  for (let j = 0; j < size; ++j) {
    let v = 2 * (j + 0.5) / size - 1;
    for (let i=0; i<size; ++i) {
      let u = 2 * (i + 0.5) / size - 1;
      if (u*u + v*v > 1) { continue; }

      unmap(dir, u, v);
      sh3.evalDirection(col, sh, dir);

      let idx = 3 * (j * size + i);
      irradiance[idx + 0] = col[0];
      irradiance[idx + 1] = col[1];
      irradiance[idx + 2] = col[2];
    }
  }

  document.body.appendChild(createCanvas(linearFloatToSrgbByteAccurate(src, 2.5), size, size));
  document.body.appendChild(createCanvas(linearFloatToSrgbByteAccurate(irradiance, 2.5), size, size));
}

let req = new XMLHttpRequest();
req.open('GET', 'grace_probe.float', true);
req.responseType = 'arraybuffer';
req.onload = () => {
  if (req.status != 200) {
    throw new Error(
         'Failed to load "' + req.responseURL + '" : (' +
          req.status + ') ' + req.statusText);
  }

  run(req.response);
};
req.send(null);
