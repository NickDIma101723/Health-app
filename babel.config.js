module.exports = function (api) {
  api.cache(true);

  const plugins = [];
  try {
    require.resolve('@tamagui/babel-plugin');
    plugins.push([
      '@tamagui/babel-plugin',
      {
        components: ['tamagui'],
        config: './src/tamagui.config.ts',
      },
    ]);
  } catch {
    // Skip Tamagui optimization when dependency is not installed.
  }

  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins,
  };
};