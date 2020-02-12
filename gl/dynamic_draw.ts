import * as mat4 from 'toybox/math/mat4'
import * as vec3 from 'toybox/math/vec3'
import * as vec4 from 'toybox/math/vec4'
import {Context} from 'toybox/gl/context'
import {GL} from 'toybox/gl/constants'
import {ShaderProgram} from 'toybox/gl/shader'
import {Texture2D} from 'toybox/gl/texture'
import {TypedArrayList} from 'toybox/util/array'
import {VertexArray} from 'toybox/gl/vertex_array'


const _tmp0 = vec3.newZero();
const _tmp1 = vec3.newZero();
const _tmp2 = vec3.newZero();
const _tmp3 = vec3.newZero();
const _tmp4 = vec3.newZero();
const _tmp5 = vec3.newZero();
const _tmp6 = vec3.newZero();
const _tmp7 = vec3.newZero();
const _col = vec4.newZero();
const BLACK = vec4.newFromValues(0, 0, 0, 1);

enum BlitMode {
  RGB = 0,
  RGBA = 1,
  RED = 2,
  GREEN = 3,
  BLUE = 4,
  ALPHA = 5,
  DEPTH = 6,
};

// Flat shaded vertex shader.
const flatVsSrc = ` 
uniform Camera {
  mat4 viewProj;
} camera;

uniform float offset;

in vec3 position;
in vec4 color;

out vec4 v_color;

void main() {
  gl_Position = camera.viewProj * vec4(position, 1);
  gl_Position.w += offset;

  v_color = color;
}
`;

// Flat shaded fragment shader.
const flatFsSrc = `
in vec4 v_color;

out vec4 o_color;

void main() {
  o_color = v_color;
  o_color.xyz *= o_color.w;
}
`;

// Blit vertex shader.
const blitVsSrc = `
uniform vec4 scaleOffset;

in vec2 uv;

out vec2 v_uv;

void main() {
  gl_Position = vec4(uv * scaleOffset.xy + scaleOffset.zw, -1, 1);
  v_uv = uv;
}
`;

// Blit fragment shader.
const blitFsSrc = `
uniform sampler2D tex;

in vec2 v_uv;

out vec4 o_color;

void main() {
#if MODE == 0
  o_color = vec4(texture(tex, v_uv).xyz, 1);
#elif MODE == 1
  o_color = texture(tex, v_uv);
#elif MODE == 2
  o_color = vec4(texture(tex, v_uv).xxx, 1);
#elif MODE == 3
  o_color = vec4(texture(tex, v_uv).yyy, 1);
#elif MODE == 4
  o_color = vec4(texture(tex, v_uv).zzz, 1);
#elif MODE == 5
  o_color = vec4(texture(tex, v_uv).www, 1);
#elif MODE == 6
  o_color = vec4(texture(tex, v_uv).xxx, 1);
#else
  #error unrecognized mode
#endif
}
`;

// TODO(tom): convert DynamicDraw to use the new DynamicVertexBuffer class.
export class DynamicDraw {
  private lines = new TypedArrayList(Float32Array);
  private triangles = new TypedArrayList(Float32Array);
  private depthSampler: WebGLSampler;
  private shaders: {[index: string]: ShaderProgram};
  private flatVa: VertexArray;
  private blitVa: VertexArray;

  constructor(public ctx: Context) {
    const gl = ctx.gl;

    this.ctx.shaderRegistry.register('draw.flat.vs', flatVsSrc);
    this.ctx.shaderRegistry.register('draw.flat.fs', flatFsSrc);
    this.ctx.shaderRegistry.register('draw.blit.vs', blitVsSrc);
    this.ctx.shaderRegistry.register('draw.blit.fs', blitFsSrc);

    // Create a sampler object that disables texture compare and filtering for use
    // when blitting a depth texture.
    this.depthSampler = gl.createSampler();
    gl.samplerParameteri(this.depthSampler, GL.TEXTURE_COMPARE_MODE, GL.NONE);
    gl.samplerParameteri(this.depthSampler, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    gl.samplerParameteri(this.depthSampler, GL.TEXTURE_MAG_FILTER, GL.NEAREST);

    this.shaders = {
      flat: ctx.newShaderProgram('draw.flat.vs', 'draw.flat.fs')
    };

    for (let mode in BlitMode) {
      if (typeof BlitMode[mode] === 'number') {
        this.shaders[mode] = ctx.newShaderProgram(
            'draw.blit.vs', 'draw.blit.fs', {MODE: BlitMode[mode]});
      }
    }

    this.flatVa = ctx.newVertexArray({
      vb: {
        streams: [
          { attrib: 'position', size: 3 },
          { attrib: 'color', size: 4 }
        ],
        dynamic: true,
        type: GL.FLOAT,
        data: null,
      }
    });

    this.blitVa = ctx.newVertexArray({
      uv: { size: 2, data: [0, 0,  1, 1,  0, 1,  0, 0,  1, 0,  1, 1] },
    });
  }

  line(a: vec3.ArgType, b: vec3.ArgType, color: vec3.ArgType | vec4.ArgType) {
    const alpha = color.length == 4 ? color[3] : 1;
    this.lines.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    this.lines.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
  };

  lineLoop(positions: vec3.ArgType[], color: vec3.ArgType | vec4.ArgType) {
    const alpha = color.length == 4 ? color[3] : 1;
    let n = positions.length;
    let prev = positions[n - 1];
    for (let i = 0; i < n; ++i) {
      const curr = positions[i];
      this.lines.push(prev[0], prev[1], prev[2], color[0], color[1], color[2], alpha);
      this.lines.push(curr[0], curr[1], curr[2], color[0], color[1], color[2], alpha);
      prev = curr;
    }
  }

  lineStrip(positions: vec3.ArgType[], color: vec3.ArgType | vec4.ArgType) {
    const alpha = color.length == 4 ? color[3] : 1;
    let n = positions.length;
    let prev = positions[0];
    for (let i = 1; i < n; ++i) {
      const curr = positions[i];
      this.lines.push(prev[0], prev[1], prev[2], color[0], color[1], color[2], alpha);
      this.lines.push(curr[0], curr[1], curr[2], color[0], color[1], color[2], alpha);
      prev = curr;
    }
  }

  aabb(min: vec3.ArgType, max: vec3.ArgType, color: vec3.ArgType | vec4.ArgType) {
    const a = vec3.setFromValues(_tmp0, min[0], min[1], min[2]);
    const b = vec3.setFromValues(_tmp1, max[0], min[1], min[2]);
    const c = vec3.setFromValues(_tmp2, min[0], min[1], max[2]);
    const d = vec3.setFromValues(_tmp3, max[0], min[1], max[2]);
    const e = vec3.setFromValues(_tmp4, min[0], max[1], min[2]);
    const f = vec3.setFromValues(_tmp5, max[0], max[1], min[2]);
    const g = vec3.setFromValues(_tmp6, min[0], max[1], max[2]);
    const h = vec3.setFromValues(_tmp7, max[0], max[1], max[2]);

    const v = this.lines;
    const alpha = color.length == 4 ? color[3] : 1;
    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);
    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);

    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);
    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);

    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);
  }

  obb(transform: mat4.ArgType, min: vec3.ArgType, max: vec3.ArgType, color: vec3.ArgType | vec4.ArgType) {
    // TODO(tom): transform box to (center, extents) representation, then just
    // need to transform center & extents in order to calculate the vertices.
    const a = vec3.setFromValues(_tmp0, min[0], min[1], min[2]);
    const b = vec3.setFromValues(_tmp1, max[0], min[1], min[2]);
    const c = vec3.setFromValues(_tmp2, min[0], min[1], max[2]);
    const d = vec3.setFromValues(_tmp3, max[0], min[1], max[2]);
    const e = vec3.setFromValues(_tmp4, min[0], max[1], min[2]);
    const f = vec3.setFromValues(_tmp5, max[0], max[1], min[2]);
    const g = vec3.setFromValues(_tmp6, min[0], max[1], max[2]);
    const h = vec3.setFromValues(_tmp7, max[0], max[1], max[2]);
    mat4.mulPos(a, transform, a);
    mat4.mulPos(b, transform, b);
    mat4.mulPos(c, transform, c);
    mat4.mulPos(d, transform, d);
    mat4.mulPos(e, transform, e);
    mat4.mulPos(f, transform, f);
    mat4.mulPos(g, transform, g);
    mat4.mulPos(h, transform, h);

    const v = this.lines;
    const alpha = color.length == 4 ? color[3] : 1;
    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);
    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);

    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);
    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);

    v.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    v.push(e[0], e[1], e[2], color[0], color[1], color[2], alpha);
    v.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    v.push(f[0], f[1], f[2], color[0], color[1], color[2], alpha);
    v.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
    v.push(g[0], g[1], g[2], color[0], color[1], color[2], alpha);
    v.push(d[0], d[1], d[2], color[0], color[1], color[2], alpha);
    v.push(h[0], h[1], h[2], color[0], color[1], color[2], alpha);
  }

  axis(transform: mat4.ArgType, size: number, color?: vec3.ArgType | vec4.ArgType) {
    const o = vec3.setFromValues(
        _tmp0, transform[12], transform[13], transform[14]);

    const x = vec3.setFromValues(
        _tmp1,
        o[0] + size * transform[0],
        o[1] + size * transform[1],
        o[2] + size * transform[2]);
    let col = color || vec4.setFromValues(_col, 1, 0, 0, 1);
    this.line(o, x, col);

    const y = vec3.setFromValues(
        _tmp1,
        o[0] + size * transform[4],
        o[1] + size * transform[5],
        o[2] + size * transform[6]);
    col = color || vec4.setFromValues(_col, 0, 1, 0, 1);
    this.line(o, y, col);

    const z = vec3.setFromValues(
        _tmp1,
        o[0] + size * transform[8],
        o[1] + size * transform[9],
        o[2] + size * transform[10]);
    col = color || vec4.setFromValues(_col, 0, 0, 1, 1);
    this.line(o, z, col);
  }

  wireSphere(o: vec3.ArgType, r: number, color: vec3.ArgType | vec4.ArgType, numSegments = 24) {
    const rings = numSegments < 16 ? 0 : 1;
    const ox = o[0];
    const oy = o[1];
    const oz = o[2];
    const alpha = color.length == 4 ? color[3] : 1;
    for (let ring = -rings; ring <= rings; ++ring) {
      const oo = Math.sin(ring * 0.45) * r;
      const rr = Math.cos(ring * 0.45) * r;
      const aa = alpha * (ring == 0 ? 1 : 0.5);
      for (let i = 0; i < numSegments; ++i) {
        const a = i * 2 * Math.PI / numSegments;
        const b = (i + 1) * 2 * Math.PI / numSegments;
        const sa = rr * Math.sin(a);
        const ca = rr * Math.cos(a);
        const sb = rr * Math.sin(b);
        const cb = rr * Math.cos(b);
        this.lines.push(ox + sa, oo + oy, oz + ca, color[0], color[1], color[2], aa);
        this.lines.push(ox + sb, oo + oy, oz + cb, color[0], color[1], color[2], aa);
        this.lines.push(oo + ox, oy + sa, oz + ca, color[0], color[1], color[2], aa);
        this.lines.push(oo + ox, oy + sb, oz + cb, color[0], color[1], color[2], aa);
        this.lines.push(ox + sa, oy + ca, oo + oz, color[0], color[1], color[2], aa);
        this.lines.push(ox + sb, oy + cb, oo + oz, color[0], color[1], color[2], aa);
      }
    }

    this.lines.push(ox - r, oy, oz, color[0], color[1], color[2], alpha);
    this.lines.push(ox + r, oy, oz, color[0], color[1], color[2], alpha);
    this.lines.push(ox, oy - r, oz, color[0], color[1], color[2], alpha);
    this.lines.push(ox, oy + r, oz, color[0], color[1], color[2], alpha);
    this.lines.push(ox, oy, oz - r, color[0], color[1], color[2], alpha);
    this.lines.push(ox, oy, oz + r, color[0], color[1], color[2], alpha);
  }

  polygon(verts: vec3.ArgType[], color: vec3.ArgType | vec4.ArgType) {
    if (verts.length < 3) {
      return;
    }
    const alpha = color.length == 4 ? color[3] : 1;
    const o = verts[0];
    const n = verts.length - 1;
    for (let i = 1; i < n; ++i) {
      const a = verts[i];
      const b = verts[i+1];
      this.triangles.push(o[0], o[1], o[2], color[0], color[1], color[2], alpha);
      this.triangles.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
      this.triangles.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    }
  }

  outlinePolygon(verts: vec3.Type[], col: vec3.ArgType | vec4.ArgType) {
    this.polygon(verts, col);
    let j = verts.length - 1;
    for (let i = 0; i < verts.length; ++i) {
      this.line(verts[j], verts[i], BLACK);
      j = i;
    }
  }

  triangle(a: vec3.ArgType, b: vec3.ArgType, c: vec3.ArgType, color: vec3.ArgType | vec4.ArgType) {
    const alpha = color.length == 4 ? color[3] : 1;
    this.triangles.push(a[0], a[1], a[2], color[0], color[1], color[2], alpha);
    this.triangles.push(b[0], b[1], b[2], color[0], color[1], color[2], alpha);
    this.triangles.push(c[0], c[1], c[2], color[0], color[1], color[2], alpha);
  }

  flush(viewProj: mat4.ArgType, offset=0) {
    if (this.triangles.length == 0 && this.lines.length == 0) {
      return;
    }

    const gl = this.ctx.gl;
    this.ctx.useProgram(this.shaders.flat);
    this.shaders.flat.setUniformBlock('Camera', {viewProj: viewProj});
    this.shaders.flat.setUniform('offset', offset);
    if (this.triangles.length > 0) {
      this.flatVa.setVertexData('vb', this.triangles.data, this.triangles.length / 7);
      this.ctx.draw(this.flatVa, GL.TRIANGLES);
      this.triangles.clear();
    }
    if (this.lines.length > 0) {
      this.flatVa.setVertexData('vb', this.lines.data, this.lines.length / 7);
      this.ctx.draw(this.flatVa, GL.LINES);
      this.lines.clear();
    }
  }

  private blitImpl(shader: ShaderProgram, tex: Texture2D,
                   x: number, y: number, w: number, h: number) {
    const gl = this.ctx.gl;

    let bw, bh;
    if (this.ctx.boundFramebuffer) {
      bw = this.ctx.boundFramebuffer.width;
      bh = this.ctx.boundFramebuffer.height;
    } else {
      bw = gl.drawingBufferWidth;
      bh = gl.drawingBufferHeight;
    }

    const sx = 2 * w / bw;
    const sy = 2 * h / bh;
    const ox = 2 * x / bw - 1;
    const oy = 1 - 2 * y / bh - sy;

    this.ctx.useProgram(shader);
    shader.setUniform('scaleOffset', sx, sy, ox, oy);

    shader.bindTexture('tex', tex);
    if (tex.compareMode == GL.COMPARE_REF_TO_TEXTURE) {
      gl.bindSampler(0, this.depthSampler);
    }
    this.ctx.draw(this.blitVa);
    gl.bindSampler(0, null);
  }

  blitR(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['RED'], tex, x, y, w, h); }
  blitG(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['GREEN'], tex, x, y, w, h); }
  blitB(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['BLUE'], tex, x, y, w, h); }
  blitA(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['ALPHA'], tex, x, y, w, h); }
  blitRgb(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['RGB'], tex, x, y, w, h); }
  blitRgba(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['RGBA'], tex, x, y, w, h); }
  blitDepth(tex: Texture2D, x: number, y: number, w: number, h: number) { this.blitImpl(this.shaders['DEPTH'], tex, x, y, w, h); }
}

