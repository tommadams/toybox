async function main() {
  let results = [
    {
      input: 'src/index.ts',
      output: {
        file: 'built/toybox.js',
        format: 'umd',
        freeze: true,
        sourcemap: true,
        name: 'toybox',
      },
      treeshake: false,
      plugins: [
        typescript(),
      ],
    }
  ];

  return results;
}

export default main();
