type ObjectListener = (field: string, newValue: any, oldValue: any) => void;
type Listener = (newValue: any, oldValue: any) => boolean | void;

interface BaseTweakDef {
  prop: string,
  onChange?: (oldVal: any, newVal: any) => boolean | void;
}

interface Obj { [index: string]: any }

abstract class Tweak {
  private onChange: Listener;
  protected content: HTMLElement;
  protected prop: string;

  constructor(private objectListeners: ObjectListener[],
              elem: HTMLElement,
              protected obj: Obj,
              tweakDef: BaseTweakDef) {
    this.prop = tweakDef.prop;
    this.onChange = tweakDef.onChange || null;

    let title = document.createElement('div');
    title.innerText = tweakDef.prop;

    this.content = document.createElement('div');
    this.content.style.flex = 'auto';

    elem.appendChild(title);
    elem.appendChild(this.content);

    this.tweakProp(obj);
  }

  protected invokeListeners(newVal: any, oldVal: any): void {
    if (!this.onChange || this.onChange(newVal, oldVal) !== false) {
      this.objectListeners.forEach((fn) => {
        fn(this.prop, newVal, oldVal);
      });
    }
  }

  protected abstract refresh(value: any): void;

  private tweakProp(obj: Obj) {
    let desc = Object.getOwnPropertyDescriptor(obj, this.prop);
    let self = this;

    if (desc && desc.get) {
      if (!desc.set) {
        throw new Error(`${this.prop} has a getter but not a setter`);
      }
      Object.defineProperty(obj, this.prop, {
          get: function () { return desc.get(); },
          set: function (x) {
            desc.set(x);
            self.refresh(x);
          },
          enumerable: true,
          configurable: true
      });
    } else {
      let value: any = obj[this.prop];
      Object.defineProperty(obj, this.prop, {
          get: function () { return value; },
          set: function (x) {
            value = x;
            self.refresh(x);
          },
          enumerable: true,
          configurable: true
      });
    }
  }
}

interface BooleanTweakDef extends BaseTweakDef {}

class BooleanTweak extends Tweak {
  private checkElem: HTMLInputElement;

  constructor(objectListeners: ObjectListener[],
              elem: HTMLElement, obj: Obj, tweakDef: BooleanTweakDef) {
    super(objectListeners, elem, obj, tweakDef);

    this.checkElem = document.createElement('input');
    this.checkElem.type = 'checkbox';
    this.checkElem.checked = !!obj[tweakDef.prop];
    this.checkElem.addEventListener('change', () => {
      let oldVal = this.obj[this.prop];
      this.obj[this.prop] = this.checkElem.checked;
      this.invokeListeners(this.obj[this.prop], oldVal);
    });

    this.content.appendChild(this.checkElem);
  }

  protected refresh(value: any) {
    this.checkElem.checked = !!value;
  }
}

interface SelectTweakDef extends BaseTweakDef {
  options: string[];
}

class SelectTweak extends Tweak {
  private options: string[];
  private selectElem: HTMLSelectElement;

  constructor(objectListeners: ObjectListener[],
              elem: HTMLElement, obj: Obj, tweakDef: SelectTweakDef) {
    super(objectListeners, elem, obj, tweakDef);

    this.selectElem = document.createElement('select');
    this.options = tweakDef.options;

    tweakDef.options.forEach((value) => {
      let optionElem = document.createElement('option');
      optionElem.value = value;
      optionElem.innerText = value;
      this.selectElem.appendChild(optionElem);
    });
    this.selectElem.addEventListener('change', () => {
      let oldVal = this.obj[this.prop];
      if (typeof this.obj[this.prop] == 'number') {
        this.obj[this.prop] = parseFloat(this.selectElem.value);
      } else {
        this.obj[this.prop] = this.selectElem.value;
      }
      this.invokeListeners(this.obj[this.prop], oldVal);
    });

    this.content.appendChild(this.selectElem);
  }

  protected refresh(value: any) {
    let idx = this.options.indexOf(value);
    if (idx == -1) {
      throw new Error(`${value} not in ${this.options}`);
    }
    this.selectElem.selectedIndex = idx;
  }
}

interface RangeTweakDef extends BaseTweakDef {
  min: number;
  max: number;
  squash?: number;
  integer: boolean;
}

class RangeTweak extends Tweak {
  private rangeElem: HTMLDivElement;
  private textElem: HTMLInputElement;
  private onMouseDown: (e: MouseEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseUp: (e: MouseEvent) => void;
  private min: number;
  private max: number;
  private squash: number;
  private integer: boolean;

  constructor(objectListeners: ObjectListener[],
              elem: HTMLElement, obj: Obj, tweakDef: RangeTweakDef) {
    super(objectListeners, elem, obj, tweakDef);

    this.min = tweakDef.min;
    this.max = tweakDef.max;
    this.squash = tweakDef.squash || 1;
    this.integer = tweakDef.integer || false;

    this.rangeElem = document.createElement('div');
    this.rangeElem.className = 'range-slider';

    this.textElem = document.createElement('input');
    this.textElem.type = 'text';
    this.textElem.className = 'range-text';
    this.textElem.addEventListener('change', () => {
      let value = parseFloat(this.textElem.value);
      if (isNaN(value)) {
        value = this.obj[this.prop];
      } else {
        value = Math.max(this.min, Math.min(value, this.max));
      }
      if (this.integer) {
        value = value | 0;
      }
      let oldVal = this.obj[this.prop];
      this.obj[this.prop] = value;
      this.invokeListeners(this.obj[this.prop], oldVal);
    });

    this.content.appendChild(this.rangeElem);
    this.content.appendChild(this.textElem);

    this.onMouseDown = (e) => {
      this.onMouseMove(e);
      this.rangeElem.removeEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
    };

    this.onMouseMove = (e) => {
      let x = e.clientX - this.rangeElem.getBoundingClientRect().left;
      let f = x / this.rangeElem.offsetWidth;
      f = Math.max(0, Math.min(f, 1));
      if (this.squash != 1) {
        f = Math.pow(f, this.squash);
      }
      let value = this.min + f * (this.max - this.min);
      if (this.integer) {
        value = value | 0;
      }
      value = Math.max(this.min, Math.min(value, this.max));
      let oldVal = this.obj[this.prop];
      this.obj[this.prop] = value;
      this.invokeListeners(this.obj[this.prop], oldVal);
    };

    this.onMouseUp = () => {
      this.rangeElem.addEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
    };

    this.rangeElem.addEventListener('mousedown', this.onMouseDown);
    this.refresh(this.obj[this.prop]);
  }

  protected refresh(value: any) {
    // Update the text input.
    let precision = 0;
    if (!this.integer) {
      precision = 3;
      let v = this.obj[this.prop];
      while (v >= 10 && precision > 0) {
        precision -= 1;
        v /= 10;
      }
    }
    this.textElem.value = value.toFixed(precision);

    // Update the slider.
    let f = (value - this.min) / (this.max - this.min);
    if (this.squash != 1) {
      f = Math.pow(f, 1 / this.squash);
    }
    let pct = 100 * f;
    pct = Math.max(0, Math.min(pct, 100));
    this.rangeElem.style.background =
        `linear-gradient(to right, #3298ed, #3298ed ${pct}%, #333 ${pct}%)`;
  }
}

interface StringTweakDef extends BaseTweakDef {}

class StringTweak extends Tweak {
  private textElem: HTMLInputElement;

  constructor(objectListeners: ObjectListener[],
              elem: HTMLElement, obj: Obj, tweakDef: StringTweakDef) {
    super(objectListeners, elem, obj, tweakDef);

    this.textElem = document.createElement('input');
    this.textElem.type = 'text';
    this.textElem.className = 'text';
    this.textElem.addEventListener('change', () => {
      let oldVal = this.obj[this.prop];
      this.obj[this.prop] = this.textElem.value;
      this.invokeListeners(this.obj[this.prop], oldVal);
    });
    this.textElem.value = this.obj[this.prop];

    this.content.appendChild(this.textElem);
  }

  protected refresh(value: any) {
    this.textElem.value = value;
  }
}

type TweakDef = BooleanTweakDef | SelectTweakDef | RangeTweakDef | StringTweakDef;

function isSelectTweakDef(tweakDef: TweakDef): tweakDef is SelectTweakDef {
  return (<SelectTweakDef>tweakDef).options !== undefined;
}

function isRangeTweakDef(tweakDef: TweakDef): tweakDef is RangeTweakDef {
  return ((<RangeTweakDef>tweakDef).min !== undefined &&
          (<RangeTweakDef>tweakDef).max !== undefined);
}

// TODO(tom): rename Tweak to something else & rename TweakObject to Tweak.
// TODO(tom): move object into the Tweak base class so that the same TweakObject
// can tweak multiple objects.
export class TweakObject {
  private objListeners: ObjectListener[] = [];

  constructor(private parentElem: HTMLElement, private obj: Obj, tweakDefs?: TweakDef[]) {
    for (let def of tweakDefs) {
      this.add(def);
    }
  }

  add(def: TweakDef) {
    let elem = document.createElement('div');
    if (isSelectTweakDef(def)) {
      new SelectTweak(this.objListeners, elem, this.obj, def);
    } else if (isRangeTweakDef(def)) {
      new RangeTweak(this.objListeners, elem, this.obj, def);
    } else if (typeof this.obj[def.prop] == 'boolean') {
      new BooleanTweak(this.objListeners, elem, this.obj, def);
    } else {
      new StringTweak(this.objListeners, elem, this.obj, def);
    }
    this.parentElem.appendChild(elem);
  }

  onChange(fn: ObjectListener) {
    this.objListeners.push(fn);
  }
}
