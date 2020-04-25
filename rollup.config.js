async function main() {
  let results = [
    {
      input: 'built/toybox.js',
      output: {
        file: 'dist/toybox.js',
        format: 'umd',
        freeze: true,
        sourcemap: true,
        name: 'toybox',
      },
      treeshake: false,
      context: 'this',
    }
  ];

  return results;
}

export default main();
