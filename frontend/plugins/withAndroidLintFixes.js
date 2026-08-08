const { withAndroidStyles, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix Android Lint NewApi and ChromeOS issues:
 * 1. Adds tools:targetApi="33" to android:windowSplashScreenBehavior in styles.xml
 * 2. Adds <uses-feature android:name="android.hardware.camera" android:required="false"/> to AndroidManifest.xml
 */
function withAndroidSplashTargetApi(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    if (styles?.resources?.style) {
      const splashStyle = styles.resources.style.find(
        (s) => s.$ && s.$.name === 'Theme.App.SplashScreen'
      );
      if (splashStyle && Array.isArray(splashStyle.item)) {
        for (const item of splashStyle.item) {
          if (item.$ && item.$.name === 'android:windowSplashScreenBehavior') {
            item.$['tools:targetApi'] = '33';
          }
        }
      }
    }
    return config;
  });
}

function withCameraHardwareFeature(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (!androidManifest.manifest) {
      return config;
    }

    if (!androidManifest.manifest['uses-feature']) {
      androidManifest.manifest['uses-feature'] = [];
    }

    const hasCameraFeature = androidManifest.manifest['uses-feature'].some(
      (f) => f.$ && f.$['android:name'] === 'android.hardware.camera'
    );

    if (!hasCameraFeature) {
      androidManifest.manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.camera',
          'android:required': 'false',
        },
      });
    }

    return config;
  });
}

module.exports = function withAndroidLintFixes(config) {
  config = withAndroidSplashTargetApi(config);
  config = withCameraHardwareFeature(config);
  return config;
};
