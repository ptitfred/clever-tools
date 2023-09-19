import rollupJson from '@rollup/plugin-json';
import rollupCommonjs from '@rollup/plugin-commonjs';
// import rollupNodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: 'bin/clever.js',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [
    rollupJson(),
    rollupCommonjs(),
    // rollupNodeResolve(),
  ],
};
