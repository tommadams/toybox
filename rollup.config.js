import typescript from 'rollup-plugin-typescript2';

async function main() {
  let results = [
    {
      input: 'index.ts',
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
