import {Context} from 'toybox/gl/context'
import {GL, TextureTarget} from 'toybox/gl/constants'
import {Texture2D} from 'toybox/gl/texture'

export class Framebuffer {
  handle: WebGLFramebuffer;
  width = 0;
  height = 0;
  color = new Array<Texture2D>();
  depth: Texture2D = null;

  constructor(ctx: Context, color: null | Texture2D | Texture2D[],
              depth: Texture2D = null, target: TextureTarget = GL.TEXTURE_2D) {
    const gl = ctx.gl;
    this.handle = gl.createFramebuffer();

    if (Array.isArray(color)) {
      for (let tex of color) {
        if (tex.width == 0 || tex.height == 0) {
          throw new Error(`texture must have non-zero side, got ${tex.width}x${tex.height}`);
        }
        this.checkDimensions(tex);
        this.color.push(tex);
      };
    } else if (color instanceof Texture2D) {
      this.checkDimensions(color);
      this.color.push(color);
    }

    if (depth) {
      this.checkDimensions(depth);
      this.depth = depth;
    }

    gl.bindFramebuffer(GL.FRAMEBUFFER, this.handle);
    this.color.forEach((tex, i) => {
      gl.framebufferTexture2D(
          GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0 + i, target, tex.handle, 0);
    });
    if (this.depth) {
      gl.framebufferTexture2D(
          GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, target, this.depth.handle, 0);
    }
  }

  private checkDimensions(tex: Texture2D) {
    if (this.width == 0) {
      this.width = tex.width;
      this.height = tex.height;
    } else if (this.width != tex.width || this.height != tex.height) {
      throw new Error(`texture dimensions don't match: expected ${this.width}x${this.height}, got ${tex.width}x${tex.height}`);
    }
  }
}
