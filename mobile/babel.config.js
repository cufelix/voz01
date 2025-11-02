module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@types': './src/types',
          '@navigation': './src/navigation',
        },
      },
    ],
    '@babel/plugin-transform-optional-catch-binding',
    '@babel/plugin-transform-nullish-coalescing-operator',
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-async-generator-functions',
    '@babel/plugin-transform-object-rest-spread',
    '@babel/plugin-transform-numeric-separator',
  ],
};