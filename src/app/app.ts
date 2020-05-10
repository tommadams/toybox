import {input} from './input'
import {Context, ContextOptions} from '../gl/context'

export abstract class App {
  private updateRequested = false;
  updating = false;
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

    window.addEventListener('resize', () => {
      if (!this.updating) {
        this.ctx.resizeCanvas();
        this.render();
      }
    });
  }

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
      // TODO(tom): use requestPostAnimationFrame if it ever becomes standardised
      window.requestAnimationFrame((time: number) => {
        this.updateRequested = false;
        this.update(time);
      });
    }
  }
}

