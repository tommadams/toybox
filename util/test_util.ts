import {NumericArray} from '../types/array';

export function assertTrue(x: boolean) {
  if (x !== true) {
    throw new Error(`expected true, got ${x}`);
  }
}

export function assertFalse(x: boolean) {
  if (x !== false) {
    throw new Error(`expected false, got ${x}`);
  }
}

export function assertEqual(name: string,
                            expected: number|boolean,
                            actual: number|boolean) {
  if (expected != actual) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
}

export function assertNotNull(name: string, actual: any) {
  if (actual == null) {
    throw new Error(`${name}: expected not null, got ${actual}`);
  }
}

export function assertRoughlyEqual(name: string, expected: number,
                                   actual: number, epsilon: number) {
  if (Math.abs(expected - actual) > epsilon) {
    throw new Error(`${name}: expected ${expected} +/- ${epsilon}, got ${actual}`);
  }
}

export function assertElementsRoughlyEqual(name: string, expected: NumericArray,
                                           actual: NumericArray, epsilon: number) {
  assertEqual(name, expected.length, actual.length);
  for (let i = 0; i < expected.length; ++i) {
    assertRoughlyEqual(`${name}[${i}]`, expected[i], actual[i], epsilon);
  }
}

export function runTests(module: any) {
  for (let x in module) {
    if (module.hasOwnProperty(x) && module[x] instanceof Function) {
      module[x]();
    }
  }
}
