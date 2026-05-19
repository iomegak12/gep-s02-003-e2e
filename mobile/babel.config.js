module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 splits the worklet babel transform into react-native-worklets.
    // This plugin must be listed LAST.
    plugins: ['react-native-worklets/plugin'],
  };
};
