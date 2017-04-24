import typescriptRollup from 'rollup-plugin-typescript';

export default {
  entry: './src/css-blocks.ts',

  plugins: [
    typescriptRollup({typescript: require('typescript')})
  ]
}
