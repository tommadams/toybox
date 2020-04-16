import {Context} from '../gl/context';
import {ShaderErrorMsg} from '../gl/shader';

import * as input from './input';

declare let CodeMirror: any;

CodeMirror.defineSimpleMode('glsl', {
  // The start state contains the rules that are intially used
  start: [
    // You can match multiple tokens at once. Note that the captured
    // groups must span the whole string in this case
    {regex: /(?:varying|uniform|precision|attribute|mediump|highp)\b/, token: 'keyword'},
    {regex: /(?:in|out)\b/, token: 'keyword'},
    {regex: /(?:void|bool|int|uint|float)\b/, token: 'keyword'},
    {regex: /(?:[biuv]?vec[234]|mat[234]x[234]|mat[234])\b/, token: 'keyword'},
    {regex: /(?:sampler([123]D|Cube))\b/, token: 'keyword'},
    {regex: /(?:#(if|elif|else|endif|error|include)\b)/, token: 'keyword-2'},
    {regex: /(?:return|if|for|while|else|do)\b/, token: 'keyword'},
    {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: 'number'},
    {regex: /(?:true|false)/, token: 'number'},
    {regex: /(?:radians|degrees|a?(sin|cos|tan))\b/, token: 'builtin'},
    {regex: /(?:pow|exp2?|log2?|sqrt|inversesqrt)\b/, token: 'builtin'},
    {regex: /(?:abs|sign|floor|ceil|fract|mod)\b/, token: 'builtin'},
    {regex: /(?:min|max|clamp|mix|step|smoothstep)\b/, token: 'builtin'},
    {regex: /(?:length|distance|dot|cross|normalize)\b/, token: 'builtin'},
    {regex: /(?:faceforward|reflect|refract)\b/, token: 'builtin'},
    {regex: /(?:matrixCompMult|(e|notE)qual)\b/, token: 'builtin'},
    {regex: /(?:(less|greater)Than)\b/, token: 'builtin'},
    {regex: /(?:(less|greater)ThanEqual)\b/, token: 'builtin'},
    {regex: /(?:not|any|all)\b/, token: 'builtin'},
    {regex: /texture(Lod|Grad)?\b/, token: 'builtin'},
    {regex: /"(?:[^"\\]|\\.)*"/, token: 'string'},

    {regex: /\/\/.*/, token: 'comment'},
    // A next property will cause the mode to move to a different state
    {regex: /\/\*/, token: 'comment', next: 'comment'},
    {regex: /[-+\/*=<>!]+/, token: 'operator'},
    // indent and dedent properties guide autoindentation
    {regex: /[\{\[\(]/, indent: true},
    {regex: /[\}\]\)]/, dedent: true},
    {regex: /[A-Za-z_][\w]*/, token: 'variable'},
  ],
  // The multi-line comment state.
  comment: [
    {regex: /.*?\*\//, token: 'comment', next: 'start'},
    {regex: /.*/, token: 'comment'}
  ],
  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ['comment'],
    lineComment: '//'
  }
});

export class ShaderEditor {
  // URI of currently editing shader.
  private shaderUri = '';

  private onCompileFn: (uri: string, src: string) => void = null;

  private tooltipElem: HTMLElement;

  // CodeMirror editor instance.
  private editor: any;

  // Nested map from uri -> line number -> error message.
  private errors = new Map<string, Map<number, string>>();

  constructor(parentElem: HTMLElement, private ctx: Context) {
    let containerElem = document.createElement('div');
    containerElem.style.display = 'flex';
    containerElem.style.flexFlow = 'column';
    containerElem.style.height = '100%';

    let selectElem = document.createElement('select');
    selectElem.style.margin = '2px';

    let editorElem = document.createElement('div');
    editorElem.style.flex = 'auto';
    editorElem.style.height = '1px';

    this.tooltipElem = document.createElement('div');
    this.tooltipElem.style.fontFamily = 'monospace';
    this.tooltipElem.style.position = 'absolute';
    this.tooltipElem.style.display = 'none';
    this.tooltipElem.style.zIndex = '10';
    this.tooltipElem.style.maxWidth = '800px';
    this.tooltipElem.style.borderRadius = '2px';
    this.tooltipElem.style.backgroundColor = 'white';
    this.tooltipElem.style.fontSize = '10px';
    this.tooltipElem.style.padding = '1px 4px 1px 4px';
    document.body.appendChild(this.tooltipElem);

    editorElem.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.tooltipElem.addEventListener('mousemove', this.onMouseMove.bind(this));

    containerElem.appendChild(selectElem);
    containerElem.appendChild(editorElem);
    parentElem.appendChild(containerElem);

    ctx.onInit(() => {
      const uris = ctx.shaderRegistry.getUris();
      uris.sort();
      uris.forEach((uri) => {
        let elem = document.createElement('option');
        elem.value = uri;
        elem.innerText = uri;
        selectElem.appendChild(elem);
      });
      let uri = selectElem.value;
      if (uri != '') {
        this.edit(uri, ctx.shaderRegistry.getSrc(uri));
      }
    });

    selectElem.addEventListener('change', () => {
      let uri = selectElem.value;
      this.edit(uri, ctx.shaderRegistry.getSrc(uri));
    });

    const dispatch = (() => {
      this.clearErrors();
      try {
        this.ctx.shaderRegistry.updateSource(
            this.shaderUri, this.editor.getValue());
      } catch (e) {
        this.setErrors(e.errors);
      }
      if (this.onCompileFn) {
        this.onCompileFn(this.shaderUri, this.editor.getValue());
      }
    }).bind(this);
    this.editor = CodeMirror(editorElem, {
      lineNumbers: true,
      mode: 'glsl',
      keyMap: 'vim',
      undoDepth: 10000,
      showCursorWhenSelecting: true,
      extraKeys: {
        'Ctrl-Enter': dispatch,
        'Cmd-Enter': dispatch,
      },
    });
    this.editor.on('focus', input.disable);
    this.editor.on('blur', input.enable);
  }

  onCompile(fn: (uri: string, src: string) => void) {
    this.onCompileFn = fn;
  }

  private edit(uri: string, src: string) {
    this.shaderUri = uri;
    this.editor.clearGutter('error');
    // TODO(tom): support multiple documents properly
    this.editor.setValue(src);
    // TODO(tom): add error markers, if this.errors[uri] != undefined.
  }

  private setErrors(errors: ShaderErrorMsg[]) {
    this.clearErrors();
    errors.forEach((error) => {
      let fileErrors = this.errors.get(error.uri);
      if (!fileErrors) {
        fileErrors = new Map();
        this.errors.set(error.uri, fileErrors);
      }
      let msg = fileErrors.get(error.line);
      if (!msg) {
        msg = error.msg;
      } else {
        msg += '\n' + error.msg;
      }
      fileErrors.set(error.line, msg);
    });

    let fileErrors = this.errors.get(this.shaderUri);
    if (fileErrors) {
      for (let line of fileErrors.keys()) {
        this.editor.addLineClass(line - 1, 'background', 'error');
      }
    }
  }

  private onMouseMove(e: MouseEvent) {
    const fileErrors = this.errors.get(this.shaderUri);
    if (!fileErrors) {
      this.hideTooltip();
      return;
    }

    const line = this.editor.lineAtHeight(e.pageY) + 1;
    const msg = fileErrors.get(line);
    if (msg) {
      this.showTooltip(e.pageX + 2, e.pageY + 2, msg);
    } else {
      this.hideTooltip();
    }
  }

  private clearErrors() {
    this.hideTooltip();
    this.errors.clear();

    const numLines = this.editor.lineCount();
    for (let i = 0; i < numLines; ++i) {
      this.editor.removeLineClass(i, 'background', 'error');
    }
  }

  private hideTooltip() {
    this.tooltipElem.style.display = 'none';
  }

  private showTooltip(x: number, y: number, msg: string) {
    this.tooltipElem.style.display = null;
    this.tooltipElem.style.top = `${y}px`;
    this.tooltipElem.style.left = `${x}px`;
    this.tooltipElem.innerText = msg;
  }
}
