const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Escape special regex characters in path
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = {
  projectRoot,
  watchFolders: [
    // Watch shared packages
    path.resolve(monorepoRoot, 'packages'),
    // Watch root node_modules for shared dependencies
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Block customer-app to prevent cross-app module resolution
    blockList: exclusionList([
      new RegExp(`^${escapeRegExp(path.resolve(monorepoRoot, 'apps/customer-app'))}/.*$`),
      // Block any .expo folders
      /.*\/.expo\/.*/,
    ]),
    // Fix Firebase modular imports in monorepo
    extraNodeModules: {
      '@react-native-firebase/app': path.resolve(monorepoRoot, 'node_modules/@react-native-firebase/app'),
      '@react-native-firebase/messaging': path.resolve(monorepoRoot, 'node_modules/@react-native-firebase/messaging'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
