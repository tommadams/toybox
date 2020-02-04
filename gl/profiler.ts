import {GL} from 'toybox/gl/constants';
import {Context} from 'toybox/gl/context';

const EXT_NAME = 'EXT_disjoint_timer_query_webgl2';
const FILTER_SIZE = 3;

class CircularBuffer<T> {
  private idx = -1;
  private buffer: T[];
  private len = 0;

  constructor(length: number) {
    this.buffer = new Array<T>(length);
  }

  get length() { return this.len; }
  get capacity() { return this.buffer.length; }

  push(x: T) {
    this.idx = (this.idx + 1) % this.buffer.length;
    this.len = Math.min(this.len + 1, this.buffer.length);
    this.buffer[this.idx] = x;
  }

  // If i >= 0, returns the i'th most recent element pushed into the buffer.
  // If i < 0, returns element (length + i) from the buffer.
  // For example:
  //   buffer = new CircularBuffer<string>(10);
  //   buffer.push('a');
  //   buffer.push('b');
  //   buffer.push('c');
  //   buffer.at(0);  // returns 'c'
  //   buffer.at(1);  // returns 'b'
  //   buffer.at(2);  // returns 'a'
  //   buffer.at(-1);  // returns 'a'
  //   buffer.at(-2);  // returns 'b'
  //   buffer.at(-3);  // returns 'c'
  at(i: number) {
    if (i < 0) { i += this.len; }
    return this.buffer[(this.idx + this.len - i) % this.len];
  }
}

class Hud {
  private table: HTMLElement;
  private canvas: HTMLCanvasElement;
  private pixelRatio = Math.floor(window.devicePixelRatio) || 1;

  // Circular buffer of frame times.
  private frameTime: CircularBuffer<number>;

  // WebGL timing events are noisy, containing inaccurate spikes. To smooth
  // these out the HUD keeps short circular buffers of the scopes and reports
  // their median.
  private scopes = new Map<string, number[]>();

  constructor(parentElem: HTMLElement) {
    this.canvas = document.createElement('canvas');
    parentElem.appendChild(this.canvas);

    let width = parentElem.offsetWidth;
    let height = 24;
    this.canvas.width = this.pixelRatio * width;
    this.canvas.height = this.pixelRatio * height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.table = document.createElement('table');
    parentElem.appendChild(this.table);

    this.frameTime = new CircularBuffer<number>(width);
  }

  update(profile: Profile) {
    this.frameTime.push(profile.frameTime);

    let ctx = this.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, -1, 0, this.canvas.height);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let scale = this.canvas.height / 48;
    for (let i = 0; i < this.frameTime.length; ++i) {
      let ms = this.frameTime.at(i);
      if (ms <= 19) {
        ctx.fillStyle = '#0f0';
      } else if (ms <= 36) {
        ctx.fillStyle = '#ff0';
      } else {
        ctx.fillStyle = '#f00';
      }
      ctx.beginPath();
      ctx.rect(this.pixelRatio * i, 0, this.pixelRatio, ms * scale);
      ctx.fill();
    }

    let rows: [string, number][] = [
      ['frame', this.frameTime.at(0)],
      ['js', profile.jsTime],
    ];
    for (let scope of profile.scopes) {
      let buf = this.scopes.get(scope.tag);
      if (buf == null) {
        buf = [];
        this.scopes.set(scope.tag, buf);
      }
      buf.push(scope.elapsedNanos);
      if (buf.length > FILTER_SIZE) {
        buf.shift();
      }
      if (scope.elapsedNanos > 0) {
        rows.push([scope.tag, Math.min.apply(null, buf) / 1000000]);
      }
    }

    let html: string[] = [];
    for (let row of rows) {
      let tag = row[0];
      let time: string;
      if (row[1] < 10) {
        time = ` ${row[1].toFixed(3)}ms`;
      } else {
        time = `${row[1].toFixed(3)}ms`;
      }
      html.push(`<tr><td>${tag}:</td><td>${time}</td></tr>`);
    }
    this.table.innerHTML = html.join('');
  }
}

export class Scope {
  elapsedNanos = 0;
  settled = false;
  constructor(public tag: string, public handle: WebGLQuery) {}
}

export class Profile {
  jsTime = 0;
  scopes: Scope[] = [];
  constructor(public frameTime: number) {}
}

export class Profiler {
  private activeScope: Scope = null;
  private handleCache: WebGLQuery[] = [];
  private beginFrameTime = 0;
  private pendingProfiles: Profile[] = [];
  private activeProfile: Profile = null;
  private hud: Hud = null;

  profile: Profile = new Profile(0);

  constructor(private ctx: Context, parentElem: string | HTMLElement = null) {
    if (!this.ctx.gl.getExtension(EXT_NAME)) {
      throw new Error(`${EXT_NAME} not supported`);
    }
    if (parentElem != null) {
      if (typeof parentElem == 'string') {
        parentElem = document.getElementById(parentElem);
      }
      this.hud = new Hud(parentElem);
    }
  }

  beginFrame() {
    let now = performance.now();
    if (this.beginFrameTime == 0) {
      this.beginFrameTime = now;
    }
    this.activeProfile = new Profile(now - this.beginFrameTime);
    this.beginFrameTime = now;
  }

  endFrame() {
    if (this.activeProfile == null) { return; }
    let gl = this.ctx.gl;
    if (gl.getParameter(GL.GPU_DISJOINT_EXT)) {
      this.pendingProfiles = [];
    }

    for (let i = this.pendingProfiles.length - 1; i >= 0; --i) {
      let profile = this.pendingProfiles[i];
      let allSettled = true;
      for (let scope of profile.scopes) {
        if (!scope.settled) {
          if (gl.getQueryParameter(scope.handle, gl.QUERY_RESULT_AVAILABLE)) {
            scope.settled = true;
            scope.elapsedNanos = gl.getQueryParameter(scope.handle, gl.QUERY_RESULT)
            this.handleCache.push(scope.handle);
            scope.handle = null;
          } else {
            allSettled = false;
          }
        }
      }

      if (allSettled) {
        this.profile = profile;
        this.pendingProfiles.splice(i, 1);
      }
    }

    this.activeProfile.jsTime = performance.now() - this.beginFrameTime;
    this.pendingProfiles.push(this.activeProfile);
    this.activeProfile = null;

    if (this.hud != null && this.profile != null) {
      this.hud.update(this.profile);
    }
  }

  beginScope(tag: string) {
    if (this.activeProfile == null) { return; }
    if (this.activeScope != null) {
      throw new Error(`scope ${this.activeScope.tag} alreay active`);
    }

    let gl = this.ctx.gl;
    let scope = new Scope(tag, this.newHandle());
    this.activeProfile.scopes.push(scope);
    this.activeScope = scope;
    gl.beginQuery(GL.TIME_ELAPSED_EXT, this.activeScope.handle);
  }

  endScope() {
    if (this.activeProfile == null) { return; }
    if (this.activeScope == null) {
      throw new Error(`no scope currently active`);
    }
    this.ctx.gl.endQuery(GL.TIME_ELAPSED_EXT);
    this.activeScope = null;
  }

  scope(tag: string, fn: Function) {
    this.beginScope(tag);
    fn();
    this.endScope();
  }

  private newHandle() {
    if (this.handleCache.length > 0) {
      return this.handleCache.pop();
    } else {
      return this.ctx.gl.createQuery();
    }
  }
}

/*
 * This Profiler implementation supports nested scopes but relies on
 * TIMESTAMP_EXT from the EXT_disjoint_timer_query_webgl2 extension:
 *   https://www.khronos.org/registry/webgl/extensions/EXT_disjoint_timer_query_webgl2/
 * 
 * TIMESTAMP_EXT doesn't appear to work on Chrome:
 *   https://bugs.chromium.org/p/chromium/issues/detail?id=1045635
class Scope {
  beginNanos = 0;
  endNanos = 0;
  children: Scope[] = [];
  settled = false;
  valid = false;
  allSettled = false;
  constructor(public parent: Scope, public tag: string,
              public beginHandle: WebGLQuery, public endHandle: WebGLQuery) {}
}

export class Profiler {
  private rootScope: Scope = null;
  private activeScope: Scope = null;
  private handleCache: WebGLQuery[] = [];
  private beginFrameTime = 0;
  private pendingProfiles: Scope[] = [];
  private ext: any;  // EXTDisjointTimerQueryWebGL2

  public profile: Scope;

  constructor(private ctx: Context) {
    this.ext = this.ctx.gl.getExtension(extName);
    if (!this.ext) {
      throw new Error(`${extName} not supported`);
    }
    this.profile = new Scope(null, 'none', null, null);
    this.profile.settled = true;
    this.profile.allSettled = true;

  }

  beginFrame() {
    this.beginFrameTime = performance.now();
    if (this.rootScope != null) {
      throw new Error(`root scope ${this.rootScope.tag} is not null`);
    }
    this.beginScope('frame');
  }

  endFrame() {
    let time = performance.now();

    if (this.activeScope != this.rootScope) {
      throw new Error(`expected active scope to be ${this.rootScope.tag}, got ${this.activeScope.tag}`);
    }
    this.endScope();

    let gl = this.ctx.gl;
    for (let i = 0; i < this.pendingProfiles.length;) {
      let scope = this.pendingProfiles[i];
      if (this.trySettle(scope)) {
        this.profile = scope;
        this.pendingProfiles.splice(i, 1);
      } else {
        i += 1;
      }
    }

    this.pendingProfiles.push(this.rootScope);
    this.rootScope = null;

    let str = '';
    let stack: [string, Scope][] = [['', this.profile]];
    while (stack.length > 0) {
      let [path, scope] = stack.pop();
      if (path == '') {
        path = scope.tag;
      } else {
        path = `${path}.${scope.tag}`;
      }
      let ms = (scope.endNanos - scope.beginNanos) / 1000 / 1000;
      str += ` ${path}:${ms.toFixed(3)}ms`;
      for (let child of scope.children) {
        stack.push([path, child]);
      }
    }
    console.log(str);
  }

  beginScope(tag: string) {
    let scope = new Scope(this.activeScope, tag, this.newHandle(), this.newHandle());
    if (this.activeScope != null) {
      this.activeScope.children.push(scope);
    } else {
      if (this.rootScope != null) {
        throw new Error(`active scope is null but root scope isn't`);
      }
      this.rootScope = scope;
    }
    this.activeScope = scope;
    console.log(`begin(${this.activeScope.tag})`);
    this.ext.queryCounterEXT(this.activeScope.beginHandle, this.ext.TIMESTAMP_EXT);
  }

  endScope() {
    if (this.activeScope == null) {
      throw new Error(`no timer query currently active`);
    }
    console.log(`end(${this.activeScope.tag})`);
    this.ext.queryCounterEXT(this.activeScope.endHandle, this.ext.TIMESTAMP_EXT);
    this.activeScope = this.activeScope.parent;
  }

  scope(tag: string, fn: Function) {
    this.beginScope(tag);
    fn();
    this.endScope();
  }

  private trySettle(scope: Scope) {
    let gl = this.ctx.gl;
    let ext = this.ext;
    if (!scope.settled) {
      console.log(scope.tag, scope.beginHandle, scope.endHandle);
      if (gl.getQueryParameter(scope.endHandle, gl.QUERY_RESULT_AVAILABLE)) {
        scope.settled = true;
        scope.valid = !gl.getParameter(GL.GPU_DISJOINT_EXT);
        if (scope.valid) {
          scope.beginNanos = gl.getQueryParameter(scope.beginHandle, gl.QUERY_RESULT)
          scope.endNanos = gl.getQueryParameter(scope.endHandle, gl.QUERY_RESULT)
        }
        this.handleCache.push(scope.beginHandle);
        this.handleCache.push(scope.endHandle);
        scope.beginHandle = null;
        scope.endHandle = null;
      }
    }

    if (scope.settled && !scope.allSettled) {
      scope.allSettled = true;
      for (let child of scope.children) {
        if (!this.trySettle(child)) {
          scope.allSettled = false;
        }
      }
    }

    return scope.allSettled;
  }

  private newHandle() {
    if (this.handleCache.length > 0) {
      return this.handleCache.pop();
    } else {
      return this.ctx.gl.createQuery();
    }
  }
}
*/
