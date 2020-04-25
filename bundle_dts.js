'use strict';

const fs = require("fs");
const path = require("path");

const depRe = /^(export|import).*from\s*['"]([^'"]*)['"]\s*;/;
const dstDir = 'dist/types/toybox'
const dstPath = path.join(dstDir, 'index.d.ts');

let processedDeps = new Set();
let output = [];

function tryParseDep(line) {
  let m = line.match(depRe);
  return m != null ? m[2] : null;
}

function process(sourcePath) {
  let realPath = fs.realpathSync.native(sourcePath);
  let realDir = path.dirname(realPath);
  processedDeps.add(realPath);

  const contents = fs.readFileSync(realPath, 'utf8');
  const lines = contents.split(/[\r\n]+/);
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (line.length == 0) { continue; }

    let depPath = tryParseDep(line);
    if (depPath != null) {
      depPath = path.join(realDir, depPath) + '.d.ts';
      let realDepPath = fs.realpathSync.native(depPath);
      if (!processedDeps.has(realDepPath)) {
        process(realDepPath);
      }
    } else {
      output.push(rawLine.replace('export declare ', 'export '));
    }
  }
}

output.push(
    'export = toybox;',
    'export as namespace toybox;',
    'declare namespace toybox {');
process(path.join('built/toybox.d.ts'));
output.push('}');

fs.mkdirSync(dstDir, {recursive: true});
fs.writeFileSync(dstPath, output.join('\n'), {mode: 0o644});
console.log(`wrote ${dstPath}`);
