import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// import nodePolyfills from 'rollup-plugin-polyfill-node';
// import babel from "@rollup/plugin-babel";

export default {
  input: 'dist/app/server.js',
  output: {
    file: 'dist/bin/server-bundle.js',
    format: 'cjs'
  },
  plugins: [
    // nodePolyfills(),
    nodeResolve({
      preferBuiltins: true
    }),
    commonjs({
      include: "node_modules/**",
    }),
    json(),
    // babel({
    //   exclude: "node_modules/**",
    //   babelHelpers: "bundled",
    // })
  ],
  external: ['bcrypt', 'sqlite3', 'mock-aws-s3', 'aws-sdk', 'nock']
};