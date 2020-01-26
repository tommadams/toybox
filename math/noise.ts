import {shuffle} from 'toybox/util/array'

function lerp(t: number, a: number, b: number) { return a + t * (b - a); }

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }

function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h<8 ? x : y,
        v = h<4 ? y : h==12||h==14 ? x : z;
  return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
}

export class Perlin3d {
  private perm = new Int32Array(512);

  constructor(rnd: () => number) {
    for (let i = 0; i < 256; ++i) {
      this.perm[i] = i;
    }
    shuffle(this.perm, rnd, 256);
    for (let i = 0; i < 256 ; ++i) {
      this.perm[i + 256] = this.perm[i];
    }
  }
  
  sample(x: number, y: number, z: number) {
    x = ((x % 256) + 256) % 256;
    y = ((y % 256) + 256) % 256;
    z = ((z % 256) + 256) % 256;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const k = Math.floor(z);
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const p = this.perm;
    const A = p[i  ]+j, AA = p[A]+k, AB = p[A+1]+k,
          B = p[i+1]+j, BA = p[B]+k, BB = p[B+1]+k;

    return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),
                                   grad(p[BA  ], x-1, y  , z   )),
                           lerp(u, grad(p[AB  ], x  , y-1, z   ),
                                   grad(p[BB  ], x-1, y-1, z   ))),
                   lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),
                                   grad(p[BA+1], x-1, y  , z-1 )),
                           lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                   grad(p[BB+1], x-1, y-1, z-1 ))));
  }
}
