import {Context} from 'toybox/gl/context'
import {GL, TextureTarget} from 'toybox/gl/constants'
import {Texture, Texture2D, TextureCube} from 'toybox/gl/texture'

export class Framebuffer {
  handle: WebGLFramebuffer;
  width = 0;
  height = 0;
  color = new Array<Texture>();
  depth: Texture2D = null;

  constructor(ctx: Context, color: null | Texture | Texture[],
              depth: null | Texture2D, target: TextureTarget) {
    const gl = ctx.gl;
    this.handle = gl.createFramebuffer();

    if (Array.isArray(color)) {
      for (let tex of color) {
        if (tex.width == 0 || tex.height == 0) {
          throw new Error(`texture must have non-zero size, got ${tex.width}x${tex.height}`);
        }
        this.checkDimensions(tex);
        this.color.push(tex);
      };
    } else if (color != null) {
      this.checkDimensions(color);
      this.color.push(color);
    }

    if (depth) {
      this.checkDimensions(depth);
      this.depth = depth;
    }

    gl.bindFramebuffer(GL.FRAMEBUFFER, this.handle);
    for (let [i, tex] of this.color.entries()) {
      gl.bindTexture(tex.target, tex.handle);
      gl.framebufferTexture2D(
          GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0 + i, target, tex.handle, 0);
    }
    if (this.depth) {
      gl.framebufferTexture2D(
          GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.TEXTURE_2D, this.depth.handle, 0);
    }
  }

  private checkDimensions(tex: Texture) {
    if (this.width == 0) {
      this.width = tex.width;
      this.height = tex.height;
    } else if (this.width != tex.width || this.height != tex.height) {
      throw new Error(`texture dimensions don't match: expected ${this.width}x${this.height}, got ${tex.width}x${tex.height}`);
    }
  }
}
