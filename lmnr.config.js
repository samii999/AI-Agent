export default {
  esbuild: {
    format: 'esm',
    target: 'node18',
    external: [
      'react-devtools-core',
      'ink',
      'ink-spinner',
      'react',
      'yoga-layout'
    ],
    bundle: true,
    platform: 'node'
  }
};
