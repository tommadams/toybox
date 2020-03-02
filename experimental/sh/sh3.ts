// Grace Cathederal light probe from:
//   https://www.pauldebevec.com/Probes/

import {linearFloatToSrgbByteAccurate} from 'toybox/color/srgb';
import * as vec3 from 'toybox/math/vec3';
import * as mat4 from 'toybox/math/mat4';
import * as sh3 from 'toybox/math/sh3';

import * as icosphere from 'toybox/geom/icosphere';
import {Context} from 'toybox/gl/context';
import {GL} from 'toybox/gl/constants';
import {DynamicDraw} from 'toybox/gl/dynamic_draw';

import * as SH from 'toybox/math/sh_generic';


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

function generateSamples(samples: vec3.Type[], sqrtSampleCount: number) {
  let i = 0;
  let oneoverN = 1 / sqrtSampleCount;
  for (let a = 0; a < sqrtSampleCount; ++a) {
    for (let b = 0; b < sqrtSampleCount; ++b) {
      let x = (a + Math.random()) * oneoverN;
      let y = (b + Math.random()) * oneoverN;
      let theta = 2.0 * Math.acos(Math.sqrt(1.0 - x));
      let phi = 2.0 * Math.PI * y;
      vec3.setFromValues(
          samples[i++],
          Math.sin(theta) * Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
          Math.cos(theta));
    }
  }
}

function run(buf: ArrayBuffer) {
  let start = Date.now();

  let src = new Float32Array(buf);


  let dir = vec3.newZero();
  let col = vec3.newZero();
  let sh = sh3.newZero();

  /// for (let j = 0; j < size; ++j) {
  ///   let v = 2 * (j + 0.5) / size - 1;
  ///   for (let i=0; i<size; ++i) {
  ///     let u = 2 * (i + 0.5) / size - 1;
  ///     unmap(dir, u, v);
  ///     let idx = 3 * (j * size + i);
  ///     if (dir[1] > 0) {
  ///       src[idx++] = 0;
  ///       src[idx++] = 0;
  ///       src[idx++] = 0;
  ///     } else if (dir[0] > 0 && dir[2] < 0) {
  ///       src[idx++] = 0.5;
  ///       src[idx++] = 0.5;
  ///       src[idx++] = 0.5;
  ///     } else {
  ///       src[idx++] = 0;
  ///       src[idx++] = 0;
  ///       src[idx++] = 0;
  ///     }
  ///   }
  /// }

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

  console.log(`sh = [${sh.join(', ')}]`);

  // Expand out of SH.
  let shIrradiance = new Float32Array(size * size * 3);
  for (let j = 0; j < size; ++j) {
    let v = 2 * (j + 0.5) / size - 1;
    for (let i=0; i<size; ++i) {
      let u = 2 * (i + 0.5) / size - 1;
      if (u*u + v*v > 1) { continue; }

      unmap(dir, u, v);
      sh3.reconstruct(col, sh, dir);

      let idx = 3 * (j * size + i);
      shIrradiance[idx + 0] = col[0];
      shIrradiance[idx + 1] = col[1];
      shIrradiance[idx + 2] = col[2];
    }
  }

  // Diffuse convolution via Monte Carlo sampling
  let mcIrradiance = new Float32Array(size * size * 3);
  let sqrtSampleCount = 32;
  let sampleCount = sqrtSampleCount * sqrtSampleCount;
  let samples: vec3.Type[] = [];
  for (let i = 0; i < sampleCount; ++i) {
    samples[i] = vec3.newZero();
  }

  let N = vec3.newZero();
  let C = vec3.newZero();
  for (let j=0; j<size; ++j) {
    console.log(`${j+1} / ${size}`);
    let v = 2 * (j + 0.5) / size - 1;
    for (let i=0; i<size; ++i) {
      let u = 2 * (i + 0.5) / size - 1;
      if (u*u + v*v > 1) { continue; }

      unmap(N, u, v);

      generateSamples(samples, sqrtSampleCount);

      vec3.setZero(C);
      for (let sampleIdx = 0; sampleIdx < sampleCount; ++sampleIdx) {
        let D = samples[sampleIdx];
        let dot = vec3.dot(D, N);
        if (dot <= 0) {
          dot = -dot;
        } else {
          vec3.neg(D, D);
        }

        let r = (1/Math.PI) * Math.acos(D[2]) / Math.sqrt(D[0]*D[0] + D[1]*D[1]);
        let UU = 0.5 + 0.5 * D[0] * r;
        let VV = 0.5 + 0.5 * D[1] * r;
        let srcu = (size * UU)|0;
        let srcv = (size * VV)|0;
        if (srcu < 0) srcu = 0;
        if (srcv < 0) srcv = 0;
        if (srcu >= size) srcu = size-1;
        if (srcv >= size) srcv = size-1;

        let srcIdx = 3*(srcu + srcv*size);
        C[0] += dot * src[srcIdx+0];
        C[1] += dot * src[srcIdx+1];
        C[2] += dot * src[srcIdx+2];
      }

      vec3.scale(C, 2 * Math.PI / sampleCount, C);
      mcIrradiance[(i+j*size)*3 + 0] = C[0];
      mcIrradiance[(i+j*size)*3 + 1] = C[1];
      mcIrradiance[(i+j*size)*3 + 2] = C[2];
    }
  }

  let append = (img: Float32Array) => {
    document.body.appendChild(createCanvas(linearFloatToSrgbByteAccurate(img, 0), size, size));
  };
  append(src);
  append(shIrradiance);
  append(mcIrradiance);

  console.log(`took ${((Date.now() - start) / 1000).toFixed(2)}s`);
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
