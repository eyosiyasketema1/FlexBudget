// Build-time fix for react-native-get-sms-android@2.1.0.
//
// That library predates Android Gradle Plugin 8 (which RN 0.81 / Expo SDK 54
// use). AGP 8 requires every library module to declare a `namespace` in its
// build.gradle and forbids the legacy `package="..."` attribute in its
// AndroidManifest. The unpatched library has neither, so the native build fails
// at the Gradle compile step. This plugin patches both during `expo prebuild`
// (which EAS runs), so no manual node_modules editing is needed.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG = 'react-native-get-sms-android';
const NAMESPACE = 'com.react';

function patchGradle(projectRoot) {
  const file = path.join(projectRoot, 'node_modules', PKG, 'android', 'build.gradle');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('namespace')) return; // already patched
  src = src.replace(/android\s*\{/, `android {\n    namespace "${NAMESPACE}"`);
  fs.writeFileSync(file, src);
}

function patchManifest(projectRoot) {
  const file = path.join(projectRoot, 'node_modules', PKG, 'android', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  // Drop the now-forbidden package attribute (namespace replaces it).
  src = src.replace(/\s*package="[^"]*"/, '');
  fs.writeFileSync(file, src);
}

module.exports = function withGetSmsAndroidFix(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const root = cfg.modRequest.projectRoot;
      try {
        patchGradle(root);
        patchManifest(root);
      } catch (e) {
        // Don't hard-fail prebuild on a patch hiccup; log for the build output.
        console.warn('withGetSmsAndroidFix: ' + (e && e.message));
      }
      return cfg;
    },
  ]);
};
