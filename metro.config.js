const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  transformer: {
    unstable_allowRequireContext: true, // Enable require.context
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
