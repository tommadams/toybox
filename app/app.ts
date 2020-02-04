import * as input from 'toybox/app/input'
import {Context, ContextOptions} from 'toybox/gl/context'
import {ShaderEditor} from 'toybox/app/shader_editor'

export abstract class App {
  private updateRequested = false;
  updating: boolean;
  ctx: Context;

  // constructor(public parentElem: HTMLElement | string, public updating=true) {
  constructor(canvas: string | HTMLCanvasElement, contextOptions: ContextOptions) {
    // Create the context.
    let canvasElem: HTMLCanvasElement;
    if (typeof canvas == 'string') {
      canvasElem = document.getElementById(canvas) as HTMLCanvasElement;
    } else {
      canvasElem = canvas;
    }
    this.ctx = new Context(canvasElem, contextOptions);

    // Wrap the `updating` property so that when it's set to true, we start
    // requesting updates.
    let updating = false;
    Object.defineProperty(this, 'updating', {
      get: () => { return updating; },
      set: (x) => {
        if (x == updating) {
          return;
        }
        updating = x;
        if (updating) {
          this.requestUpdate();
        }
      },
      enumerable: true,
      configurable: true
    });

    this.ctx.onInit(() => {
      this.onInit();
    });

    // TODO(tom): add canvas toggle programmatically.
    document.getElementById('canvas-toggle').addEventListener('click', (e) => {
      let panel = document.getElementById('main-panel');
      let elem = e.target as HTMLElement;
      if (elem.innerHTML == '-') {
        panel.style.left = null;
        panel.style.width = null;
        panel.style.height = null;
        document.getElementById('left-panel').style.display = null;
        document.getElementById('bottom-panel').style.display = null;
        elem.innerText = '+'; 
      } else {
        panel.style.left = '0';
        panel.style.width = '100%';
        panel.style.height = '100%';
        document.getElementById('left-panel').style.display = 'none';
        document.getElementById('bottom-panel').style.display = 'none';
        elem.innerText = '-'; 
        if (!this.updating) {
          this.render();
        }
      }
    });

    const shaderEditor = new ShaderEditor(
        document.getElementById('left-panel'), this.ctx);

    // TODO(tom): move this into ShaderEditor
    shaderEditor.onCompile(() => {
      if (!this.updating) {
        this.render();
      }
    });

    window.addEventListener('resize', () => {
      if (!this.updating) {
        this.ctx.resizeCanvas();
        this.render();
      }
    });
  }

  // Called once all async requests have completed and resources are ready.
  protected abstract onInit(): void;

  protected abstract updateImpl(time: number): void;

  protected abstract renderImpl(): void;

  update(time: number) {
    this.ctx.beginFrame();
    this.updateImpl(time);
    if (this.updating) {
      this.requestUpdate();
    }
    input.flush();
    this.render();
  }

  render() {
    this.ctx.resizeCanvas();
    this.renderImpl();
    this.ctx.endFrame();
  }

  private requestUpdate() {
    if (!this.updateRequested) {
      window.requestAnimationFrame((time: number) => {
        this.updateRequested = false;
        this.update(time);
      });
    }
  }
}

