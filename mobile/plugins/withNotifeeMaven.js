/**
 * Expo config plugin: register the local @notifee/react-native libs folder
 * as a Maven repository in android/build.gradle.
 *
 * Notifee 9.x ships the `app.notifee:core` AAR bundled inside the npm package at
 *   node_modules/@notifee/react-native/android/libs/
 * Notifee's own build.gradle adds this to `rootProject.allprojects.repositories`
 * at evaluation time, but under Gradle 8.14 + AGP 8.7+ that registration lands
 * too late and Gradle can't resolve `app.notifee:core:+`. Injecting the repo at
 * the top-level allprojects block fixes the resolution order.
 *
 * The path is expressed relative to `$rootDir` so the generated gradle stays
 * machine-portable (works for every developer + CI without absolute paths).
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// withNotifeeMaven';
const REPO_LINE = `    maven { url uri("$rootDir/../node_modules/@notifee/react-native/android/libs") } ${MARKER}`;

module.exports = function withNotifeeMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg; // already patched

    // Insert as the first entry inside the allprojects.repositories { } block.
    src = src.replace(
      /allprojects\s*\{\s*\n\s*repositories\s*\{\s*\n/,
      (m) => `${m}${REPO_LINE}\n`,
    );

    if (!src.includes(MARKER)) {
      // Fallback if the regex didn't match — append a fresh allprojects block.
      src += `\nallprojects {\n  repositories {\n${REPO_LINE}\n  }\n}\n`;
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
