const keysDown = new Array<boolean>(256);
const prevKeysDown = new Array<boolean>(256);
const events: [string, EventListener][] = [
  ['keydown', onKeyDown],
  ['keyup', onKeyUp],
  ['mousemove', onMouseMove],
  ['mousedown', onMouseDown],
  ['mouseup', onMouseUp],
];

export let mouseDx = 0;
export let mouseDy = 0;
export let mouseDown = false;

export const enum KeyCodes {
  BACKSPACE = 8,
  TAB = 9,
  ENTER = 13,
  SHIFT = 16,
  CTRL = 17,
  ALT = 18,
  ESC = 27,
  SPACE = 32,
  LEFT = 37,
  UP = 38,
  RIGHT = 39,
  DOWN = 40,
  PLUS = 43,
  PRINT_SCREEN = 44,
  ZERO = 48,
  ONE = 49,
  TWO = 50,
  THREE = 51,
  FOUR = 52,
  FIVE = 53,
  SIX = 54,
  SEVEN = 55,
  EIGHT = 56,
  NINE = 57,
  AT = 64,
  A = 65,
  B = 66,
  C = 67,
  D = 68,
  E = 69,
  F = 70,
  G = 71,
  H = 72,
  I = 73,
  J = 74,
  K = 75,
  L = 76,
  M = 77,
  N = 78,
  O = 79,
  P = 80,
  Q = 81,
  R = 82,
  S = 83,
  T = 84,
  U = 85,
  V = 86,
  W = 87,
  X = 88,
  Y = 89,
  Z = 90
}

export function keyDown(keyCode: number) {
  return keysDown[keyCode];
}

export function keyPressed(keyCode: number) {
  return keysDown[keyCode] && !prevKeysDown[keyCode];
}

export function keyReleased(keyCode: number) {
  return !keysDown[keyCode] && prevKeysDown[keyCode];
}

export function reset() {
  mouseDx = 0;
  mouseDy = 0;
  for (let i = 0; i < keysDown.length; ++i) {
    prevKeysDown[i] = false;
    keysDown[i] = false;
  }
}

// Flushes the input state. Must be called at the end of each frame.
export function flush() {
  mouseDx = 0;
  mouseDy = 0;
  for (let i = 0; i < keysDown.length; ++i) {
    prevKeysDown[i] = keysDown[i];
  }
}

export function enable() {
  for (let [name, handler] of events) {
    document.addEventListener(name, handler);
  }
  reset();
}

export function disable() {
  for (let [name, handler] of events) {
    document.removeEventListener(name, handler);
  }
  reset();
}

function handleSpecialKeys(e: KeyboardEvent) {
  keysDown[KeyCodes.CTRL] = e.ctrlKey;
  keysDown[KeyCodes.SHIFT] = e.shiftKey;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.metaKey) {
    return undefined;
  }
  handleSpecialKeys(e);
  keysDown[e.keyCode] = true;
  return false;
}

function onKeyUp(e: KeyboardEvent) {
  handleSpecialKeys(e);
  keysDown[e.keyCode] = false;
  return false;
}

function onMouseMove(e: MouseEvent) {
  mouseDx = e.movementX;
  mouseDy = e.movementY;
}

function onMouseDown(e: MouseEvent) {
  mouseDown = true;
}

function onMouseUp(e: MouseEvent) {
  mouseDown = false;
}
