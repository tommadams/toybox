import sourcemaps from 'rollup-plugin-sourcemaps'

export default {
  input: 'built/toybox.js',
  output: {
    file: 'dist/toybox.js',
    format: 'umd',
    sourcemap: true,
    name: 'toybox',
  },
  plugins: [sourcemaps()],
  treeshake: false,
  context: 'this',
};
